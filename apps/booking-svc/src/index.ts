/**
 * Booking Service - Saga-based orchestrator for multi-service bookings
 */
import express, { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { Kafka } from 'kafkajs';
import { ApiResponse, generateTraceId } from '@kayak/shared';

// --- Interfaces ---
interface CreateBookingItem {
  type: 'flight' | 'hotel' | 'car';
  referenceId: string;
  quantity?: number;
  unitPrice?: number;
  // Optional trip dates supplied by caller for better classification
  startDate?: string;
  endDate?: string;
  extras?: Record<string, any>;
  details?: any;
}

interface CreateBookingRequest {
  userId: string;
  currency?: string;
  items: CreateBookingItem[];
}

// --- Placeholder clients for other services ---
// In a real scenario, these would be proper clients, possibly using gRPC or a typed REST client.
const parseServiceError = async (res: any, action: string) => {
  let message = `${action} failed: ${res.status}`;
  try {
    const body = await res.json();
    message = body?.error?.message ? `${action} failed: ${body.error.message}` : message;
  } catch {
    try {
      const text = await res.text();
      if (text) {
        message = `${action} failed: ${text}`;
      }
    } catch {
      /* ignore */
    }
  }
  throw new Error(message);
};

const createFlightServiceClient = (baseURL: string) => ({
  reserve: async (itemId: string, bookingId: string, seats: number) => {
    console.log(`Reserving flight ${itemId}`);
    const res = await fetch(`${baseURL}/flights/${itemId}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, seats }),
    });
    if (!res.ok) {
      await parseServiceError(res, 'Flight service reservation');
    }
    const body = await res.json();
    return body?.data;
  },
  confirm: async (reservationId: string) => {
    console.log(`Confirming flight reservation ${reservationId}`);
    const res = await fetch(`${baseURL}/flights/reservations/${reservationId}`, { method: 'PATCH' });
    if (!res.ok) {
      await parseServiceError(res, 'Flight service confirm');
    }
  },
  compensate: async (reservationId: string) => {
    console.log(`Compensating flight reservation ${reservationId}`);
    const res = await fetch(`${baseURL}/flights/reservations/${reservationId}`, { method: 'DELETE' });
    if (!res.ok) {
      await parseServiceError(res, 'Flight service compensation');
    }
  },
  fetch: async (itemId: string) => {
    const res = await fetch(`${baseURL}/flights/${itemId}`);
    if (!res.ok) {
      await parseServiceError(res, 'Flight lookup');
    }
    const body = await res.json();
    return body?.data;
  }
});

const createHotelServiceClient = (baseURL: string) => ({
  reserve: async (itemId: string, bookingId: string) => {
    console.log(`Reserving hotel room ${itemId}`);
    const res = await fetch(`${baseURL}/hotels/rooms/${itemId}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    });
    if (!res.ok) {
      await parseServiceError(res, 'Hotel service reservation');
    }
    const body = await res.json();
    return body?.data;
  },
  confirm: async (reservationId: string) => {
    console.log(`Confirming hotel reservation ${reservationId}`);
    const res = await fetch(`${baseURL}/hotels/reservations/${reservationId}`, { method: 'PATCH' });
    if (!res.ok) {
      await parseServiceError(res, 'Hotel service confirm');
    }
  },
  compensate: async (reservationId: string) => {
    console.log(`Compensating hotel reservation ${reservationId}`);
    const res = await fetch(`${baseURL}/hotels/reservations/${reservationId}`, { method: 'DELETE' });
    if (!res.ok) {
      await parseServiceError(res, 'Hotel service compensation');
    }
  },
  fetch: async (itemId: string) => {
    const res = await fetch(`${baseURL}/hotels/${itemId}`);
    if (!res.ok) {
      await parseServiceError(res, 'Hotel lookup');
    }
    const body = await res.json();
    return body?.data;
  }
});

const createBillingServiceClient = (baseURL: string) => ({
  createPayment: async (bookingId: string, userId: string, amount: number, currency: string) => {
    console.log(`Creating payment for booking ${bookingId} (user ${userId}) via billing-svc`);
    const res = await fetch(`${baseURL}/billing/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency: currency.toLowerCase() || 'usd',
        bookingId,
        userId,
      }),
    });

    if (!res.ok) {
      let errorMessage = `Billing service returned ${res.status}`;
      try {
        const body = await res.json() as any;
        errorMessage = body.error?.message || errorMessage;
      } catch {
        // ignore parse errors
      }
      throw new Error(`Billing service createPayment failed: ${errorMessage}`);
    }

    const body = await res.json() as any;
    const paymentId = body?.data?.paymentId as string | undefined;
    if (!paymentId) {
      throw new Error('Billing service response missing paymentId');
    }
    return {
      paymentId,
      clientSecret: body?.data?.clientSecret,
      paymentIntentId: body?.data?.paymentIntentId,
    };
  },
});

const createCarServiceClient = (baseURL: string) => ({
  reserve: async (itemId: string, bookingId: string) => {
    console.log(`Reserving car ${itemId}`);
    const res = await fetch(`${baseURL}/cars/${itemId}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    });
    if (!res.ok) {
      await parseServiceError(res, 'Car service reservation');
    }
    const body = await res.json();
    return body?.data;
  },
  confirm: async (reservationId: string) => {
    console.log(`Confirming car reservation ${reservationId}`);
    const res = await fetch(`${baseURL}/cars/reservations/${reservationId}`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      await parseServiceError(res, 'Car service confirm');
    }
  },
  compensate: async (reservationId: string) => {
    console.log(`Compensating car reservation ${reservationId}`);
    const res = await fetch(`${baseURL}/cars/reservations/${reservationId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await parseServiceError(res, 'Car service compensation');
    }
  },
  fetch: async (itemId: string) => {
    const res = await fetch(`${baseURL}/cars/${itemId}`);
    if (!res.ok) {
      await parseServiceError(res, 'Car lookup');
    }
    const body = await res.json();
    return body?.data;
  }
});

class BookingService {
  private app: express.Application;
  private db!: mysql.Pool;
  private kafka!: Kafka;
  private kafkaProducer: any;
  private kafkaConsumer: any;
  private port = 8011;

  // Service clients
  private flightService = createFlightServiceClient(process.env.FLIGHTS_SVC_URL || 'http://localhost:8002');
  private hotelService = createHotelServiceClient(process.env.HOTELS_SVC_URL || 'http://localhost:8003');
  private carService = createCarServiceClient(process.env.CARS_SVC_URL || 'http://localhost:8004');
  private billingService = createBillingServiceClient(process.env.BILLING_SVC_URL || 'http://localhost:8005');

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.initializeDatabase();
    this.initializeKafka();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      const traceId = (req.headers['x-trace-id'] as string) || generateTraceId();
      (req as any).traceId = traceId;
      res.setHeader('X-Trace-Id', traceId);
      next();
    });
  }

  private async initializeDatabase() {
    this.db = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'kayak',
      password: process.env.DB_PASSWORD || 'change_me_db_password',
      database: process.env.DB_NAME || 'kayak',
      connectionLimit: 50,
      waitForConnections: true,
    });
    console.log('✅ MySQL pool connected');
  }

  private async initializeKafka() {
    this.kafka = new Kafka({
      clientId: 'booking-svc',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    });
    // Producer
    this.kafkaProducer = this.kafka.producer();
    await this.kafkaProducer.connect();
    console.log('✅ Kafka producer connected');
    // Consumer
    this.kafkaConsumer = this.kafka.consumer({ groupId: 'booking-svc-group' });
    await this.kafkaConsumer.connect();
    console.log('✅ Kafka consumer connected');
    await this.startKafkaConsumer();
  }

  private async startKafkaConsumer() {
    await this.kafkaConsumer.subscribe({ topic: 'payment.events', fromBeginning: true });
    await this.kafkaConsumer.run({
      eachMessage: async ({ topic, partition, message }: any) => {
        try {
          const event = JSON.parse(message.value.toString());
          const legacyType = event.type;
          const canonicalType = event.event_type;
          const effectiveType = canonicalType || legacyType;

          console.log(`[KAFKA] Received event: ${effectiveType}`);
          if (effectiveType === 'payment_succeeded' || effectiveType === 'payment.succeeded') {
            await this.handlePaymentSucceeded(event);
          } else if (effectiveType === 'payment_failed' || effectiveType === 'payment.failed') {
            await this.handlePaymentFailed(event);
          }
        } catch (error) {
          console.error('[KAFKA] Error processing message:', error);
        }
      },
    });
  }

  private async handlePaymentSucceeded(event: { bookingId: string }) {
    const { bookingId } = event;
    console.log(`[SAGA] Payment succeeded for booking ${bookingId}. Confirming reservations.`);

    // Fetch all booking items to confirm underlying reservations
    const [items] = await this.db.execute('SELECT * FROM booking_items WHERE booking_id = ?', [bookingId]);

    let failures = 0;
    for (const item of (items as any[])) {
      try {
        const details = JSON.parse(item.details);
        const reservationId = details?.reservationId;
        if (!reservationId) {
          throw new Error('Missing reservationId in booking item details');
        }

        if (item.type === 'flight') {
          await this.flightService.confirm(reservationId);
        } else if (item.type === 'hotel') {
          await this.hotelService.confirm(reservationId);
        } else if (item.type === 'car') {
          await this.carService.confirm(reservationId);
        } else {
          throw new Error(`Unknown booking item type: ${item.type}`);
        }

        console.log(`[SAGA] Confirmed ${item.type} reservation ${reservationId} for booking ${bookingId}`);
      } catch (err: any) {
        failures += 1;
        console.error(`[SAGA] Failed to confirm item ${item.id} (type: ${item.type}): ${err.message}`);
      }
    }

    if (failures > 0) {
      console.error(`[SAGA] Booking ${bookingId} confirmation completed with ${failures} failures.`);
      // If some confirmations failed, mark the booking as failed so downstream systems
      // do not treat it as confirmed.
      await this.db.execute('UPDATE bookings SET status = ? WHERE id = ?', ['failed', bookingId]);
    } else {
      const confirmationNumber = `KAYAK-${bookingId.slice(0, 8).toUpperCase()}`;
      await this.db.execute('UPDATE bookings SET status = ?, confirmation_number = ? WHERE id = ?', [
        'confirmed',
        confirmationNumber,
        bookingId,
      ]);
      console.log(`[SAGA] Booking ${bookingId} fully confirmed.`);

      // Emit booking-confirmation event for notification service
      try {
        const [bookingRows] = await this.db.execute('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        const booking = (bookingRows as any[])[0];

        await this.kafkaProducer.send({
          topic: 'booking-confirmation',
          messages: [{
            value: JSON.stringify({
              event_type: 'booking_confirmed',
              booking_id: bookingId,
              user_id: booking.user_id,
              confirmation_number: confirmationNumber,
              total_amount: parseFloat(booking.total_amount),
              currency: booking.currency,
              items: (items as any[]).map((item: any) => ({
                type: item.type,
                reference_id: item.reference_id,
                quantity: item.quantity,
                price: parseFloat(item.total_price)
              })),
              timestamp: new Date().toISOString()
            })
          }]
        });
        console.log(`[KAFKA] Emitted booking-confirmation event for ${bookingId}`);
      } catch (kafkaError) {
        console.error(`[KAFKA] Failed to emit booking-confirmation: ${kafkaError}`);
        // Don't fail the booking if Kafka fails
      }
    }
  }

  private async handlePaymentFailed(event: { bookingId: string }) {
    const { bookingId } = event;
    console.log(`[SAGA] Payment failed for booking ${bookingId}. Starting compensation.`);

    const [items] = await this.db.execute('SELECT * FROM booking_items WHERE booking_id = ?', [bookingId]);

    for (const item of (items as any[])) {
      try {
        const details = JSON.parse(item.details);
        if (item.type === 'flight') {
          await this.flightService.compensate(details.reservationId);
        } else if (item.type === 'hotel') {
          await this.hotelService.compensate(details.reservationId);
        } else if (item.type === 'car') {
          await this.carService.compensate(details.reservationId);
        }
      } catch (compError: any) {
        console.error(`[SAGA] CRITICAL: Compensation failed for item ${item.id}: ${compError.message}`);
      }
    }
    await this.db.execute('UPDATE bookings SET status = ? WHERE id = ?', ['failed', bookingId]);
  }

  private setupRoutes() {
    this.app.get('/health', (req, res) => res.json({ success: true, data: { status: 'healthy', service: 'booking-svc' } }));
    this.app.post('/bookings', this.createBookingSaga.bind(this));
    this.app.get('/bookings/:id', this.getBooking.bind(this));
    this.app.get('/bookings/user/:userId', this.getUserBookings.bind(this));
    this.app.put('/bookings/:id/cancel', this.cancelBooking.bind(this));
  }

  /**
   * createBookingSaga - Orchestrates the booking process using a Saga pattern.
   */
  private async createBookingSaga(req: Request, res: Response) {
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
    const traceId = (req as any).traceId;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const [existing] = await this.db.execute('SELECT response FROM idempotency_keys WHERE `key` = ?', [idempotencyKey]);
      if ((existing as any[]).length > 0) {
        console.log(`[SAGA] Idempotency hit for key ${idempotencyKey}`);
        return res.status(200).json(JSON.parse((existing as any)[0].response));
      }
    }

    const payload: CreateBookingRequest = req.body;
    if (!payload?.userId || !Array.isArray(payload.items) || payload.items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'userId and items are required' } });
    }

    const itemTypes = Array.from(new Set(payload.items.map(i => i.type)));
    let bookingType: 'flight' | 'hotel' | 'car' | 'package' = 'package';
    if (payload && (payload as any).type && ['flight', 'hotel', 'car', 'package'].includes((payload as any).type)) {
      bookingType = (payload as any).type;
    } else if (itemTypes.length === 1 && ['flight', 'hotel', 'car'].includes(itemTypes[0])) {
      bookingType = itemTypes[0] as any;
    }

    const bookingId = uuidv4();
    const compensations: (() => Promise<void>)[] = [];
    const preparedItems: any[] = [];
    let totalAmount = 0;
    let bookingCurrency: string | null = null;
    let tripStartDate: string | null = null;
    let tripEndDate: string | null = null;

    for (const item of payload.items) {
      const canonical = await this.fetchCanonicalPricing(item);
      const itemCurrency = (canonical.currency || payload.currency || 'USD').toUpperCase();
      if (!bookingCurrency) {
        bookingCurrency = itemCurrency;
      } else if (bookingCurrency !== itemCurrency) {
        throw new Error('Mixed-currency bookings are not supported');
      }

      const sanitizedExtras = this.normalizeExtras(item.type, item.extras ?? item.details?.extras ?? {});
      const extrasCharge = this.calculateExtrasCharge(item.type, sanitizedExtras);
      const multiplier = this.getItemMultiplier(item);
      if (multiplier <= 0) {
        throw new Error('Invalid passenger count or trip duration');
      }

      let reservation: any;
      if (item.type === 'flight') {
        reservation = await this.flightService.reserve(item.referenceId, bookingId, multiplier);
        compensations.push(() => this.flightService.compensate(reservation.reservationId));
      } else if (item.type === 'hotel') {
        reservation = await this.hotelService.reserve(item.referenceId, bookingId);
        compensations.push(() => this.hotelService.compensate(reservation.reservationId));
      } else if (item.type === 'car') {
        reservation = await this.carService.reserve(item.referenceId, bookingId);
        compensations.push(() => this.carService.compensate(reservation.reservationId));
      }

      if (!reservation || !reservation.reservationId) {
        throw new Error(`Failed to reserve ${item.type} ${item.referenceId}`);
      }

      const unitPrice = Number(canonical.unitPrice) + extrasCharge;
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw new Error('Calculated unit price invalid');
      }

      const totalPrice = unitPrice * multiplier;
      if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
        throw new Error('Calculated booking item total invalid');
      }
      totalAmount += totalPrice;

      const itemStartDate = item.startDate || null;
      const itemEndDate = item.endDate || item.startDate || null;
      if (itemStartDate) {
        if (!tripStartDate || itemStartDate < tripStartDate) {
          tripStartDate = itemStartDate;
        }
      }
      if (itemEndDate) {
        if (!tripEndDate || itemEndDate > tripEndDate) {
          tripEndDate = itemEndDate;
        }
      }

      preparedItems.push({
        id: uuidv4(),
        type: item.type,
        referenceId: item.referenceId,
        quantity: multiplier,
        unitPrice,
        totalPrice,
        startDate: itemStartDate,
        endDate: itemEndDate,
        reservationId: reservation.reservationId,
        extras: sanitizedExtras,
        extrasCharge,
        baseUnitPrice: Number(canonical.unitPrice),
        metadata: canonical.metadata || {}
      });
      console.log(`[SAGA] Reserved ${item.type} ${item.referenceId} for booking ${bookingId}`);
    }

    if (totalAmount <= 0) {
      throw new Error('Calculated booking total invalid');
    }

    bookingCurrency = (bookingCurrency || payload.currency || 'USD').toUpperCase();

    const conn = await this.db.getConnection();
    let transactionStarted = false;
    try {
      await conn.beginTransaction();
      transactionStarted = true;
      await conn.execute(
        `INSERT INTO bookings (id, user_id, type, status, total_amount, currency, confirmation_number, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, NOW(), NOW())`,
        [bookingId, payload.userId, bookingType, totalAmount, bookingCurrency, `TEMP-${bookingId.slice(0, 8)}`]
      );

      for (const prepared of preparedItems) {
        await conn.execute(
          `INSERT INTO booking_items (id, booking_id, type, reference_id, quantity, unit_price, total_price, start_date, end_date, details, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            prepared.id,
            bookingId,
            prepared.type,
            prepared.referenceId,
            prepared.quantity,
            prepared.unitPrice,
            prepared.totalPrice,
            prepared.startDate,
            prepared.endDate,
            JSON.stringify({
              reservationId: prepared.reservationId,
              extras: prepared.extras,
              extrasCharge: prepared.extrasCharge,
              baseUnitPrice: prepared.baseUnitPrice,
              metadata: prepared.metadata,
              multiplier: prepared.quantity
            })
          ]
        );
      }

      if (tripStartDate || tripEndDate) {
        await conn.execute(
          'UPDATE bookings SET trip_start_date = ?, trip_end_date = ? WHERE id = ?',
          [tripStartDate, tripEndDate, bookingId]
        );
      }

      console.log(`[SAGA] All reservations successful for booking ${bookingId}. Triggering payment.`);
      await conn.execute('UPDATE bookings SET status = ? WHERE id = ?', ['awaiting_payment', bookingId]);

      const payment = await this.billingService.createPayment(
        bookingId,
        payload.userId,
        totalAmount,
        bookingCurrency.toLowerCase()
      );
      await conn.execute('UPDATE bookings SET payment_id = ? WHERE id = ?', [payment.paymentId, bookingId]);

      // 6. Commit transaction and prepare response
      await conn.commit();

      // Fetch the created booking with confirmation number
      const [bookingRows] = await this.db.execute('SELECT * FROM bookings WHERE id = ?', [bookingId]);
      const booking = (bookingRows as any[])[0];

      // Fetch all booking items
      const [itemRows] = await this.db.execute('SELECT * FROM booking_items WHERE booking_id = ?', [bookingId]);
      const items = itemRows as any[];

      const response = {
        success: true,
        data: {
          id: bookingId,
          userId: payload.userId,
          type: booking.type,
          status: booking.status,
          totalAmount: parseFloat(booking.total_amount),
          currency: booking.currency,
          confirmationNumber: booking.confirmation_number,
          paymentId: payment.paymentId,
          clientSecret: payment.clientSecret,
          items: items.map((item: any) => ({
            id: item.id,
            type: item.type,
            referenceId: item.reference_id,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unit_price),
            totalPrice: parseFloat(item.total_price)
          })),
          createdAt: booking.created_at
        },
        traceId
      };

      // 7. Save Idempotency Key
      if (idempotencyKey) {
        try {
          await this.db.execute('INSERT INTO idempotency_keys (`key`, response) VALUES (?, ?)', [idempotencyKey, JSON.stringify(response)]);
          console.log(`[IDEM] Stored idempotency key: ${idempotencyKey}`);
        } catch (idemError) {
          console.error(`[IDEM] Failed to store idempotency key: ${idemError}`);
        }
      }

      res.status(201).json(response);

    } catch (error: any) {
      console.error(`[SAGA] Error in booking ${bookingId}: ${error.message}. Rolling back.`);

      if (transactionStarted) {
        try {
          await conn.rollback();
        } catch (rollbackError) {
          console.error('[SAGA] Failed to rollback transaction:', rollbackError);
        }
      }

      // Compensation Logic - undo external reservations
      for (const compensate of compensations.reverse()) {
        try {
          await compensate();
        } catch (compError: any) {
          console.error(`[SAGA] CRITICAL: Compensation failed: ${compError.message}`);
          // Here you would add to a dead-letter queue or alert
        }
      }

      if (transactionStarted) {
        try {
          await this.db.execute('UPDATE bookings SET status = ? WHERE id = ?', ['failed', bookingId]);
        } catch (updateError) {
          console.error(`[SAGA] Could not update booking status to failed: ${updateError}`);
        }
      }

      res.status(500).json({ success: false, error: { code: 'BOOKING_FAILED', message: error.message }, traceId });
    } finally {
      conn.release();
    }
  }

  private async getBooking(req: Request, res: Response) {
    const { id } = req.params;
    const [rows] = await this.db.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    const booking = (rows as any[])[0];
    if (!booking) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } });
    const [items] = await this.db.execute('SELECT * FROM booking_items WHERE booking_id = ?', [id]);
    return res.json({ success: true, data: { ...booking, items }, traceId: (req as any).traceId } as ApiResponse);
  }

  private async getUserBookings(req: Request, res: Response) {
    const { userId } = req.params;
    const [rows] = await this.db.execute(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [userId]
    );

    const bookings = (rows as any[]).map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      status: row.status,
      totalAmount: parseFloat(row.total_amount),
      currency: row.currency,
      confirmationNumber: row.confirmation_number,
      createdAt: row.created_at,
      tripStartDate: row.trip_start_date || null,
      tripEndDate: row.trip_end_date || null,
    }));

    return res.json({
      success: true,
      data: bookings,
      traceId: (req as any).traceId
    } as ApiResponse);
  }

  private async cancelBooking(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const [bookingRows] = await this.db.execute('SELECT id, status FROM bookings WHERE id = ?', [id]);
      const booking = (bookingRows as any[])[0];
      if (!booking) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      }

      if (booking.status === 'cancelled') {
        return res.status(409).json({ success: false, error: { code: 'ALREADY_CANCELLED', message: 'Booking already cancelled' } });
      }

      const cancellableStates = new Set(['pending', 'awaiting_payment', 'confirmed']);
      if (!cancellableStates.has(booking.status)) {
        return res.status(409).json({ success: false, error: { code: 'INVALID_STATE', message: `Cannot cancel booking in ${booking.status} state` } });
      }

      const [itemRows] = await this.db.execute('SELECT id, type, details FROM booking_items WHERE booking_id = ?', [id]);
      for (const item of (itemRows as any[])) {
        try {
          const details = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
          const reservationId = details?.reservationId;
          if (!reservationId) {
            continue;
          }
          if (item.type === 'flight') {
            await this.flightService.compensate(reservationId);
          } else if (item.type === 'hotel') {
            await this.hotelService.compensate(reservationId);
          } else if (item.type === 'car') {
            await this.carService.compensate(reservationId);
          }
        } catch (compError: any) {
          console.error(`[SAGA] Compensation failure while cancelling booking ${id}:`, compError.message);
        }
      }

      await this.db.execute('UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?', ['cancelled', id]);
      return res.json({ success: true, data: { id, status: 'cancelled' }, traceId: (req as any).traceId });
    } catch (error: any) {
      console.error('Cancel booking error:', error);
      return res.status(500).json({ success: false, error: { code: 'CANCEL_FAILED', message: error.message }, traceId: (req as any).traceId });
    }
  }

  private async fetchCanonicalPricing(item: CreateBookingItem): Promise<{ unitPrice: number; currency: string; metadata?: any }> {
    if (item.type === 'flight') {
      const flight = await this.flightService.fetch(item.referenceId);
      if (!flight || flight.price === undefined) {
        throw new Error('Flight pricing unavailable');
      }
      return {
        unitPrice: Number(flight.price),
        currency: flight.currency || 'USD',
        metadata: {
          airline: flight.airline,
          flightNumber: flight.flightNumber,
          origin: flight.origin,
          destination: flight.destination
        }
      };
    }

    if (item.type === 'hotel') {
      const room = await this.hotelService.fetch(item.referenceId);
      const nightly = room?.pricePerNight ?? room?.base_price ?? room?.price_per_night;
      if (nightly === undefined) {
        throw new Error('Hotel pricing unavailable');
      }
      return {
        unitPrice: Number(nightly),
        currency: room?.currency || 'USD',
        metadata: {
          hotelName: room?.hotelName || room?.name,
          roomType: room?.type
        }
      };
    }

    const car = await this.carService.fetch(item.referenceId);
    if (!car || car.dailyRate === undefined) {
      throw new Error('Car pricing unavailable');
    }
    return {
      unitPrice: Number(car.dailyRate),
      currency: car.currency || 'USD',
      metadata: {
        vendor: car.vendor,
        vehicleType: car.vehicleType
      }
    };
  }

  private normalizeExtras(type: CreateBookingItem['type'], extras: Record<string, any>): Record<string, any> {
    if (!extras || typeof extras !== 'object') {
      return {};
    }

    const normalized: Record<string, any> = {};
    if (type === 'flight') {
      const allowedSeats = ['standard', 'extra-legroom', 'premium'];
      const seatSelection = typeof extras.seatSelection === 'string' && allowedSeats.includes(extras.seatSelection)
        ? extras.seatSelection
        : 'standard';
      normalized.seatSelection = seatSelection;
      normalized.checkedBag = Boolean(extras.checkedBag);
      normalized.carryOnBag = Boolean(extras.carryOnBag);
      normalized.priorityBoarding = Boolean(extras.priorityBoarding);
    } else if (type === 'hotel') {
      normalized.roomUpgrade = Boolean(extras.roomUpgrade);
      normalized.breakfast = Boolean(extras.breakfast);
      normalized.lateCheckout = Boolean(extras.lateCheckout);
      if (extras.specialRequests && typeof extras.specialRequests === 'string') {
        normalized.specialRequests = extras.specialRequests.slice(0, 500);
      }
    } else if (type === 'car') {
      normalized.insurance = Boolean(extras.insurance);
      normalized.gps = Boolean(extras.gps);
      normalized.childSeat = Boolean(extras.childSeat);
      normalized.additionalDriver = Boolean(extras.additionalDriver);
    }
    return normalized;
  }

  private calculateExtrasCharge(type: CreateBookingItem['type'], extras: Record<string, any> | undefined): number {
    if (!extras) {
      return 0;
    }
    let total = 0;
    if (type === 'flight') {
      const seatPricing: Record<string, number> = {
        'standard': 0,
        'extra-legroom': 35,
        'premium': 75,
      };
      total += seatPricing[extras.seatSelection] ?? 0;
      if (extras.checkedBag) total += 30;
      if (extras.carryOnBag) total += 15;
      if (extras.priorityBoarding) total += 20;
    } else if (type === 'hotel') {
      if (extras.roomUpgrade) total += 50;
      if (extras.breakfast) total += 25;
      if (extras.lateCheckout) total += 30;
    } else if (type === 'car') {
      if (extras.insurance) total += 25;
      if (extras.gps) total += 15;
      if (extras.childSeat) total += 10;
      if (extras.additionalDriver) total += 12;
    }
    return total;
  }

  private getItemMultiplier(item: CreateBookingItem): number {
    if (item.type === 'flight') {
      return Math.max(1, item.quantity || 1);
    }
    return this.calculateDurationDays(item);
  }

  private calculateDurationDays(item: CreateBookingItem): number {
    if (item.startDate && item.endDate) {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (Number.isFinite(diff) && diff > 0) {
        return diff;
      }
    }
    return 1;
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Booking Service listening on port ${this.port}`);
    });
  }
}

const svc = new BookingService();
svc.start();
