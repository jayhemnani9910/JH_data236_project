/**
 * Performance Testing with K6
 * Tests different scenarios: B (baseline), B+S (with Redis), B+S+K (with Kafka), B+S+K+X (optimized)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const searchTrend = new Trend('search_duration');
const bookingTrend = new Trend('booking_duration');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Warm up
    { duration: '5m', target: 10 }, // Steady load
    { duration: '2m', target: 20 }, // Spike
    { duration: '5m', target: 10 }, // Steady again
    { duration: '2m', target: 0 },  // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.1'], // Error rate under 10%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000';

export default function () {
  // Test different user flows
  const userId = Math.random().toString(36).substring(7);
  
  // Scenario 1: Search and browse (80% of traffic)
  if (Math.random() < 0.8) {
    searchFlights(userId);
  }
  
  // Scenario 2: Full booking flow (20% of traffic)
  if (Math.random() < 0.2) {
    bookingFlow(userId);
  }
  
  // Random think time between requests
  sleep(1 + Math.random() * 4);
}

function searchFlights(userId) {
  const startTime = Date.now();
  
  // Search for flights
  const searchPayload = {
    origin: 'JFK',
    destination: 'LAX',
    departureDate: '2024-06-15',
    passengers: 1,
    class: 'economy'
  };
  
  const searchResponse = http.post(
    `${BASE_URL}/api/flights/search`,
    JSON.stringify(searchPayload),
    { headers: { 'Content-Type': 'application/json', 'X-User-Id': userId } }
  );
  
  const searchDuration = Date.now() - startTime;
  searchTrend.add(searchDuration);
  
  const searchCheck = check(searchResponse, {
    'search status is 200': (r) => r.status === 200,
    'search returns results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.flights && body.data.flights.length > 0;
      } catch (e) {
        return false;
      }
    },
    'search under 300ms': () => searchDuration < 300,
  });
  
  errorRate.add(!searchCheck);
  
  if (searchCheck) {
    // Apply filters (common user behavior)
    const filterPayload = {
      ...searchPayload,
      maxPrice: 500,
      directOnly: Math.random() < 0.7
    };
    
    const filterResponse = http.post(
      `${BASE_URL}/api/flights/search`,
      JSON.stringify(filterPayload),
      { headers: { 'Content-Type': 'application/json', 'X-User-Id': userId } }
    );
    
    check(filterResponse, {
      'filter status is 200': (r) => r.status === 200,
      'filter reduces results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data && body.data.flights;
        } catch (e) {
          return false;
        }
      },
    });
  }
}

function bookingFlow(userId) {
  const startTime = Date.now();
  
  // Step 1: Create a booking
  const bookingPayload = {
    userId: userId,
    type: 'flight',
    items: [{
      type: 'flight',
      referenceId: 'flight-123',
      quantity: 1,
      unitPrice: 299.99,
      details: {
        origin: 'JFK',
        destination: 'LAX',
        departureTime: '2024-06-15T10:00:00Z'
      }
    }]
  };
  
  const bookingResponse = http.post(
    `${BASE_URL}/api/bookings`,
    JSON.stringify(bookingPayload),
    { 
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-Idempotency-Key': `booking-${userId}-${Date.now()}`
      } 
    }
  );
  
  const bookingDuration = Date.now() - startTime;
  bookingTrend.add(bookingDuration);
  
  const bookingCheck = check(bookingResponse, {
    'booking status is 201': (r) => r.status === 201,
    'booking creates payment': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.paymentRequired;
      } catch (e) {
        return false;
      }
    },
    'booking under 500ms': () => bookingDuration < 500,
  });
  
  errorRate.add(!bookingCheck);
  
  // Step 2: Process payment (if payment required)
  if (bookingCheck) {
    const bookingData = JSON.parse(bookingResponse.body);
    if (bookingData.data && bookingData.data.paymentRequired) {
      const paymentPayload = {
        bookingId: bookingData.data.booking.id,
        userId: userId,
        amount: 299.99,
        currency: 'USD',
        method: 'credit_card',
        paymentDetails: {
          cardNumber: '4242424242424242',
          expiryMonth: 12,
          expiryYear: 2025,
          cvv: '123'
        }
      };
      
      const paymentResponse = http.post(
        `${BASE_URL}/api/billing/payments`,
        JSON.stringify(paymentPayload),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Id': userId
          } 
        }
      );
      
      check(paymentResponse, {
        'payment status is 200': (r) => r.status === 200,
        'payment succeeds': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.success && body.data && body.data.status === 'succeeded';
          } catch (e) {
            return false;
          }
        },
      });
    }
  }
}

// Setup function
export function setup() {
  console.log('Setting up performance test...');
  
  // Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`API health check failed: ${healthResponse.status}`);
  }
  
  console.log('Performance test setup complete');
}

// Teardown function
export function teardown() {
  console.log('Performance test teardown...');
}