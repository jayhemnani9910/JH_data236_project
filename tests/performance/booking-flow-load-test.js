/**
 * K6 Load Test Script for Kayak-like Travel Booking Platform
 * Tests 4 scenarios: B, B+S, B+S+K, B+S+K+X
 * 
 * B = Basic booking (flight only)
 * S = Hotel addition (B+S) 
 * K = Car rental addition (B+S+K)
 * X = Experience/extras addition (B+S+K+X)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
let bookingSuccessRate = new Rate('booking_success_rate');
let searchResponseTime = new Trend('search_response_time');
let bookingResponseTime = new Trend('booking_response_time');
let apiErrors = new Counter('api_errors');

// Load test configuration
export let options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s
    'booking_success_rate': ['rate>0.95'], // 95% success rate
    'search_response_time': ['p(95)<1500'],
    'booking_response_time': ['p(95)<5000'],
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const destinations = [
  { origin: 'NYC', destination: 'LAX' },
  { origin: 'SFO', destination: 'ORD' },
  { origin: 'MIA', destination: 'SEA' },
  { origin: 'BOS', destination: 'DEN' },
  { origin: 'ATL', destination: 'PHX' }
];

const users = [
  { userId: 'user1', email: 'test1@example.com' },
  { userId: 'user2', email: 'test2@example.com' },
  { userId: 'user3', email: 'test3@example.com' },
  { userId: 'user4', email: 'test4@example.com' },
  { userId: 'user5', email: 'test5@example.com' }
];

// Helper functions
function generateRandomDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateUser() {
  const user = getRandomElement(users);
  const randomNum = Math.floor(Math.random() * 1000);
  return {
    ...user,
    email: `test${randomNum}@example.com`,
    phone: `555${String(randomNum).padStart(7, '0')}`
  };
}

// API functions
function searchFlights(params) {
  const url = `${BASE_URL}/flights/search`;
  const payload = JSON.stringify(params);
  const params = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  };
  
  const response = http.post(url, payload, params);
  searchResponseTime.add(response.timings.duration);
  
  check(response, {
    'flight search successful': (r) => r.status === 200,
    'flight search has results': (r) => JSON.parse(r.body).data.flights.length > 0,
  }) || apiErrors.add(1);
  
  return JSON.parse(response.body || '{}');
}

function searchHotels(params) {
  const url = `${BASE_URL}/hotels/search`;
  const payload = JSON.stringify(params);
  
  const response = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' }
  });
  searchResponseTime.add(response.timings.duration);
  
  check(response, {
    'hotel search successful': (r) => r.status === 200,
    'hotel search has results': (r) => JSON.parse(r.body).data.hotels.length > 0,
  }) || apiErrors.add(1);
  
  return JSON.parse(response.body || '{}');
}

function searchCars(params) {
  const url = `${BASE_URL}/cars/search`;
  const payload = JSON.stringify(params);
  
  const response = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' }
  });
  searchResponseTime.add(response.timings.duration);
  
  check(response, {
    'car search successful': (r) => r.status === 200,
    'car search has results': (r) => JSON.parse(r.body).data.cars.length > 0,
  }) || apiErrors.add(1);
  
  return JSON.parse(response.body || '{}');
}

function createBooking(bookingData) {
  const url = `${BASE_URL}/bookings`;
  const payload = JSON.stringify(bookingData);
  
  const response = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' }
  });
  bookingResponseTime.add(response.timings.duration);
  
  const success = check(response, {
    'booking created': (r) => r.status === 201,
    'booking has id': (r) => JSON.parse(r.body).data.bookingId !== undefined,
  });
  
  bookingSuccessRate.add(success);
  !success && apiErrors.add(1);
  
  return JSON.parse(response.body || '{}');
}

// Scenarios
export function scenarioB() {
  // Basic booking: Flight only
  group('Scenario B - Flight Only Booking', function() {
    const user = generateUser();
    const route = getRandomElement(destinations);
    const departureDate = generateRandomDate(7 + Math.floor(Math.random() * 30));
    const returnDate = generateRandomDate(14 + Math.floor(Math.random() * 30));

    // Search flights
    const searchResult = searchFlights({
      origin: route.origin,
      destination: route.destination,
      departureDate: departureDate,
      returnDate: returnDate,
      passengers: 1,
      class: 'economy'
    });

    if (searchResult.data && searchResult.data.flights && searchResult.data.flights.length > 0) {
      const flight = searchResult.data.flights[0];
      
      // Create booking
      const bookingResult = createBooking({
        userId: user.userId,
        email: user.email,
        phone: user.phone,
        items: [{
          type: 'flight',
          id: flight.id,
          quantity: 1,
          price: flight.price
        }]
      });
      
      sleep(1);
    }
  });
}

export function scenarioBS() {
  // Flight + Hotel booking
  group('Scenario B+S - Flight + Hotel Booking', function() {
    const user = generateUser();
    const route = getRandomElement(destinations);
    const departureDate = generateRandomDate(7 + Math.floor(Math.random() * 30));
    const returnDate = generateRandomDate(14 + Math.floor(Math.random() * 30));

    // Search flights
    const flightResult = searchFlights({
      origin: route.origin,
      destination: route.destination,
      departureDate: departureDate,
      returnDate: returnDate,
      passengers: 1,
      class: 'economy'
    });

    // Search hotels
    const hotelResult = searchHotels({
      destination: route.destination,
      checkIn: departureDate,
      checkOut: returnDate,
      guests: 1,
      rooms: 1
    });

    if (flightResult.data?.flights?.length > 0 && hotelResult.data?.hotels?.length > 0) {
      const flight = flightResult.data.flights[0];
      const hotel = hotelResult.data.hotels[0];
      
      // Create booking
      const bookingResult = createBooking({
        userId: user.userId,
        email: user.email,
        phone: user.phone,
        items: [
          {
            type: 'flight',
            id: flight.id,
            quantity: 1,
            price: flight.price
          },
          {
            type: 'hotel',
            id: hotel.id,
            quantity: 1,
            price: hotel.pricePerNight
          }
        ]
      });
      
      sleep(2);
    }
  });
}

export function scenarioBSK() {
  // Flight + Hotel + Car booking
  group('Scenario B+S+K - Flight + Hotel + Car Booking', function() {
    const user = generateUser();
    const route = getRandomElement(destinations);
    const departureDate = generateRandomDate(7 + Math.floor(Math.random() * 30));
    const returnDate = generateRandomDate(14 + Math.floor(Math.random() * 30));

    // Search flights
    const flightResult = searchFlights({
      origin: route.origin,
      destination: route.destination,
      departureDate: departureDate,
      returnDate: returnDate,
      passengers: 1,
      class: 'economy'
    });

    // Search hotels
    const hotelResult = searchHotels({
      destination: route.destination,
      checkIn: departureDate,
      checkOut: returnDate,
      guests: 1,
      rooms: 1
    });

    // Search cars
    const carResult = searchCars({
      pickupLocation: route.destination,
      pickupDate: departureDate,
      returnDate: returnDate,
      carType: ['economy', 'compact']
    });

    if (flightResult.data?.flights?.length > 0 && 
        hotelResult.data?.hotels?.length > 0 && 
        carResult.data?.cars?.length > 0) {
      const flight = flightResult.data.flights[0];
      const hotel = hotelResult.data.hotels[0];
      const car = carResult.data.cars[0];
      
      // Create booking
      const bookingResult = createBooking({
        userId: user.userId,
        email: user.email,
        phone: user.phone,
        items: [
          {
            type: 'flight',
            id: flight.id,
            quantity: 1,
            price: flight.price
          },
          {
            type: 'hotel',
            id: hotel.id,
            quantity: 1,
            price: hotel.pricePerNight
          },
          {
            type: 'car',
            id: car.id,
            quantity: 1,
            price: car.dailyRate
          }
        ]
      });
      
      sleep(3);
    }
  });
}

export function scenarioBSKX() {
  // Complete booking: Flight + Hotel + Car + Extras
  group('Scenario B+S+K+X - Complete Booking', function() {
    const user = generateUser();
    const route = getRandomElement(destinations);
    const departureDate = generateRandomDate(7 + Math.floor(Math.random() * 30));
    const returnDate = generateRandomDate(14 + Math.floor(Math.random() * 30));

    // Search all services
    const flightResult = searchFlights({
      origin: route.origin,
      destination: route.destination,
      departureDate: departureDate,
      returnDate: returnDate,
      passengers: 1,
      class: 'economy'
    });

    const hotelResult = searchHotels({
      destination: route.destination,
      checkIn: departureDate,
      checkOut: returnDate,
      guests: 1,
      rooms: 1
    });

    const carResult = searchCars({
      pickupLocation: route.destination,
      pickupDate: departureDate,
      returnDate: returnDate,
      carType: ['economy', 'compact']
    });

    if (flightResult.data?.flights?.length > 0 && 
        hotelResult.data?.hotels?.length > 0 && 
        carResult.data?.cars?.length > 0) {
      const flight = flightResult.data.flights[0];
      const hotel = hotelResult.data.hotels[0];
      const car = carResult.data.cars[0];
      
      // Create complete booking
      const bookingResult = createBooking({
        userId: user.userId,
        email: user.email,
        phone: user.phone,
        items: [
          {
            type: 'flight',
            id: flight.id,
            quantity: 1,
            price: flight.price
          },
          {
            type: 'hotel',
            id: hotel.id,
            quantity: 1,
            price: hotel.pricePerNight
          },
          {
            type: 'car',
            id: car.id,
            quantity: 1,
            price: car.dailyRate
          },
          {
            type: 'extras',
            id: 'travel-insurance',
            quantity: 1,
            price: 59.99
          }
        ]
      });
      
      sleep(4);
    }
  });
}

// Main test function - runs all scenarios based on VU distribution
export default function() {
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    scenarioB();      // 40% basic bookings
  } else if (scenario < 0.7) {
    scenarioBS();     // 30% flight + hotel
  } else if (scenario < 0.9) {
    scenarioBSK();    // 20% flight + hotel + car
  } else {
    scenarioBSKX();   // 10% complete booking
  }
}

export function teardown(data) {
  console.log(`\n📊 Load Test Summary:`);
  console.log(`📈 Booking Success Rate: ${bookingSuccessRate.value * 100}%`);
  console.log(`🔍 Avg Search Response Time: ${searchResponseTime.avg}ms`);
  console.log(`📦 Avg Booking Response Time: ${bookingResponseTime.avg}ms`);
  console.log(`❌ Total API Errors: ${apiErrors.value}`);
}