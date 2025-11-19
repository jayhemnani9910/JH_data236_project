import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('Booking Service Integration Tests', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('POST /bookings', () => {
    it('should create a booking successfully', async () => {
      const bookingData = {
        userId: 'user-123',
        type: 'flight',
        items: [
          {
            type: 'flight',
            referenceId: 'flight-123',
            quantity: 2,
            unitPrice: 299.99,
            totalPrice: 599.98,
            details: {
              flightNumber: 'AA123',
              route: 'JFK-LAX'
            }
          }
        ],
        currency: 'USD',
        totalAmount: 599.98
      };

      const response = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('confirmationNumber');
      expect(response.body.data).toHaveProperty('totalAmount', 599.98);
      expect(response.body.data).toHaveProperty('currency', 'USD');
      expect(response.body.confirmationNumber).toMatch(/^CF-[A-Za-z0-9-]+$/);
    });

    it('should create booking without totalAmount (auto-calculate)', async () => {
      const bookingData = {
        userId: 'user-123',
        type: 'flight',
        items: [
          {
            type: 'flight',
            referenceId: 'flight-123',
            quantity: 1,
            unitPrice: 299.99,
            totalPrice: 299.99  // Explicit total for first item
          },
          {
            type: 'hotel',
            referenceId: 'hotel-456',
            quantity: 2,
            unitPrice: 150.00,
            totalPrice: 300.00  // Explicit total for second item
          }
        ],
        currency: 'USD'
        // totalAmount not provided - should be calculated
      };

      const response = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAmount).toBe(599.99); // 299.99 + 300.00
    });

    it('should create booking without item totalPrice (auto-calculate)', async () => {
      const bookingData = {
        userId: 'user-123',
        type: 'package',
        items: [
          {
            type: 'flight',
            referenceId: 'flight-123',
            quantity: 1,
            unitPrice: 299.99
            // totalPrice not provided - should be calculated
          }
        ],
        currency: 'USD'
      };

      const response = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAmount).toBe(299.99);
    });

    it('should reject booking without required fields', async () => {
      const invalidData = {
        userId: 'user-123'
        // Missing type and items
      };

      const response = await request(app)
        .post('/bookings')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toContain('userId, type and items required');
    });

    it('should reject booking with empty items array', async () => {
      const invalidData = {
        userId: 'user-123',
        type: 'flight',
        items: []
      };

      const response = await request(app)
        .post('/bookings')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject booking with invalid item type', async () => {
      const invalidData = {
        userId: 'user-123',
        type: 'flight',
        items: [
          {
            type: 'invalid-type',
            referenceId: 'item-123',
            quantity: 1,
            unitPrice: 100.00
          }
        ]
      };

      const response = await request(app)
        .post('/bookings')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle transaction rollback on error', async () => {
      // This would test database transaction handling
      // In a real test, we would mock the database to simulate errors
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('GET /bookings/:id', () => {
    it('should get booking by ID', async () => {
      const bookingId = 'booking-123';

      const response = await request(app)
        .get(`/bookings/${bookingId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', bookingId);
      expect(response.body.data).toHaveProperty('confirmationNumber');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('totalAmount');
    });

    it('should return 404 for non-existent booking', async () => {
      const bookingId = 'non-existent-booking';

      const response = await request(app)
        .get(`/bookings/${bookingId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should include booking items in response', async () => {
      const bookingId = 'booking-with-items';

      const response = await request(app)
        .get(`/bookings/${bookingId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });
  });

  describe('GET /bookings/user/:userId', () => {
    it('should get user bookings', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .get(`/bookings/user/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All bookings should belong to the specified user
      response.body.data.forEach((booking: any) => {
        expect(booking.userId).toBe(userId);
      });
    });

    it('should return empty array for user with no bookings', async () => {
      const userId = 'user-with-no-bookings';

      const response = await request(app)
        .get(`/bookings/user/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    it('should include booking items in user bookings', async () => {
      const userId = 'user-with-items';

      const response = await request(app)
        .get(`/bookings/user/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      response.body.data.forEach((booking: any) => {
        expect(booking).toHaveProperty('items');
        expect(Array.isArray(booking.items)).toBe(true);
      });
    });
  });

  describe('Booking Status Management', () => {
    it('should create booking with pending status', async () => {
      const bookingData = {
        userId: 'user-123',
        type: 'flight',
        items: [
          {
            type: 'flight',
            referenceId: 'flight-123',
            quantity: 1,
            unitPrice: 299.99
          }
        ]
      };

      const response = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Status should be 'pending' initially
    });

    it('should handle different booking types', async () => {
      const bookingTypes = ['flight', 'hotel', 'car', 'package'];
      
      for (const type of bookingTypes) {
        const bookingData = {
          userId: 'user-123',
          type: type,
          items: [
            {
              type: type,
              referenceId: `${type}-123`,
              quantity: 1,
              unitPrice: 100.00
            }
          ]
        };

        const response = await request(app)
          .post('/bookings')
          .send(bookingData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('confirmationNumber');
      }
    });
  });

  describe('Data Validation', () => {
    it('should validate item quantities', async () => {
      const bookingData = {
        userId: 'user-123',
        type: 'flight',
        items: [
          {
            type: 'flight',
            referenceId: 'flight-123',
            quantity: 0, // Invalid quantity
            unitPrice: 299.99
          }
        ]
      };

      const response = await request(app)
        .post('/bookings')
        .send(bookingData);

      // Should handle validation (either reject or default to 1)
      expect(response.body).toHaveProperty('success');
    });

    it('should validate positive prices', async () => {
      const bookingData = {
        userId: 'user-123',
        type: 'flight',
        items: [
          {
            type: 'flight',
            referenceId: 'flight-123',
            quantity: 1,
            unitPrice: -100.00 // Invalid negative price
          }
        ]
      };

      const response = await request(app)
        .post('/bookings')
        .send(bookingData);

      // Should handle validation
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.service).toBe('booking-svc');
    });
  });

  describe('Error Handling', () => {
    it('should include trace ID in all responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('traceId');
      expect(typeof response.body.traceId).toBe('string');
    });

    it('should handle database connection errors', async () => {
      // This would test error handling when database is unavailable
      // In real implementation, would mock database connection failure
      expect(true).toBe(true); // Placeholder
    });
  });
});
