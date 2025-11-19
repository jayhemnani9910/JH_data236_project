// UI Test Flow for Kayak Clone
const axios = require('axios');

const API_BASE = 'http://localhost:8000/api';
const CLIENT_URL = 'http://localhost:3000';

async function testCompleteFlow() {
  console.log('🧪 Starting Complete UI Flow Test\n');
  
  // Step 1: Register a new user
  console.log('1️⃣  Registering new user...');
  const registerRes = await axios.post(`${API_BASE}/auth/register`, {
    email: `uitest${Date.now()}@example.com`,
    password: 'Test123!@#',
    firstName: 'UI',
    lastName: 'Tester'
  });
  
  const user = registerRes.data.data.user;
  const token = registerRes.data.data.tokens.accessToken;
  console.log(`✅ User registered: ${user.id} (${user.email})`);
  
  // Step 2: Create a new flight as admin
  console.log('\n2️⃣  Creating new flight via admin API...');
  const flightRes = await axios.post(`${API_BASE}/admin/flights`, {
    airline: 'UI Test Airways',
    flightNumber: 'UT999',
    originAirportCode: 'SFO',
    destinationAirportCode: 'NYC',
    departureTime: '2025-12-15 09:00:00',
    arrivalTime: '2025-12-15 17:30:00',
    durationMinutes: 330,
    aircraft: 'Boeing 787',
    price: 450.00,
    availableSeats: 200,
    flightClass: 'economy'
  });
  
  const flightId = flightRes.data.data.id;
  console.log(`✅ Flight created: ${flightId} (${flightRes.data.data.id})`);
  
  // Step 3: Get the flight details
  console.log('\n3️⃣  Fetching flight details...');
  const flightDetailRes = await axios.get(`${API_BASE}/flights/${flightId}`);
  console.log(`✅ Flight details retrieved:`);
  console.log(`   - Airline: ${flightDetailRes.data.data.airline}`);
  console.log(`   - Route: ${flightDetailRes.data.data.origin.code} → ${flightDetailRes.data.data.destination.code}`);
  console.log(`   - Price: $${flightDetailRes.data.data.price}`);
  
  // Step 4: Update user profile
  console.log('\n4️⃣  Updating user profile...');
  await axios.put(`${API_BASE}/users/${user.id}/profile`, {
    phone: '+1-555-0123',
    firstName: 'UI Updated',
    lastName: 'Tester'
  });
  console.log(`✅ Profile updated`);
  
  // Step 5: Get user profile
  console.log('\n5️⃣  Fetching user profile...');
  const profileRes = await axios.get(`${API_BASE}/users/${user.id}/profile`);
  console.log(`✅ Profile retrieved:`);
  console.log(`   - Name: ${profileRes.data.data.firstName} ${profileRes.data.data.lastName}`);
  console.log(`   - Email: ${profileRes.data.data.email}`);
  console.log(`   - Phone: ${profileRes.data.data.phone || 'N/A'}`);
  
  // Step 6: Add a payment method
  console.log('\n6️⃣  Adding payment method...');
  const paymentRes = await axios.post(`${API_BASE}/users/${user.id}/payment-methods`, {
    paymentType: 'credit_card',
    lastFour: '4242',
    expiryMonth: 12,
    expiryYear: 2028,
    isDefault: true
  });
  console.log(`✅ Payment method added: ${paymentRes.data.data.id}`);
  
  // Step 7: Create a review for the flight
  console.log('\n7️⃣  Creating review for flight...');
  const reviewRes = await axios.post(`${API_BASE}/admin/reviews`, {
    userId: user.id,
    entityType: 'flight',
    entityId: flightId,
    rating: 5,
    reviewText: 'Amazing flight! UI test confirmed everything works perfectly.',
    title: 'Perfect experience'
  });
  console.log(`✅ Review created: ${reviewRes.data.data.reviewId}`);
  
  // Step 8: Get reviews for the flight
  console.log('\n8️⃣  Fetching reviews for flight...');
  const reviewsRes = await axios.get(`${API_BASE}/admin/reviews?entityType=flight&entityId=${flightId}`);
  console.log(`✅ Found ${reviewsRes.data.data.results.length} review(s)`);
  if (reviewsRes.data.data.results.length > 0) {
    const review = reviewsRes.data.data.results[0];
    console.log(`   - Rating: ${review.rating}/5`);
    console.log(`   - Title: ${review.title}`);
    console.log(`   - Text: ${review.reviewText.substring(0, 50)}...`);
  }
  
  // Step 9: Get user bookings
  console.log('\n9️⃣  Fetching user bookings...');
  const bookingsRes = await axios.get(`${API_BASE}/users/${user.id}/bookings`);
  console.log(`✅ User has ${bookingsRes.data.data.bookings.length} booking(s)`);
  
  // Step 10: Get system stats
  console.log('\n🔟  Fetching system statistics...');
  const statsRes = await axios.get(`${API_BASE}/admin/stats`);
  console.log(`✅ System stats:`);
  console.log(`   - Users: ${statsRes.data.data.users.toLocaleString()}`);
  console.log(`   - Bookings: ${statsRes.data.data.bookings.toLocaleString()}`);
  console.log(`   - Flights: ${statsRes.data.data.flights.toLocaleString()}`);
  console.log(`   - Hotels: ${statsRes.data.data.hotels.toLocaleString()}`);
  console.log(`   - Cars: ${statsRes.data.data.cars.toLocaleString()}`);
  
  console.log('\n✨ All tests completed successfully!');
  console.log(`\n🌐 Visit ${CLIENT_URL} in your browser to see the UI`);
  console.log(`📧 Login with: ${user.email}`);
  console.log(`�� Password: Test123!@#`);
}

testCompleteFlow().catch(error => {
  console.error('❌ Test failed:', error.response?.data || error.message);
  process.exit(1);
});
