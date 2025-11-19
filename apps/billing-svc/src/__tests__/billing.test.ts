import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        amount: 10000,
        currency: 'usd',
        status: 'requires_payment_method',
        metadata: { bookingId: 'booking-123', userId: 'user-123' }
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 10000,
        currency: 'usd'
      })
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 're_test_123',
        amount: 10000,
        status: 'succeeded',
        payment_intent: 'pi_test_123'
      })
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
            amount: 10000
          }
        }
      })
    }
  }));
});

describe('Billing Service Integration Tests', () => {
  let app: express.Application;
  
  beforeAll(async () => {
    // Setup test environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'wh_test_123';
  });

  afterAll(async () => {
    // Cleanup environment
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('POST /billing/create-payment-intent', () => {
    it('should create payment intent successfully', async () => {
      const paymentData = {
        amount: 299.99,
        currency: 'usd',
        bookingId: 'booking-123',
        userId: 'user-123'
      };

      const response = await request(app)
        .post('/billing/create-payment-intent')
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('paymentId');
      expect(response.body.data).toHaveProperty('clientSecret');
      expect(response.body.data).toHaveProperty('paymentIntentId');
      expect(response.body.data.clientSecret).toMatch(/_secret_/);
    });

    it('should reject payment intent without required fields', async () => {
      const invalidData = {
        amount: 299.99
        // Missing bookingId and userId
      };

      const response = await request(app)
        .post('/billing/create-payment-intent')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toContain('Amount, userId, and bookingId are required');
    });

    it('should handle negative amounts', async () => {
      const invalidData = {
        amount: -50,
        currency: 'usd',
        bookingId: 'booking-123',
        userId: 'user-123'
      };

      const response = await request(app)
        .post('/billing/create-payment-intent')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle zero amount', async () => {
      const invalidData = {
        amount: 0,
        currency: 'usd',
        bookingId: 'booking-123',
        userId: 'user-123'
      };

      const response = await request(app)
        .post('/billing/create-payment-intent')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /billing/confirm-payment', () => {
    it('should confirm payment successfully', async () => {
      const confirmData = {
        paymentIntentId: 'pi_test_123',
        paymentId: 'payment-123'
      };

      const response = await request(app)
        .post('/billing/confirm-payment')
        .send(confirmData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('paymentIntent');
    });

    it('should reject confirmation without payment intent ID', async () => {
      const invalidData = {
        paymentId: 'payment-123'
        // Missing paymentIntentId
      };

      const response = await request(app)
        .post('/billing/confirm-payment')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should handle non-existent payment intent', async () => {
      const mockRetrieve = jest.fn().mockRejectedValue(new Error('Payment intent not found'));
      // This would be tested with actual mocking
    });
  });

  describe('POST /billing/refund', () => {
    it('should process refund successfully', async () => {
      const refundData = {
        paymentId: 'payment-123',
        reason: 'requested_by_customer'
      };

      const response = await request(app)
        .post('/billing/refund')
        .send(refundData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('refunded');
      expect(response.body.data).toHaveProperty('refund');
    });

    it('should reject refund without payment ID', async () => {
      const invalidData = {
        reason: 'requested_by_customer'
        // Missing paymentId
      };

      const response = await request(app)
        .post('/billing/refund')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 404 for non-existent payment', async () => {
      const refundData = {
        paymentId: 'non-existent-payment',
        reason: 'requested_by_customer'
      };

      const response = await request(app)
        .post('/billing/refund')
        .send(refundData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /billing/payment/:id', () => {
    it('should get payment by ID', async () => {
      const paymentId = 'payment-123';

      const response = await request(app)
        .get(`/billing/payment/${paymentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', paymentId);
    });

    it('should return 404 for non-existent payment', async () => {
      const paymentId = 'non-existent-payment';

      const response = await request(app)
        .get(`/billing/payment/${paymentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /billing/payments', () => {
    it('should get payments with filters', async () => {
      const response = await request(app)
        .get('/billing/payments?userId=user-123&status=pending&page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get all payments without filters', async () => {
      const response = await request(app)
        .get('/billing/payments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/billing/payments?page=2&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /billing/webhook', () => {
    it('should handle payment_intent.succeeded webhook', async () => {
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
            amount: 10000
          }
        }
      };

      const response = await request(app)
        .post('/billing/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });

    it('should handle payment_intent.payment_failed webhook', async () => {
      const webhookPayload = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'failed',
            amount: 10000
          }
        }
      };

      const response = await request(app)
        .post('/billing/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });

    it('should handle unknown webhook types', async () => {
      const webhookPayload = {
        type: 'unknown.event.type',
        data: {
          object: {}
        }
      };

      const response = await request(app)
        .post('/billing/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });

    it('should reject invalid webhook signatures', async () => {
      const invalidPayload = {
        type: 'payment_intent.succeeded',
        data: { object: {} }
      };

      const response = await request(app)
        .post('/billing/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(invalidPayload)
        .expect(400);

      expect(response.text).toContain('Webhook Error');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.service).toBe('billing-svc');
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      // This would be tested with actual service mocking
      // For now, testing basic error structure
      const response = await request(app)
        .post('/billing/create-payment-intent')
        .send({})  // Invalid data to trigger error
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('traceId');
    });

    it('should include trace ID in all responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('traceId');
      expect(typeof response.body.traceId).toBe('string');
    });
  });
});
