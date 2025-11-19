const baseUrl = 'http://localhost:8000';

async function testFlow() {
  try {
    // 1. Test health
    console.log('1. Testing health...');
    const health = await fetch(`${baseUrl}/health`);
    console.log('   Health:', health.status);

    // 2. Register user
    console.log('\n2. Registering user...');
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: 'Test123!',
        name: 'Test User',
        phone: '1234567890'
      })
    });
    const user = await registerRes.json();
    console.log('   Register:', registerRes.status, user);

    // 3. Login
    console.log('\n3. Logging in...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: 'Test123!'
      })
    });
    const loginData = await loginRes.json();
    console.log('   Login:', loginRes.status, loginData);
    const token = loginData.token;

    // 4. Search flights
    console.log('\n4. Searching flights...');
    const flightsRes = await fetch(`${baseUrl}/api/flights/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2025-12-15'
      })
    });
    const flights = await flightsRes.json();
    console.log('   Flights:', flightsRes.status, 'Found:', flights.length);
    if (flights.length > 0) console.log('   First flight:', flights[0]);

    // 5. Search hotels
    console.log('\n5. Searching hotels...');
    const hotelsRes = await fetch(`${baseUrl}/api/hotels/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'Los Angeles',
        checkIn: '2025-12-15',
        checkOut: '2025-12-18'
      })
    });
    const hotels = await hotelsRes.json();
    console.log('   Hotels:', hotelsRes.status, 'Found:', hotels.length);
    if (hotels.length > 0) console.log('   First hotel:', hotels[0]);

    // 6. Search cars
    console.log('\n6. Searching cars...');
    const carsRes = await fetch(`${baseUrl}/api/cars/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'Los Angeles',
        pickupDate: '2025-12-15',
        dropoffDate: '2025-12-18'
      })
    });
    const cars = await carsRes.json();
    console.log('   Cars:', carsRes.status, 'Found:', cars.length);
    if (cars.length > 0) console.log('   First car:', cars[0]);

    // 7. Create booking (if we have data)
    if (flights.length > 0) {
      console.log('\n7. Creating booking...');
      const bookingRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          items: [{
            type: 'flight',
            itemId: flights[0].id,
            details: flights[0]
          }]
        })
      });
      const booking = await bookingRes.json();
      console.log('   Booking:', bookingRes.status, booking);
    }

    console.log('\n✅ Flow test complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFlow();
