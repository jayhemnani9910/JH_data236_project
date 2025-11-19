/**
 * K6 Performance Test for Deal Discovery and Booking Flow
 * Tests AI-driven deal recommendations and real-time deal updates
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics for deals performance
let dealDiscoveryRate = new Rate('deal_discovery_rate');
let aiRecommendationAccuracy = new Rate('ai_recommendation_accuracy');
let websocketDealsReceived = new Counter('websocket_deals_received');
let conciergeResponseTime = new Trend('concierge_response_time');

// Performance test configuration focused on deals
export let options = {
  stages: [
    { duration: '1m', target: 20 },    // Ramp up to 20 concurrent users
    { duration: '3m', target: 20 },    // Stable load for deals discovery
    { duration: '2m', target: 50 },    // Spike for hot deals
    { duration: '3m', target: 50 },    // Sustained high load
    { duration: '1m', target: 0 },     // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1500'],
    'deal_discovery_rate': ['rate>0.90'],
    'ai_recommendation_accuracy': ['rate>0.85'],
    'concierge_response_time': ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const CONCIERGE_URL = __ENV.CONCIERGE_URL || 'http://localhost:8007';

const destinations = [
  'New York', 'Los Angeles', 'Chicago', 'Miami', 'Seattle',
  'San Francisco', 'Boston', 'Denver', 'Phoenix', 'Atlanta'
];

const dealTypes = ['price_drop', 'flash_sale', 'bundle_offer', 'last_minute'];

// Helper functions
function generateRandomDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead + Math.floor(Math.random() * 30));
  return date.toISOString().split('T')[0];
}

function getRandomDestination() {
  return destinations[Math.floor(Math.random() * destinations.length)];
}

function generateUserContext() {
  return {
    userId: `user_${Math.floor(Math.random() * 1000)}`,
    budget: 500 + Math.floor(Math.random() * 2000),
    preferences: {
      starRating: [3, 4, 5].slice(0, 1 + Math.floor(Math.random() * 3)),
      carType: ['economy', 'compact', 'mid-size'][Math.floor(Math.random() * 3)],
      flightClass: ['economy', 'premium_economy'][Math.floor(Math.random() * 2)]
    }
  };
}

// API functions
function getDeals(destination) {
  const url = `${CONCIERGE_URL}/concierge/deals?destination=${encodeURIComponent(destination)}`;
  const response = http.get(url);
  
  const success = check(response, {
    'deals retrieved': (r) => r.status === 200,
    'deals have content': (r) => {
      const data = JSON.parse(r.body || '{}');
      return data.data && data.data.deals && data.data.deals.length > 0;
    }
  });
  
  if (success) {
    dealDiscoveryRate.add(true);
  } else {
    dealDiscoveryRate.add(false);
  }
  
  return JSON.parse(response.body || '{}');
}

function createBundleRequest(userContext, destination) {
  const url = `${CONCIERGE_URL}/concierge/bundles`;
  const payload = JSON.stringify({
    destination: destination,
    checkIn: generateRandomDate(7),
    checkOut: generateRandomDate(14),
    passengers: 1,
    budget: userContext.budget,
    preferences: userContext.preferences
  });
  
  const response = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  const duration = response.timings.duration;
  conciergeResponseTime.add(duration);
  
  const success = check(response, {
    'bundle created': (r) => r.status === 200,
    'bundle has recommendations': (r) => {
      const data = JSON.parse(r.body || '{}');
      return data.data && data.data.bundles && data.data.bundles.length >= 3;
    },
    'bundle within budget': (r) => {
      const data = JSON.parse(r.body || '{}');
      if (data.data && data.data.bundles) {
        return data.data.bundles.every(bundle => bundle.totalPrice <= userContext.budget);
      }
      return false;
    }
  });
  
  aiRecommendationAccuracy.add(success);
  
  return JSON.parse(response.body || '{}');
}

function createWatchRequest(userId, destination, maxPrice) {
  const url = `${CONCIERGE_URL}/concierge/watch`;
  const payload = JSON.stringify({
    userId: userId,
    destination: destination,
    checkIn: generateRandomDate(7),
    checkOut: generateRandomDate(14),
    maxPrice: maxPrice,
    alertEmail: `test${Math.floor(Math.random() * 1000)}@example.com`
  });
  
  const response = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(response, {
    'watch request created': (r) => r.status === 200,
    'watch has watchId': (r) => JSON.parse(r.body || '{}').data.watchId !== undefined
  });
  
  return JSON.parse(response.body || '{}');
}

// Deal discovery scenarios
export function dealsDiscovery() {
  group('Deal Discovery Flow', function() {
    const userContext = generateUserContext();
    const destination = getRandomDestination();
    
    // Step 1: Discover current deals
    const deals = getDeals(destination);
    sleep(1);
    
    // Step 2: Get AI-recommended bundles
    const bundles = createBundleRequest(userContext, destination);
    sleep(2);
    
    // Step 3: Set up deal watch
    if (bundles.data && bundles.data.bundles && bundles.data.bundles.length > 0) {
      const cheapestBundle = bundles.data.bundles.reduce((min, bundle) => 
        bundle.totalPrice < min.totalPrice ? bundle : min
      );
      
      createWatchRequest(userContext.userId, destination, cheapestBundle.totalPrice * 0.9);
    }
    
    sleep(1);
  });
}

// Flash sale scenario
export function flashSaleScenario() {
  group('Flash Sale Booking', function() {
    const userContext = generateUserContext();
    const destination = getRandomDestination();
    
    // Rapid discovery and booking of flash deals
    const deals = getDeals(destination);
    
    if (deals.data && deals.data.deals) {
      const flashDeals = deals.data.deals.filter(deal => 
        deal.tags && deal.tags.includes('flash_sale')
      );
      
      if (flashDeals.length > 0) {
        const selectedDeal = getRandomElement(flashDeals);
        
        // Quick bundle creation with flash deal
        const bundles = createBundleRequest(userContext, destination);
        
        check(bundles, {
          'flash deal included': (r) => {
            if (r.data && r.data.bundles) {
              return r.data.bundles.some(bundle => 
                bundle.deals && bundle.deals.some(deal => deal.dealId === selectedDeal.deal_id)
              );
            }
            return false;
          }
        });
      }
    }
    
    sleep(0.5); // Faster iteration for flash sales
  });
}

// AI recommendation validation
export function aiRecommendationTest() {
  group('AI Recommendation Quality', function() {
    const userContext = generateUserContext();
    const destination = getRandomDestination();
    
    const bundles = createBundleRequest(userContext, destination);
    
    check(bundles, {
      'recommendations generated': (r) => r.data && r.data.bundles && r.data.bundles.length >= 3,
      'quality recommendations': (r) => {
        if (r.data && r.data.bundles) {
          const bundles = r.data.bundles;
          
          // Check if bundles are diverse and relevant
          const prices = bundles.map(b => b.totalPrice);
          const destinations = bundles.map(b => b.destination);
          
          const priceVariance = Math.max(...prices) - Math.min(...prices);
          const uniqueDestinations = new Set(destinations).size;
          
          return priceVariance > 200 && uniqueDestinations >= 2;
        }
        return false;
      },
      'within budget constraint': (r) => {
        if (r.data && r.data.bundles) {
          return r.data.bundles.every(bundle => bundle.totalPrice <= userContext.budget);
        }
        return false;
      }
    });
    
    sleep(2);
  });
}

// Main test function - weighted distribution
export default function() {
  const testType = Math.random();
  
  if (testType < 0.6) {
    dealsDiscovery();      // 60% deal discovery flow
  } else if (testType < 0.85) {
    flashSaleScenario();   // 25% flash sale testing
  } else {
    aiRecommendationTest(); // 15% AI quality validation
  }
}

export function teardown(data) {
  console.log(`\n🎯 Deals Performance Test Summary:`);
  console.log(`📈 Deal Discovery Rate: ${Math.round(dealDiscoveryRate.value * 100)}%`);
  console.log(`🤖 AI Recommendation Accuracy: ${Math.round(aiRecommendationAccuracy.value * 100)}%`);
  console.log(`⚡ Average Concierge Response: ${Math.round(conciergeResponseTime.avg)}ms`);
  console.log(`🔔 WebSocket Deals Received: ${websocketDealsReceived.value}`);
}