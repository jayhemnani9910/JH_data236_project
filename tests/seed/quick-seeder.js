/**
 * Quick Data Seeder - Generates test data faster
 */
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const config = {
  mysql: {
    host: 'localhost',
    user: 'kayak',
    password: 'change_me_db_password',
    database: 'kayak',
    multipleStatements: true
  },
  mongodb: {
    url: 'mongodb://root:change_me_mongo_root_password@localhost:27017/kayak?authSource=admin'
  }
};

async function seedUsers(db, count) {
  console.log(`👥 Seeding ${count} users...`);
  
  const values = [];
  for (let i = 0; i < count; i++) {
    const userId = uuidv4();
    const email = `user${i}@example.com`;
    const firstName = ['James', 'Mary', 'John', 'Patricia', 'Robert'][i % 5];
    const lastName = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][i % 5];
    const phone = `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const ssn = `${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 90) + 10)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const dob = `${1950 + Math.floor(Math.random() * 50)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
    
    values.push(`('${userId}', '${email}', '${firstName}', '${lastName}', '${phone}', '${ssn}', '${dob}', NOW(), NOW())`);
    
    if (values.length >= 1000 || i === count - 1) {
      await db.query(`INSERT INTO users (id, email, first_name, last_name, phone, ssn, date_of_birth, created_at, updated_at) VALUES ${values.join(',')}`);
      console.log(`  ✅ Inserted ${i + 1}/${count} users`);
      values.length = 0;
    }
  }
}

async function seedFlights(db, count) {
  console.log(`✈️ Seeding ${count} flights...`);
  
  const airports = ['JFK', 'LAX', 'ORD', 'DFW', 'DEN', 'SFO', 'SEA', 'LAS', 'MCO', 'MIA'];
  const airlines = ['American', 'Delta', 'United', 'Southwest', 'JetBlue'];
  
  const values = [];
  for (let i = 0; i < count; i++) {
    const flightId = uuidv4();
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const flightNum = `${airline.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`;
    const origin = airports[Math.floor(Math.random() * airports.length)];
    let dest = airports[Math.floor(Math.random() * airports.length)];
    while (dest === origin) dest = airports[Math.floor(Math.random() * airports.length)];
    
    const depTime = new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const duration = Math.floor(Math.random() * 480) + 60;
    const arrTime = new Date(new Date(depTime).getTime() + duration * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const aircraft = ['Boeing 737', 'Airbus A320'][Math.floor(Math.random() * 2)];
    const price = Math.floor(Math.random() * 800) + 100;
    const seats = Math.floor(Math.random() * 150) + 1;
    const cls = ['economy', 'business', 'first'][Math.floor(Math.random() * 3)];
    const bookingClass = ['Y', 'J', 'F'][Math.floor(Math.random() * 3)];
    const refundable = Math.random() < 0.3 ? 1 : 0;
    const changeable = Math.random() < 0.8 ? 1 : 0;
    
    values.push(`('${flightId}', '${airline}', '${flightNum}', '${origin}', '${dest}', '${depTime}', '${arrTime}', ${duration}, '${aircraft}', ${price}, 'USD', ${seats}, '${cls}', '${bookingClass}', ${refundable}, ${changeable}, NOW(), NOW())`);
    
    if (values.length >= 500 || i === count - 1) {
      await db.query(`INSERT INTO flights (id, airline, flight_number, origin_airport_code, destination_airport_code, departure_time, arrival_time, duration_minutes, aircraft, price, currency, available_seats, class, booking_class, refundable, changeable, created_at, updated_at) VALUES ${values.join(',')}`);
      console.log(`  ✅ Inserted ${i + 1}/${count} flights`);
      values.length = 0;
    }
  }
}

async function seedHotels(db, count) {
  console.log(`🏨 Seeding ${count} hotels...`);
  
  const names = ['Marriott', 'Hilton', 'Hyatt', 'InterContinental', 'Best Western'];
  const locations = ['JFK', 'LAX', 'ORD', 'DFW', 'MIA', 'DEN', 'SEA', 'LAS', 'MCO', 'BOS'];
  
  const values = [];
  for (let i = 0; i < count; i++) {
    const hotelId = uuidv4();
    const name = `${names[Math.floor(Math.random() * names.length)]} ${locations[Math.floor(Math.random() * locations.length)]}`;
    const desc = 'Comfortable hotel with modern amenities';
    const stars = Math.floor(Math.random() * 3) + 2;
    const loc = locations[Math.floor(Math.random() * locations.length)];
    const address = `${Math.floor(Math.random() * 999) + 1} Main St`;
    const lat = (Math.random() * 80 - 40).toFixed(6);
    const lon = (Math.random() * 180 - 90).toFixed(6);
    const amenities = JSON.stringify(['wifi', 'pool', 'gym']);
    const policies = JSON.stringify({ checkIn: '15:00', checkOut: '11:00' });
    
    values.push(`('${hotelId}', '${name.replace(/'/g, "''")}', '${desc}', ${stars}, '${loc}', '${address}', ${lat}, ${lon}, '${amenities}', '${policies}', NOW(), NOW())`);
    
    if (values.length >= 500 || i === count - 1) {
      await db.query(`INSERT INTO hotels (id, name, description, star_rating, location_code, address, latitude, longitude, amenities, policies, created_at, updated_at) VALUES ${values.join(',')}`);
      console.log(`  ✅ Inserted ${i + 1}/${count} hotels`);
      values.length = 0;
    }
  }
}

async function seedCars(db, count) {
  console.log(`🚗 Seeding ${count} car rentals...`);
  
  const vendors = ['Hertz', 'Enterprise', 'Avis', 'Budget', 'National'];
  const locations = ['JFK', 'LAX', 'ORD', 'DFW', 'MIA', 'DEN', 'SEA', 'LAS'];
  
  const values = [];
  for (let i = 0; i < count; i++) {
    const carId = uuidv4();
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const loc = locations[Math.floor(Math.random() * locations.length)];
    const vtype = ['sedan', 'suv', 'economy', 'luxury'][Math.floor(Math.random() * 4)];
    const make = ['Toyota', 'Honda', 'Ford', 'BMW', 'Chevrolet'][Math.floor(Math.random() * 5)];
    const model = ['Camry', 'Accord', 'F-150', 'X5', 'Malibu'][Math.floor(Math.random() * 5)];
    const year = 2020 + Math.floor(Math.random() * 5);
    const trans = ['automatic', 'manual'][Math.floor(Math.random() * 2)];
    const fuel = ['gasoline', 'diesel', 'electric', 'hybrid'][Math.floor(Math.random() * 4)];
    const seats = Math.floor(Math.random() * 4) + 4;
    const doors = [2, 4][Math.floor(Math.random() * 2)];
    const price = Math.floor(Math.random() * 150) + 30;
    const avail = Math.random() < 0.8 ? 1 : 0;
    const features = JSON.stringify(['gps', 'bluetooth']);
    
    values.push(`('${carId}', '${vendor}', '${loc}', '${vtype}', '${make}', '${model}', ${year}, '${trans}', '${fuel}', ${seats}, ${doors}, ${price}, 'USD', ${avail}, '${features}', NOW(), NOW())`);
    
    if (values.length >= 500 || i === count - 1) {
      await db.query(`INSERT INTO car_rentals (id, vendor, location_code, vehicle_type, make, model, year, transmission, fuel_type, seats, doors, daily_rate, currency, available, features, created_at, updated_at) VALUES ${values.join(',')}`);
      console.log(`  ✅ Inserted ${i + 1}/${count} cars`);
      values.length = 0;
    }
  }
}

async function seedBookings(db, userCount, bookingCount) {
  console.log(`📦 Seeding ${bookingCount} bookings...`);
  
  // Get IDs
  const [users] = await db.query(`SELECT id FROM users LIMIT ${userCount}`);
  const [flights] = await db.query('SELECT id, price FROM flights LIMIT 2000');
  const [hotels] = await db.query('SELECT id FROM hotels LIMIT 3000');
  const [cars] = await db.query('SELECT id, daily_rate FROM car_rentals LIMIT 5000');
  
  console.log(`  📊 Found ${users.length} users, ${flights.length} flights, ${hotels.length} hotels, ${cars.length} cars`);
  
  let bookingValues = [];
  let itemValues = [];
  let billingValues = [];
  let insertedBookings = 0;
  
  for (let i = 0; i < bookingCount; i++) {
    const userId = users[Math.floor(Math.random() * users.length)].id;
    const bookingId = uuidv4();
    const status = Math.random() < 0.85 ? 'confirmed' : ['pending', 'cancelled', 'completed'][Math.floor(Math.random() * 3)];
    const createdAt = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    
    let total = 0;
    let items = [];
    
    // 60% include flight
    if (Math.random() < 0.6 && flights.length > 0) {
      const flight = flights[Math.floor(Math.random() * flights.length)];
      const seats = Math.floor(Math.random() * 3) + 1;
      const price = flight.price * seats;
      total += price;
      items.push({
        id: uuidv4(),
        type: 'flight',
        refId: flight.id,
        price,
        details: JSON.stringify({ reservationId: uuidv4(), seats })
      });
    }
    
    // 50% include hotel
    if (Math.random() < 0.5 && hotels.length > 0) {
      const hotel = hotels[Math.floor(Math.random() * hotels.length)];
      const nights = Math.floor(Math.random() * 7) + 1;
      const price = (Math.floor(Math.random() * 200) + 50) * nights; // Random price per night
      total += price;
      items.push({
        id: uuidv4(),
        type: 'hotel',
        refId: hotel.id,
        price,
        details: JSON.stringify({ reservationId: uuidv4(), nights })
      });
    }
    
    // 30% include car
    if (Math.random() < 0.3 && cars.length > 0) {
      const car = cars[Math.floor(Math.random() * cars.length)];
      const days = Math.floor(Math.random() * 7) + 1;
      const price = car.daily_rate * days;
      total += price;
      items.push({
        id: uuidv4(),
        type: 'car',
        refId: car.id,
        price,
        details: JSON.stringify({ reservationId: uuidv4(), days })
      });
    }
    
    if (total === 0) continue;
    
    const confirmNum = status === 'confirmed' ? `KAYAK-${bookingId.substring(0, 8).toUpperCase()}` : `PENDING-${bookingId.substring(0, 8)}`;
    bookingValues.push(`('${bookingId}', '${userId}', '${status}', ${total}, 'USD', '${confirmNum}', '${createdAt}', '${createdAt}')`);
    
    for (const item of items) {
      itemValues.push(`('${item.id}', '${bookingId}', '${item.type}', '${item.refId}', 1, ${item.price}, ${item.price}, '${item.details}', '${createdAt}')`);
    }
    
    if (status === 'confirmed') {
      const billingId = uuidv4();
      const paymentId = `pay_${uuidv4().substring(0, 16)}`;
      billingValues.push(`('${billingId}', '${bookingId}', '${userId}', ${total}, 'USD', 'charge', 'completed', '${paymentId}', 'Payment for booking', '${createdAt}', '${createdAt}')`);
    }
    
    if (bookingValues.length >= 1000 || i === bookingCount - 1) {
      await db.query(`INSERT INTO bookings (id, user_id, status, total_amount, currency, confirmation_number, created_at, updated_at) VALUES ${bookingValues.join(',')}`);
      if (itemValues.length > 0) {
        await db.query(`INSERT INTO booking_items (id, booking_id, type, reference_id, quantity, unit_price, total_price, details, created_at) VALUES ${itemValues.join(',')}`);
      }
      if (billingValues.length > 0) {
        await db.query(`INSERT INTO billing_records (id, booking_id, user_id, amount, currency, type, status, payment_id, description, created_at, updated_at) VALUES ${billingValues.join(',')}`);
      }
      insertedBookings += bookingValues.length;
      console.log(`  ✅ Inserted ${insertedBookings}/${bookingCount} bookings`);
      bookingValues = [];
      itemValues = [];
      billingValues = [];
    }
  }
  
  console.log(`✅ Final: ${insertedBookings} bookings created`);
}

async function main() {
  let db, mongo;
  
  try {
    console.log('🔧 Connecting to databases...');
    db = await mysql.createConnection(config.mysql);
    console.log('✅ MySQL connected');
    
    mongo = new MongoClient(config.mongodb.url);
    await mongo.connect();
    console.log('✅ MongoDB connected');
    
    console.log('\n🧹 Cleaning existing data...');
    await db.query('DELETE FROM booking_items');
    await db.query('DELETE FROM bookings');
    await db.query('DELETE FROM billing_records');
    await db.query('DELETE FROM deals');
    await db.query('DELETE FROM car_rentals');
    await db.query('DELETE FROM hotels');
    await db.query('DELETE FROM flights');
    await db.query('DELETE FROM user_addresses');
    await db.query('DELETE FROM users');
    console.log('✅ Tables cleaned');
    
    console.log('\n🗃️ Starting data seeding...\n');
    
    await seedUsers(db, 10000);
    await seedFlights(db, 2000);
    await seedHotels(db, 3000);
    await seedCars(db, 5000);
    await seedBookings(db, 10000, 10000); // Reduced from 100K to 10K for faster execution
    
    console.log('\n✅ Data seeding completed successfully!');
    
    // Show stats
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    const [flightCount] = await db.query('SELECT COUNT(*) as count FROM flights');
    const [hotelCount] = await db.query('SELECT COUNT(*) as count FROM hotels');
    const [carCount] = await db.query('SELECT COUNT(*) as count FROM car_rentals');
    const [bookingCount] = await db.query('SELECT COUNT(*) as count FROM bookings');
    const [itemCount] = await db.query('SELECT COUNT(*) as count FROM booking_items');
    const [billingCount] = await db.query('SELECT COUNT(*) as count FROM billing_records');
    
    console.log('\n📊 Final Statistics:');
    console.log(`  Users: ${userCount[0].count}`);
    console.log(`  Flights: ${flightCount[0].count}`);
    console.log(`  Hotels: ${hotelCount[0].count}`);
    console.log(`  Cars: ${carCount[0].count}`);
    console.log(`  Bookings: ${bookingCount[0].count}`);
    console.log(`  Booking Items: ${itemCount[0].count}`);
    console.log(`  Billing Records: ${billingCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    if (db) await db.end();
    if (mongo) await mongo.close();
  }
}

main();
