/**
 * Billing Service - Complete implementation with Stripe integration
 */

import express, { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { Kafka } from 'kafkajs';
import { createClient } from 'redis';
import {
  ApiResponse,
  generateTraceId
} from '@kayak/shared';

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

interface Payment {
  id: string;
  userId: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  paymentMethod: string;
  stripePaymentIntentId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Maps Stripe PaymentIntent status to our database ENUM values
 * Stripe statuses: requires_payment_method, requires_confirmation, requires_action,
 *                  processing, requires_capture, canceled, succeeded
 * Our ENUM: pending, succeeded, failed, refunded, processing, requires_payment_method
 */
function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'requires_payment_method': 'requires_payment_method',
    'requires_confirmation': 'pending',
    'requires_action': 'pending',
    'processing': 'processing',
    'requires_capture': 'processing',
    'canceled': 'failed',
    'succeeded': 'succeeded'
  };

  return statusMap[stripeStatus] || 'pending';
}

class BillingService {
  private app: express.Application;
  private db!: mysql.Connection;
  private stripe!: Stripe;
  private kafka!: Kafka;
  private kafkaProducer: any;
  private redis: any;
  private port: number = 8005;

  constructor() {
    this.app = express();
    this.setupTracing();
    this.registerWebhookRoute(); // Register BEFORE global middleware for raw body parsing
    this.setupMiddleware();
    this.setupRoutes();
  }

  public async init() {
    await this.initializeStripe();
    await this.initializeDatabase();
    await this.initializeKafka();
    await this.initializeRedis();
  }

  private async initializeKafka() {
    this.kafka = new Kafka({
      clientId: 'billing-svc',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    });
    this.kafkaProducer = this.kafka.producer();
    await this.kafkaProducer.connect();
    console.log('✅ Kafka producer connected');
  }

  private async initializeRedis() {
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await this.redis.connect();
    console.log('✅ Redis connected');
  }

  private setupTracing() {
    this.app.use((req, res, next) => {
      const traceId = req.headers['x-trace-id'] as string || generateTraceId();
      (req as any).traceId = traceId;
      res.setHeader('X-Trace-Id', traceId);
      next();
    });
  }

  private setupMiddleware() {
    // Skip JSON parsing for webhook route - it's handled separately with raw()
    this.app.use((req, res, next) => {
      if (req.path === '/billing/webhook') {
        return next();
      }
      express.json()(req, res, next);
    });
    this.app.use(express.urlencoded({ extended: true }));
  }

  private registerWebhookRoute() {
    this.app.post(
      '/billing/webhook',
      express.raw({ type: 'application/json' }),
      (req, res, next) => {
        this.handleWebhook(req, res).catch(next);
      }
    );
  }

  private async initializeStripe() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16'
    });
    console.log('✅ Stripe initialized');
  }

  private async initializeDatabase() {
    try {
      this.db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'kayak',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'kayak'
      });
      console.log('✅ MySQL connected');
    } catch (error) {
      console.error('❌ MySQL connection failed:', error);
      throw error;
    }
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          service: 'billing-svc',
          timestamp: new Date().toISOString()
        }
      });
    });

    // Payment routes (JSON middleware applies here)
    this.app.post('/billing/create-payment-intent', this.createPaymentIntent.bind(this));
    this.app.post('/billing/confirm-payment', this.confirmPayment.bind(this));
    this.app.post('/billing/refund', this.refundPayment.bind(this));
    this.app.get('/billing/payment/:id', this.getPayment.bind(this));
    this.app.get('/billing/payments', this.getPayments.bind(this));
  }

  private async createPaymentIntent(req: Request, res: Response) {
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
    const traceId = (req as any).traceId;

    if (idempotencyKey && this.redis && (this.redis as any).isReady) {
      try {
        const cachedResponse = await this.redis.get(`idem:${idempotencyKey}`);
        if (cachedResponse) {
          console.log(`[IDEM] Returning cached response for key: ${idempotencyKey}`);
          return res.status(201).json(JSON.parse(cachedResponse));
        }
      } catch (e) {
        console.error(`[IDEM] Redis error checking key ${idempotencyKey}:`, e);
      }
    }

    try {
      const { amount, currency = 'usd', bookingId, userId } = req.body;

      if (!amount || !userId || !bookingId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Amount, userId, and bookingId are required'
          }
        });
      }

      // Create payment intent with Stripe
      let paymentIntent;
      const stripeKey = process.env.STRIPE_SECRET_KEY || '';
      const isMockStripe = stripeKey.startsWith('sk_test_dummy');

      if (isMockStripe) {
        console.log('[billing] Using mock Stripe payment intent');
        paymentIntent = {
          id: `pi_mock_${uuidv4()}`,
          amount: Math.round(amount * 100),
          currency,
          client_secret: `pi_mock_secret_${uuidv4()}`,
          status: 'succeeded', // Auto-succeed for mock
          metadata: { bookingId, userId }
        } as any;
      } else {
        paymentIntent = await this.stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          metadata: {
            bookingId,
            userId
          }
        });
      }

      // Store payment record
      const paymentId = uuidv4();
      await this.savePayment({
        id: paymentId,
        userId,
        bookingId,
        amount,
        currency,
        status: 'pending',
        paymentMethod: 'card',
        stripePaymentIntentId: paymentIntent.id,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });

      const responseBody = {
        success: true,
        data: {
          paymentId,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount,
          currency
        },
        traceId
      };

      if (idempotencyKey && this.redis && (this.redis as any).isReady) {
        try {
          // Cache the successful response for 24 hours
          await this.redis.setEx(`idem:${idempotencyKey}`, 86400, JSON.stringify(responseBody));
          console.log(`[IDEM] Caching response for key: ${idempotencyKey}`);
        } catch (e) {
          console.error(`[IDEM] Redis error caching key ${idempotencyKey}:`, e);
        }
      }

      if (isMockStripe) {
        await this.updatePaymentStatus(paymentId, 'succeeded');
        await this.emitPaymentSuccess(paymentId);
      }

      res.status(201).json(responseBody);
    } catch (error: any) {
      console.error('Create payment intent error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          traceId
        }
      });
    }
  }

  private async confirmPayment(req: Request, res: Response) {
    try {
      const { paymentIntentId, paymentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Payment intent ID is required'
          }
        });
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      // Update payment status in database
      if (paymentId) {
        await this.updatePaymentStatus(paymentId, paymentIntent.status);
      }

      res.json({
        success: true,
        data: {
          status: paymentIntent.status,
          paymentIntent
        },
        traceId: (req as any).traceId
      });
    } catch (error: any) {
      console.error('Confirm payment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          traceId: (req as any).traceId
        }
      });
    }
  }

  private async refundPayment(req: Request, res: Response) {
    try {
      const { paymentId, reason } = req.body;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Payment ID is required'
          }
        });
      }

      // Get payment details
      const payment = await this.getPaymentById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Payment not found'
          }
        });
      }

      // Create refund with Stripe
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        reason: reason as any
      });

      // Update payment status
      await this.updatePaymentStatus(paymentId, 'refunded');

      res.json({
        success: true,
        data: {
          refund,
          status: 'refunded'
        },
        traceId: (req as any).traceId
      });
    } catch (error: any) {
      console.error('Refund payment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          traceId: (req as any).traceId
        }
      });
    }
  }

  private async getPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payment = await this.getPaymentById(id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Payment not found'
          }
        });
      }

      res.json({
        success: true,
        data: payment,
        traceId: (req as any).traceId
      });
    } catch (error: any) {
      console.error('Get payment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          traceId: (req as any).traceId
        }
      });
    }
  }

  private async getPayments(req: Request, res: Response) {
    try {
      const { userId, bookingId, status, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (userId) {
        whereClause += ' AND user_id = ?';
        params.push(userId);
      }

      if (bookingId) {
        whereClause += ' AND booking_id = ?';
        params.push(bookingId);
      }

      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }

      const sql = `
        SELECT * FROM payments
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(Number(limit), offset);

      const [rows] = await this.db.execute(sql, params);

      res.json({
        success: true,
        data: rows,
        traceId: (req as any).traceId
      });
    } catch (error: any) {
      console.error('Get payments error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          traceId: (req as any).traceId
        }
      });
    }
  }

  private async handleWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (webhookSecret) {
        event = this.stripe.webhooks.constructEvent(
          req.body,
          sig,
          webhookSecret
        );
      } else {
        event = req.body as any;
      }
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentSucceeded(paymentIntent);
        break;
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentFailed(failedPayment);
        break;
      case 'charge.refunded':
        const charge = event.data.object as Stripe.Charge;
        await this.handleChargeRefunded(charge);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    try {
      if (charge.payment_intent) {
        const paymentIntentId = charge.payment_intent as string;
        const [rows] = await this.db.execute(
          'SELECT id FROM payments WHERE stripe_payment_intent_id = ?',
          [paymentIntentId]
        );
        const payments = rows as any[];

        if (payments.length > 0) {
          await this.updatePaymentStatus(payments[0].id, 'refunded');
          console.log(`Payment ${payments[0].id} marked as refunded due to charge.refunded event`);
        }
      }
    } catch (error) {
      console.error('Error handling charge refunded:', error);
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    try {
      const [rows] = await this.db.execute(
        'SELECT p.*, b.user_id FROM payments p JOIN bookings b ON p.booking_id = b.id WHERE p.stripe_payment_intent_id = ?',
        [paymentIntent.id]
      );
      const payments = rows as any[];

      if (payments.length > 0) {
        const payment = payments[0];
        await this.updatePaymentStatus(payment.id, 'succeeded');
        console.log(`Payment ${payment.id} marked as succeeded`);
        await this.emitPaymentSuccess(payment.id);
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
    }
  }

  private async emitPaymentSuccess(paymentId: string) {
    try {
      const [rows] = await this.db.execute(
        'SELECT p.*, b.user_id FROM payments p JOIN bookings b ON p.booking_id = b.id WHERE p.id = ?',
        [paymentId]
      );
      const payments = rows as any[];
      if (payments.length === 0) {
        return;
      }
      const payment = payments[0];

      await this.kafkaProducer.send({
        topic: 'payment.events',
        messages: [{
          key: payment.booking_id,
          value: JSON.stringify({
            event_type: 'payment_succeeded',
            payment_id: payment.id,
            booking_id: payment.booking_id,
            user_id: payment.user_id,
            amount: parseFloat(payment.amount),
            currency: payment.currency,
            stripe_payment_intent_id: payment.stripe_payment_intent_id,
            timestamp: new Date().toISOString(),
            type: 'payment.succeeded'
          })
        }]
      });
      console.log(`[KAFKA] Produced payment.succeeded event for booking ${payment.booking_id}`);

      await this.kafkaProducer.send({
        topic: 'payment-confirmation',
        messages: [{
          value: JSON.stringify({
            event_type: 'payment_confirmed',
            payment_id: payment.id,
            booking_id: payment.booking_id,
            user_id: payment.user_id,
            amount: parseFloat(payment.amount),
            currency: payment.currency,
            payment_method: payment.payment_method,
            timestamp: new Date().toISOString()
          })
        }]
      });
      console.log(`[KAFKA] Produced payment-confirmation event for payment ${payment.id}`);
    } catch (err) {
      console.error('Error emitting payment success events:', err);
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    try {
      const [rows] = await this.db.execute(
        'SELECT id, booking_id FROM payments WHERE stripe_payment_intent_id = ?',
        [paymentIntent.id]
      );
      const payments = rows as any[];

      if (payments.length > 0) {
        const payment = payments[0];
        await this.updatePaymentStatus(payment.id, 'failed');
        console.log(`Payment ${payment.id} marked as failed`);

        // Produce Kafka event
        await this.kafkaProducer.send({
          topic: 'payment.events',
          messages: [{
            key: payment.booking_id,
            value: JSON.stringify({
              event_type: 'payment_failed',
              payment_id: payment.id,
              booking_id: payment.booking_id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              stripe_payment_intent_id: paymentIntent.id,
              timestamp: new Date().toISOString(),
              type: 'payment.failed',
            }),
          }],
        });
        console.log(`[KAFKA] Produced payment.failed event for booking ${payment.booking_id}`);
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

  // Helper methods
  private async savePayment(payment: Payment) {
    await this.db.execute(
      `INSERT INTO payments (id, user_id, booking_id, amount, currency, status, 
                             payment_method, stripe_payment_intent_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.id,
        payment.userId,
        payment.bookingId,
        payment.amount,
        payment.currency,
        payment.status,
        payment.paymentMethod,
        payment.stripePaymentIntentId,
        payment.createdAt,
        payment.updatedAt
      ]
    );
  }

  private async getPaymentById(id: string): Promise<Payment | null> {
    const [rows] = await this.db.execute(
      'SELECT * FROM payments WHERE id = ?',
      [id]
    );
    return (rows as any[])[0] || null;
  }

  private async updatePaymentStatus(paymentId: string, status: string) {
    const mappedStatus = mapStripeStatus(status);
    await this.db.execute(
      'UPDATE payments SET status = ?, updated_at = ? WHERE id = ?',
      [mappedStatus, new Date().toISOString().slice(0, 19).replace('T', ' '), paymentId]
    );
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Billing Service listening on port ${this.port}`);
      console.log(`📍 Health check: http://localhost:${this.port}/health`);
      console.log(`💳 Stripe integration: ${this.stripe ? '✅ Active' : '❌ Inactive'}`);
    });
  }
}

// Start the service
const billingService = new BillingService();
(async () => {
  try {
    await billingService.init();
    billingService.start();
  } catch (error) {
    console.error('❌ Billing Service failed to start', error);
    process.exit(1);
  }
})();
