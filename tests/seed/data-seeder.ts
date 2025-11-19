/**
 * Comprehensive Data Seeding Script
 * Generates 10k users, 10k listings, 100k bookings for testing
 */

import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

// Database configuration
const DB_CONFIG = {
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'kayak',
    password: process.env.DB_PASSWORD || 'change_me_db_password',
    database: process.env.DB_NAME || 'kayak'
  },
  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://root:change_me_mongo_root_password@localhost:27017/kayak?authSource=admin'
  }
};

// Sample data
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const AIRLINES = [
  'American Airlines', 'Delta', 'United', 'Southwest', 'JetBlue',
  'Alaska Airlines', 'Spirit', 'Frontier', 'Hawaiian', 'Sun Country'
];

const AIRPORTS = [
  { code: 'JFK', city: 'New York', state: 'NY' },
  { code: 'LAX', city: 'Los Angeles', state: 'CA' },
  { code: 'ORD', city: 'Chicago', state: 'IL' },
  { code: 'DFW', city: 'Dallas', state: 'TX' },
  { code: 'DEN', city: 'Denver', state: 'CO' },
  { code: 'SFO', city: 'San Francisco', state: 'CA' },
  { code: 'SEA', city: 'Seattle', state: 'WA' },
  { code: 'LAS', city: 'Las Vegas', state: 'NV' },
  { code: 'MCO', city: 'Orlando', state: 'FL' },
  { code: 'EWR', city: 'Newark', state: 'NJ' },
  { code: 'CLT', city: 'Charlotte', state: 'NC' },
  { code: 'MIA', city: 'Miami', state: 'FL' },
  { code: 'IAH', city: 'Houston', state: 'TX' },
  { code: 'BOS', city: 'Boston', state: 'MA' },
  { code: 'MSP', city: 'Minneapolis', state: 'MN' }
];

const HOTEL_CHAINS = [
  'Marriott', 'Hilton', 'Hyatt', 'InterContinental', 'Accor',
  'Choice', 'Wyndham', 'Best Western', 'Radisson', 'La Quinta'
];

const CAR_VENDORS = [
  'Hertz', 'Enterprise', 'Avis', 'Budget', 'National',
  'Alamo', 'Dollar', 'Thrifty', 'Sixt', 'Payless'
];

const FIRST_NAMES = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth',
  'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle',
  'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Jason', 'Edward', 'Jeffrey', 'Ryan', 'Jacob'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const STREET_NAMES = [
  'Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Washington', 'Lake', 'Hill', 'Sunset',
  'Park', 'View', 'Center', 'First', 'Second', 'Third', 'Broadway', 'Madison', 'Jefferson', 'Lincoln',
  'Church', 'Spring', 'North', 'South', 'East', 'West', 'Riverside', 'Parkway', 'Highway', 'Valley'
];

const STREET_TYPES = ['St', 'Ave', 'Blvd', 'Rd', 'Dr', 'Ln', 'Way', 'Ct', 'Pl', 'Cir'];

class DataSeeder {
  private mysql: mysql.Connection;
  private mongo: MongoClient;

  constructor() {
    this.mysql = {} as mysql.Connection;
    this.mongo = {} as MongoClient;
  }

  async initialize() {
    console.log('🔧 Initializing database connections...');
    
    // Connect to MySQL
    this.mysql = await mysql.createConnection(DB_CONFIG.mysql);
    console.log('✅ MySQL connected');

    // Connect to MongoDB
    this.mongo = new MongoClient(DB_CONFIG.mongodb.url);
    await this.mongo.connect();
    console.log('✅ MongoDB connected');
  }

  async seed() {
    try {
      console.log('\n🗃️ Starting comprehensive data seeding...');
      
      // Step 1: Clean existing data
      await this.cleanDatabase();
      
      // Step 2: Seed 10k users
      console.log('\n👥 Seeding 10,000 users...');
      await this.seedUsers(10000);
      
      // Step 3: Seed 2k flights
      console.log('\n✈️ Seeding 2,000 flights...');
      await this.seedFlights(2000);
      
      // Step 4: Seed 3k hotels
      console.log('\️ Seeding 3,000 hotels...');
      await this.seedHotels(3000);
      
      // Step 5: Seed 5k car rentals
      console.log('\n🚗 Seeding 5,000 car rentals...');
      await this.seedCarRentals(5000);
      
      // Step 6: Seed 100k bookings
      console.log('\n📦 Seeding 100,000 bookings...');
      await this.seedBookings(100000);
      
      console.log('\n✅ Data seeding completed successfully!');
      
    } catch (error) {
      console.error('❌ Data seeding failed:', error);
      throw error;
    }
  }

  private async cleanDatabase() {
    console.log('🧹 Cleaning existing data...');
    
    // Clean MySQL tables in dependency order
    const tables = [
      'booking_items', 'bookings', 'billing_records', 'deals',
      'car_rentals', 'hotel_rooms', 'hotels', 'flights',
      'user_addresses', 'users', 'admin_users', 'outbox_events'
    ];
    
    for (const table of tables) {
      await this.mysql.execute(`DELETE FROM ${table}`);
    }
    
    console.log('✅ MySQL tables cleaned');
  }

  private async seedUsers(count: number) {
    const users: any[] = [];
    const addresses: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const userId = uuidv4();
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
      
      users.push({
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        phone: this.generatePhone(),
        ssn: this.generateSSN(),
        date_of_birth: this.generateBirthDate(),
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Add address for ~70% of users
      if (Math.random() < 0.7) {
        const state = US_STATES[Math.floor(Math.random() * US_STATES.length)];
        const city = this.generateCity(state);
        addresses.push({
          id: uuidv4(),
          user_id: userId,
          street: `${Math.floor(Math.random() * 9999) + 1} ${STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)]} ${STREET_TYPES[Math.floor(Math.random() * STREET_TYPES.length)]}`,
          city,
          state,
          zip_code: this.generateZipCode(),
          country: 'US',
          address_type: 'home',
          created_at: new Date().toISOString()
        });
      }
    }
    
    // Batch insert users
    const userChunks = this.chunkArray(users, 1000);
    for (const chunk of userChunks) {
      const values = chunk.map(user => [
        user.id, user.email, user.first_name, user.last_name,
        user.phone, user.ssn, user.date_of_birth, user.created_at, user.updated_at
      ]);
      await this.mysql.execute(
        'INSERT INTO users (id, email, first_name, last_name, phone, ssn, date_of_birth, created_at, updated_at) VALUES ?',
        [values]
      );
    }
    
    console.log(`✅ Seeded ${count} users with ${addresses.length} addresses`);
  }

  private async seedFlights(count: number) {
    const flights: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const origin = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
      let destination = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
      while (destination.code === origin.code) {
        destination = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
      }
      
      const airline = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
      const flightNumber = `${airline.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`;
      const departureTime = new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000);
      const duration = Math.floor(Math.random() * 480) + 60; // 1-8 hours
      const arrivalTime = new Date(departureTime.getTime() + duration * 60 * 1000);
      
      flights.push({
        id: uuidv4(),
        airline,
        flight_number: flightNumber,
        origin_airport_code: origin.code,
        destination_airport_code: destination.code,
        departure_time: departureTime.toISOString(),
        arrival_time: arrivalTime.toISOString(),
        duration_minutes: duration,
        aircraft: this.generateAircraft(),
        price: Math.floor(Math.random() * 800) + 100,
        currency: 'USD',
        available_seats: Math.floor(Math.random() * 150) + 1,
        class: ['economy', 'business', 'first'][Math.floor(Math.random() * 3)],
        booking_class: ['Y', 'J', 'F'][Math.floor(Math.random() * 3)],
        refundable: Math.random() < 0.3,
        changeable: Math.random() < 0.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    // Batch insert flights
    const flightChunks = this.chunkArray(flights, 500);
    for (const chunk of flightChunks) {
      const values = chunk.map(flight => [
        flight.id, flight.airline, flight.flight_number,
        flight.origin_airport_code, flight.destination_airport_code,
        flight.departure_time, flight.arrival_time, flight.duration_minutes,
        flight.aircraft, flight.price, flight.currency, flight.available_seats,
        flight.class, flight.booking_class, flight.refundable, flight.changeable,
        flight.created_at, flight.updated_at
      ]);
      await this.mysql.execute(
        'INSERT INTO flights (id, airline, flight_number, origin_airport_code, destination_airport_code, departure_time, arrival_time, duration_minutes, aircraft, price, currency, available_seats, class, booking_class, refundable, changeable, created_at, updated_at) VALUES ?',
        [values]
      );
    }
    
    console.log(`✅ Seeded ${count} flights`);
  }

  private async seedHotels(count: number) {
    const hotels: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const city = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
      const hotelChain = HOTEL_CHAINS[Math.floor(Math.random() * HOTEL_CHAINS.length)];
      
      hotels.push({
        id: uuidv4(),
        name: `${hotelChain} ${city.city} ${['Downtown', 'Airport', 'Beach', 'Riverside', 'Central'][Math.floor(Math.random() * 5)]}`,
        chain: hotelChain,
        address: `${Math.floor(Math.random() * 999) + 1} ${STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)]} ${STREET_TYPES[Math.floor(Math.random() * STREET_TYPES.length)]}`,
        city: city.city,
        state: city.state,
        zip: this.generateZipCode(),
        country: 'US',
        stars: Math.floor(Math.random() * 3) + 2, // 2-5 stars
        price_per_night: Math.floor(Math.random() * 400) + 50,
        amenities: JSON.stringify(['wifi', 'pool', 'gym', 'parking'].filter(() => Math.random() < 0.6)),
        available_rooms: Math.floor(Math.random() * 50) + 1,
        total_rooms: Math.floor(Math.random() * 150) + 50,
        check_in_time: '15:00',
        check_out_time: '11:00',
        rating: Math.random() * 2 + 3, // 3-5
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    const hotelChunks = this.chunkArray(hotels, 500);
    for (const chunk of hotelChunks) {
      const values = chunk.map(hotel => [
        hotel.id, hotel.name, hotel.chain, hotel.address, hotel.city,
        hotel.state, hotel.zip, hotel.country, hotel.stars, hotel.price_per_night,
        hotel.amenities, hotel.available_rooms, hotel.total_rooms,
        hotel.check_in_time, hotel.check_out_time, hotel.rating,
        hotel.created_at, hotel.updated_at
      ]);
      await this.mysql.execute(
        'INSERT INTO hotels (id, name, chain, address, city, state, zip, country, stars, price_per_night, amenities, available_rooms, total_rooms, check_in_time, check_out_time, rating, created_at, updated_at) VALUES ?',
        [values]
      );
    }
    
    console.log(`✅ Seeded ${count} hotels`);
  }

  private async seedCarRentals(count: number) {
    const cars: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const location = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
      const vendor = CAR_VENDORS[Math.floor(Math.random() * CAR_VENDORS.length)];
      
      cars.push({
        id: uuidv4(),
        vendor,
        vehicle_type: ['sedan', 'suv', 'economy', 'luxury', 'van'][Math.floor(Math.random() * 5)],
        make: ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW'][Math.floor(Math.random() * 5)],
        model: ['Camry', 'Accord', 'F-150', 'Malibu', 'X5'][Math.floor(Math.random() * 5)],
        year: 2020 + Math.floor(Math.random() * 5),
        location_code: location.code,
        city: location.city,
        state: location.state,
        price_per_day: Math.floor(Math.random() * 150) + 30,
        currency: 'USD',
        available: Math.random() < 0.8,
        transmission: ['automatic', 'manual'][Math.floor(Math.random() * 2)],
        fuel_type: 'gasoline',
        seats: Math.floor(Math.random() * 4) + 4,
        luggage_capacity: Math.floor(Math.random() * 3) + 2,
        mileage_policy: ['unlimited', 'limited'][Math.floor(Math.random() * 2)],
        insurance_included: Math.random() < 0.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    const carChunks = this.chunkArray(cars, 500);
    for (const chunk of carChunks) {
      const values = chunk.map(car => [
        car.id, car.vendor, car.vehicle_type, car.make, car.model, car.year,
        car.location_code, car.city, car.state, car.price_per_day, car.currency,
        car.available, car.transmission, car.fuel_type, car.seats, car.luggage_capacity,
        car.mileage_policy, car.insurance_included, car.created_at, car.updated_at
      ]);
      await this.mysql.execute(
        'INSERT INTO car_rentals (id, vendor, vehicle_type, make, model, year, location_code, city, state, price_per_day, currency, available, transmission, fuel_type, seats, luggage_capacity, mileage_policy, insurance_included, created_at, updated_at) VALUES ?',
        [values]
      );
    }
    
    console.log(`✅ Seeded ${count} car rentals`);
  }

  private async seedBookings(count: number) {
    // Get all users, flights, hotels, cars first
    const [users] = await this.mysql.execute('SELECT id FROM users LIMIT 10000');
    const [flights] = await this.mysql.execute('SELECT id, price FROM flights LIMIT 2000');
    const [hotels] = await this.mysql.execute('SELECT id, price_per_night FROM hotels LIMIT 3000');
    const [cars] = await this.mysql.execute('SELECT id, price_per_day FROM car_rentals LIMIT 5000');
    
    const userIds = (users as any[]).map(u => u.id);
    const flightList = flights as any[];
    const hotelList = hotels as any[];
    const carList = cars as any[];
    
    const bookings: any[] = [];
    const bookingItems: any[] = [];
    const billingRecords: any[] = [];
    
    console.log(`📊 Generating bookings from ${userIds.length} users...`);
    
    for (let i = 0; i < count; i++) {
      const userId = userIds[Math.floor(Math.random() * userIds.length)];
      const bookingId = uuidv4();
      const createdAt = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000); // Last 6 months
      const status = ['pending', 'confirmed', 'failed', 'cancelled'][Math.floor(Math.random() * 100) < 85 ? 1 : Math.floor(Math.random() * 3)];
      
      let totalAmount = 0;
      
      // 60% of bookings include a flight
      if (Math.random() < 0.6 && flightList.length > 0) {
        const flight = flightList[Math.floor(Math.random() * flightList.length)];
        const seats = Math.floor(Math.random() * 3) + 1;
        const itemPrice = flight.price * seats;
        totalAmount += itemPrice;
        
        bookingItems.push({
          id: uuidv4(),
          booking_id: bookingId,
          type: 'flight',
          reference_id: flight.id,
          details: JSON.stringify({ reservationId: uuidv4(), seats, status: 'confirmed' }),
          price: itemPrice,
          currency: 'USD',
          created_at: createdAt.toISOString()
        });
      }
      
      // 50% of bookings include a hotel
      if (Math.random() < 0.5 && hotelList.length > 0) {
        const hotel = hotelList[Math.floor(Math.random() * hotelList.length)];
        const nights = Math.floor(Math.random() * 7) + 1;
        const rooms = Math.floor(Math.random() * 2) + 1;
        const itemPrice = hotel.price_per_night * nights * rooms;
        totalAmount += itemPrice;
        
        bookingItems.push({
          id: uuidv4(),
          booking_id: bookingId,
          type: 'hotel',
          reference_id: hotel.id,
          details: JSON.stringify({ reservationId: uuidv4(), nights, rooms, status: 'confirmed' }),
          price: itemPrice,
          currency: 'USD',
          created_at: createdAt.toISOString()
        });
      }
      
      // 30% of bookings include a car
      if (Math.random() < 0.3 && carList.length > 0) {
        const car = carList[Math.floor(Math.random() * carList.length)];
        const days = Math.floor(Math.random() * 7) + 1;
        const itemPrice = car.price_per_day * days;
        totalAmount += itemPrice;
        
        bookingItems.push({
          id: uuidv4(),
          booking_id: bookingId,
          type: 'car',
          reference_id: car.id,
          details: JSON.stringify({ reservationId: uuidv4(), days, status: 'confirmed' }),
          price: itemPrice,
          currency: 'USD',
          created_at: createdAt.toISOString()
        });
      }
      
      // Skip if no items
      if (totalAmount === 0) continue;
      
      bookings.push({
        id: bookingId,
        user_id: userId,
        status,
        total_amount: totalAmount,
        currency: 'USD',
        confirmation_number: status === 'confirmed' ? `KAYAK-${bookingId.slice(0, 8).toUpperCase()}` : null,
        created_at: createdAt.toISOString(),
        updated_at: createdAt.toISOString()
      });
      
      // Create billing record if confirmed
      if (status === 'confirmed') {
        billingRecords.push({
          id: uuidv4(),
          user_id: userId,
          booking_id: bookingId,
          amount: totalAmount,
          currency: 'USD',
          payment_method: ['credit_card', 'debit_card', 'paypal'][Math.floor(Math.random() * 3)],
          card_last_four: String(Math.floor(Math.random() * 9000) + 1000),
          status: 'completed',
          transaction_id: `txn_${uuidv4()}`,
          created_at: createdAt.toISOString(),
          updated_at: createdAt.toISOString()
        });
      }
      
      // Log progress every 10k bookings
      if ((i + 1) % 10000 === 0) {
        console.log(`  ⏳ Generated ${i + 1}/${count} bookings...`);
      }
    }
    
    console.log(`💾 Inserting ${bookings.length} bookings into database...`);
    
    // Insert bookings
    const bookingChunks = this.chunkArray(bookings, 1000);
    for (let idx = 0; idx < bookingChunks.length; idx++) {
      const chunk = bookingChunks[idx];
      const values = chunk.map(b => [
        b.id, b.user_id, b.status, b.total_amount, b.currency,
        b.confirmation_number, b.created_at, b.updated_at
      ]);
      await this.mysql.execute(
        'INSERT INTO bookings (id, user_id, status, total_amount, currency, confirmation_number, created_at, updated_at) VALUES ?',
        [values]
      );
      if ((idx + 1) % 10 === 0) {
        console.log(`  ⏳ Inserted ${(idx + 1) * 1000}/${bookings.length} bookings...`);
      }
    }
    
    // Insert booking items
    console.log(`💾 Inserting ${bookingItems.length} booking items...`);
    const itemChunks = this.chunkArray(bookingItems, 1000);
    for (let idx = 0; idx < itemChunks.length; idx++) {
      const chunk = itemChunks[idx];
      const values = chunk.map(item => [
        item.id, item.booking_id, item.type, item.reference_id,
        item.details, item.price, item.currency, item.created_at
      ]);
      await this.mysql.execute(
        'INSERT INTO booking_items (id, booking_id, type, reference_id, details, price, currency, created_at) VALUES ?',
        [values]
      );
    }
    
    // Insert billing records
    console.log(`💾 Inserting ${billingRecords.length} billing records...`);
    const billingChunks = this.chunkArray(billingRecords, 1000);
    for (const chunk of billingChunks) {
      const values = chunk.map(b => [
        b.id, b.user_id, b.booking_id, b.amount, b.currency,
        b.payment_method, b.card_last_four, b.status, b.transaction_id,
        b.created_at, b.updated_at
      ]);
      await this.mysql.execute(
        'INSERT INTO billing_records (id, user_id, booking_id, amount, currency, payment_method, card_last_four, status, transaction_id, created_at, updated_at) VALUES ?',
        [values]
      );
    }
    
    console.log(`✅ Seeded ${bookings.length} bookings, ${bookingItems.length} items, ${billingRecords.length} billing records`);
  }

  // Helper methods
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private generatePhone(): string {
    return `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  private generateSSN(): string {
    return `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  private generateBirthDate(): string {
    const start = new Date('1950-01-01');
    const end = new Date('2005-12-31');
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
  }

  private generateCity(state: string): string {
    const cities: { [key: string]: string[] } = {
      'CA': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Fresno'],
      'NY': ['New York', 'Buffalo', 'Rochester', 'Syracuse', 'Albany'],
      'TX': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
      'FL': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'St. Petersburg'],
      'IL': ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville']
    };
    
    return cities[state]?.[Math.floor(Math.random() * cities[state].length)] || `${state} City`;
  }

  private generateZipCode(): string {
    return String(Math.floor(Math.random() * 90000) + 10000);
  }

  private generateAircraft(): string {
    const aircraft = ['Boeing 737', 'Boeing 777', 'Airbus A320', 'Airbus A330', 'Boeing 787'];
    return aircraft[Math.floor(Math.random() * aircraft.length)];
  }

  public async close() {
    await this.mysql.end();
    await this.mongo.close();
  }
}

// Main execution
async function main() {
  const seeder = new DataSeeder();
  
  try {
    await seeder.initialize();
    await seeder.seed();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await seeder.close();
  }
}

main();
