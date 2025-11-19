/**
 * K6 Performance Test for Admin Analytics Endpoints
 * Tests the performance and scalability of admin dashboard analytics
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Analytics-specific metrics
let analyticsQueryTime = new Trend('analytics_query_time');
let dashboardLoadTime = new Trend('dashboard_load_time');
let realTimeUpdateRate = new Rate('real_time_update_rate');
let analyticsErrors = new Counter('analytics_errors');

export let options = {
  stages: [
    { duration: '2m', target: 30 },    // Admin dashboard queries
    { duration: '5m', target: 30 },    // Steady state
    { duration: '3m', target: 60 },    // Peak load for reports
    { duration: '3m', target: 60 },    // Sustained peak
    { duration: '1m', target: 0 },     // Cool down
  ],
  thresholds: {
    'analytics_query_time': ['p(95)<3000'],     // 95% under 3s for complex queries
    'dashboard_load_time': ['p(95)<5000'],      // 95% under 5s for full dashboard
    'real_time_update_rate': ['rate>0.95'],     // 95% real-time updates successful
    'http_req_duration': ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const ADMIN_API = `${BASE_URL}/admin`;

// Admin analytics test scenarios
const reportTypes = [
  'revenue',
  'bookings',
  'users',
  'deals',
  'performance',
  'conversion'
];

const timeRanges = [
  'last_24h',
  'last_7d',
  'last_30d',
  'last_90d',
  'this_year'
];

const destinations = [
  'All',
  'New York',
  'Los Angeles',
  'Chicago',
  'Miami',
  'San Francisco'
];

// Helper functions
function getRandomReportType() {
  return reportTypes[Math.floor(Math.random() * reportTypes.length)];
}

function getRandomTimeRange() {
  return timeRanges[Math.floor(Math.random() * timeRanges.length)];
}

function getRandomDestination() {
  return destinations[Math.floor(Math.random() * destinations.length)];
}

// API functions for analytics endpoints
function getRevenueAnalytics(timeRange, destination) {
  const url = `${ADMIN_API}/analytics/revenue`;
  const params = {
    timeRange: timeRange,
    destination: destination,
    includeForecasts: true
  };
  
  const response = http.get(`${url}?${Object.entries(params).map(([k,v]) => `${k}=${v}`).join('&')}`);
  const duration = response.timings.duration;
  analyticsQueryTime.add(duration);
  
  const success = check(response, {
    'revenue analytics loaded': (r) => r.status === 200,
    'analytics has data': (r) => {
      const data = JSON.parse(r.body || '{}');
      return data.data && data.data.totalRevenue !== undefined;
    },
    'analytics has forecasts': (r) => {
      const data = JSON.parse(r.body || '{}');
      return data.data && data.data.forecasts && data.data.forecasts.length > 0;
    }
  });
  
  !success && analyticsErrors.add(1);
  return JSON.parse(response.body || '{}');
}

function getBookingTrends(timeRange) {
  const url = `${ADMIN_API}/analytics/bookings`;
  const params = {
    timeRange: timeRange,
    groupBy: 'day',
    includeConversionRate: true
  };
  
  const response = http.get(`${url}?${Object.entries(params).map(([k,v]) => `${k}=${v}`).join('&')}`);
  analyticsQueryTime.add(response.timings.duration);
  
  const success = check(response, {
    'booking trends loaded': (r) => r.status === 200,
    'trends has daily data': (r) => {
      const data = JSON.parse(r.body || '{}');
      return data.data && data.data.dailyData && data.data.dailyData.length > 0;
    }
  });
  
  !success && analyticsErrors.add(1);
  return JSON.parse(response.body || '{}');
}

function getUserAnalytics(timeRange) {
  const url = `${ADMIN_API}/analytics/users`;
  const params = {
    timeRange: timeRange,
    includeDemographics: true,
    includeRetention: true
  };
  
  const response = http.get(`${url}?${Object.entries(params).map(([k,v]) => `${k}=${v}`).join('&')}`);
  analyticsQueryTime.add(response.timings.duration);
  
  const success = check(response, {
    'user analytics loaded': (r) => r.status === 200,
    'user data complete': (r) => {
      const data = JSON.parse(r.body || '{}');
      return data.data && 
             data.data.totalUsers !== undefined && 
             data.data.newUsers !== undefined &&
             data.data.demographics !== undefined;
    }
  });
  
  !success && analyticsErrors.add(1);
  return JSON.parse(response.body || '{}');
}

function getDealPerformance(timeRange) {
  const url = `${ADMIN_API}/analytics/deals`;
  const params = {
    timeRange: timeRange,
    includeAIEffectiveness: true,
    includeConversionImpact: true
  };
  
  const response = http.get(`${url}?${Object.entries(params).map(([k,v]) => `${k}=${v}`).join('&')}`);
  analyticsQueryTime.add(response.timings.duration);
  
  const success = check(response, {
    'deal analytics loaded': (r) => r.status === 200,
    'AI metrics included': (r) => {
      const data = JSON.parse(r.body || '{}');
      return data.data && data.data.aiEffectiveness && data.data.aiEffectiveness.score !== undefined;
    }
  });
  
  !success && analyticsErrors.add(1);
  return JSON.parse(response.body || '{}');
}

function getPerformanceMetrics() {
  const url = `${ADMIN_API}/analytics/performance`;
  const params = {
    includeServiceMetrics: true,
    includeErrorRates: true
  };
  
  const response = http.get(`${url}?${Object.entries(params).map(([k,v]) => `${k}=${v}`).join('&')}`);
  analyticsQueryTime.add(response.timings.duration);
  
  const success = check(response, {
    'performance metrics loaded': (r) => r.status === 200,
    'service metrics complete': (r) => {
      const data = JSON.parse(r.body || '{}');
      return data.data && 
             data.data.serviceHealth && 
             data.data.responseTimes &&
             data.data.errorRates;
    }
  });
  
  !success && analyticsErrors.add(1);
  return JSON.parse(response.body || '{}');
}

function getRealTimeUpdates() {
  const url = `${ADMIN_API}/analytics/realtime`;
  
  const response = http.get(url);
  const duration = response.timings.duration;
  
  const success = check(response, {
    'real-time updates loaded': (r) => r.status === 200,
    'real-time data fresh': (r) => {
      const data = JSON.parse(r.body || '{}');
      const lastUpdate = new Date(data.data?.lastUpdate || 0);
      return Date.now() - lastUpdate.getTime() < 60000; // Within 1 minute
    }
  });
  
  realTimeUpdateRate.add(success);
  return JSON.parse(response.body || '{}');
}

function loadFullDashboard() {
  const endpoints = [
    `${ADMIN_API}/analytics/revenue?timeRange=last_30d`,
    `${ADMIN_API}/analytics/bookings?timeRange=last_30d&groupBy=day`,
    `${ADMIN_API}/analytics/users?timeRange=last_30d&includeDemographics=true`,
    `${ADMIN_API}/analytics/deals?timeRange=last_30d&includeAIEffectiveness=true`,
    `${ADMIN_API}/analytics/performance`
  ];
  
  const startTime = Date.now();
  
  // Parallel loading like a real dashboard
  const responses = http.batch(endpoints.map(url => ({
    method: 'GET', 
    url: url,
    params: { tags: { name: 'DashboardLoad' } }
  })));
  
  const loadTime = Date.now() - startTime;
  dashboardLoadTime.add(loadTime);
  
  const allSuccess = responses.every(r => r.status === 200);
  
  check({ responses }, {
    'dashboard loaded successfully': () => allSuccess,
    'dashboard load time acceptable': () => loadTime < 5000
  });
  
  !allSuccess && analyticsErrors.add(responses.filter(r => r.status !== 200).length);
}

// Test scenarios
export function revenueAnalyticsTest() {
  group('Revenue Analytics', function() {
    const timeRange = getRandomTimeRange();
    const destination = getRandomDestination();
    
    const revenue = getRevenueAnalytics(timeRange, destination);
    
    check(revenue, {
      'revenue data present': (r) => r.data && r.data.totalRevenue > 0,
      'daily breakdown present': (r) => r.data && r.data.dailyData && r.data.dailyData.length > 0,
      'forecasts generated': (r) => r.data && r.data.forecasts && r.data.forecasts.length > 0
    });
    
    sleep(1);
  });
}

export function bookingTrendsTest() {
  group('Booking Trends', function() {
    const timeRange = getRandomTimeRange();
    
    const trends = getBookingTrends(timeRange);
    
    check(trends, {
      'trend data present': (r) => r.data && r.data.dailyData && r.data.dailyData.length > 0,
      'conversion rates present': (r) => r.data && r.data.conversionRates !== undefined,
      'peak days identified': (r) => r.data && r.data.peakDays && r.data.peakDays.length > 0
    });
    
    sleep(1);
  });
}

export function userAnalyticsTest() {
  group('User Analytics', function() {
    const timeRange = getRandomTimeRange();
    
    const users = getUserAnalytics(timeRange);
    
    check(users, {
      'user metrics present': (r) => r.data && r.data.totalUsers !== undefined,
      'demographics included': (r) => r.data && r.data.demographics && r.data.demographics.ageGroups,
      'retention rates present': (r) => r.data && r.data.retentionRates && r.data.retentionRates.length > 0
    });
    
    sleep(1);
  });
}

export function dealPerformanceTest() {
  group('Deal Performance', function() {
    const timeRange = getRandomTimeRange();
    
    const deals = getDealPerformance(timeRange);
    
    check(deals, {
      'deal metrics present': (r) => r.data && r.data.totalDeals !== undefined,
      'AI effectiveness measured': (r) => r.data && r.data.aiEffectiveness && r.data.aiEffectiveness.score > 0,
      'conversion impact tracked': (r) => r.data && r.data.conversionImpact !== undefined
    });
    
    sleep(1);
  });
}

export function dashboardLoadTest() {
  group('Dashboard Full Load', function() {
    loadFullDashboard();
    sleep(2);
  });
}

export function realTimeUpdatesTest() {
  group('Real-time Updates', function() {
    const updates = getRealTimeUpdates();
    
    check(updates, {
      'real-time data fresh': (r) => r.data && r.data.lastUpdate,
      'metrics complete': (r) => r.data && r.data.activeUsers && r.data.recentBookings,
      'alerts present': (r) => r.data && r.data.alerts && r.data.alerts.length >= 0
    });
    
    sleep(0.5); // Frequent polling
  });
}

// Main test execution
export default function() {
  const testType = Math.random();
  
  // Weighted distribution of analytics tests
  if (testType < 0.25) {
    revenueAnalyticsTest();
  } else if (testType < 0.45) {
    bookingTrendsTest();
  } else if (testType < 0.65) {
    userAnalyticsTest();
  } else if (testType < 0.85) {
    dealPerformanceTest();
  } else if (testType < 0.95) {
    dashboardLoadTest();
  } else {
    realTimeUpdatesTest();
  }
}

export function teardown(data) {
  console.log(`\n📊 Analytics Performance Test Summary:`);
  console.log(`📈 Average Query Time: ${Math.round(analyticsQueryTime.avg)}ms`);
  console.log(`🖥️  Average Dashboard Load: ${Math.round(dashboardLoadTime.avg)}ms`);
  console.log(`⚡ Real-time Update Rate: ${Math.round(realTimeUpdateRate.value * 100)}%`);
  console.log(`❌ Total Analytics Errors: ${analyticsErrors.value}`);
}