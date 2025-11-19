#!/bin/bash
# Environment Setup Script for Kayak Project

set -e

echo "🚀 Setting up Kayak Microservices Environment..."

# Create .env file for local development
cat > .env << EOF
# JWT Secrets
JWT_SECRET=dev_jwt_secret_32_chars_min
JWT_REFRESH_SECRET=dev_jwt_refresh_secret_32_chars_min

# Database Configuration
DB_HOST=localhost
DB_USER=kayak
DB_PASSWORD=change_me_db_password
DB_NAME=kayak
MYSQL_ROOT_PASSWORD=change_me_root_password
MYSQL_PASSWORD=change_me_db_password
MONGO_INITDB_ROOT_PASSWORD=change_me_mongo_root_password

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Kafka Configuration
KAFKA_BROKERS=localhost:9092

# External Service URLs
USER_SVC_URL=http://localhost:8001
FLIGHTS_SVC_URL=http://localhost:8002
HOTELS_SVC_URL=http://localhost:8003
CARS_SVC_URL=http://localhost:8004
BILLING_SVC_URL=http://localhost:8005
ADMIN_SVC_URL=http://localhost:8006
CONCIERGE_SVC_URL=http://localhost:8007
DEALS_WORKER_URL=http://localhost:8008
BOOKING_SVC_URL=http://localhost:8011

# Client Environment
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8007

# External API Keys (placeholders - set real values locally)
AMADEUS_API_KEY=amadeus_api_key_here
AMADEUS_API_SECRET=amadeus_api_secret_here
BOOKING_COM_API_KEY=booking_com_api_key_here

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
STRIPE_SECRET_KEY=sk_test_replace_me

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password
FROM_EMAIL=noreply@kayakclone.com

# SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
EOF

echo "✅ .env file created"

# Make setup scripts executable
chmod +x start-dev.sh
chmod +x setup-environment.sh

# Create logs directory
mkdir -p .logs

# Initialize databases
echo "🔧 Initializing databases..."

# Create database init script
cat > init-databases.sql << EOF
-- Initialize MySQL database with sample data
USE kayak;

-- Insert sample flights
INSERT INTO flights (id, airline, flight_number, origin_airport_code, destination_airport_code, departure_time, arrival_time, duration_minutes, aircraft, price, available_seats, class) VALUES
('flight-001', 'Delta Airlines', 'DL123', 'JFK', 'LAX', '2024-12-15 08:00:00', '2024-12-15 11:30:00', 330, 'Boeing 737', 299.99, 150, 'economy'),
('flight-002', 'United Airlines', 'UA456', 'JFK', 'LAX', '2024-12-15 14:00:00', '2024-12-15 17:30:00', 330, 'Airbus A320', 349.99, 120, 'economy'),
('flight-003', 'American Airlines', 'AA789', 'LAX', 'JFK', '2024-12-16 09:00:00', '2024-12-16 17:30:00', 330, 'Boeing 737', 279.99, 180, 'economy'),
('flight-004', 'JetBlue', 'B6101', 'BOS', 'MIA', '2024-12-15 07:00:00', '2024-12-15 10:30:00', 210, 'Airbus A321', 199.99, 200, 'economy'),
('flight-005', 'Southwest', 'WN202', 'DEN', 'SEA', '2024-12-15 12:00:00', '2024-12-15 14:45:00', 165, 'Boeing 737', 249.99, 160, 'economy');

-- Insert sample hotels
INSERT INTO hotels (id, name, description, star_rating, address_street, address_city, address_state, address_zip_code, average_price) VALUES
('hotel-001', 'Grand Plaza Hotel', 'Luxury hotel in downtown', 5, '123 Main St', 'Los Angeles', 'CA', '90210', 299.99),
('hotel-002', 'Comfort Inn', 'Budget-friendly accommodation', 3, '456 Oak Ave', 'New York', 'NY', '10001', 129.99),
('hotel-003', 'Marriott Downtown', 'Business hotel with conference facilities', 4, '789 Business Blvd', 'Chicago', 'IL', '60601', 219.99),
('hotel-004', 'Hilton Garden Inn', 'Family-friendly hotel with pool', 4, '321 Family Way', 'Miami', 'FL', '33101', 189.99),
('hotel-005', 'Holiday Inn Express', 'Convenient airport location', 3, '654 Airport Rd', 'Denver', 'CO', '80202', 149.99);

-- Insert sample car rentals
INSERT INTO car_rentals (id, vendor, location_code, location_name, vehicle_type, make, model, year, transmission, fuel_type, seats, daily_rate) VALUES
('car-001', 'Hertz', 'LAX', 'Los Angeles Airport', 'Economy', 'Toyota', 'Corolla', 2023, 'automatic', 'gasoline', 5, 45.99),
('car-002', 'Enterprise', 'JFK', 'John F. Kennedy Airport', 'SUV', 'Ford', 'Explorer', 2023, 'automatic', 'gasoline', 7, 89.99),
('car-003', 'Avis', 'MIA', 'Miami International Airport', 'Luxury', 'BMW', '5 Series', 2023, 'automatic', 'gasoline', 5, 129.99),
('car-004', 'Budget', 'ORD', 'Chicago O\'Hare Airport', 'Compact', 'Honda', 'Civic', 2023, 'automatic', 'gasoline', 5, 55.99),
('car-005', 'National', 'DEN', 'Denver International Airport', 'Mid-size', 'Chevrolet', 'Malibu', 2023, 'automatic', 'gasoline', 5, 69.99);

-- Insert sample users
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, date_of_birth) VALUES
('user-001', 'demo@kayakclone.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo', 'User', '+1234567890', '1990-01-01'),
('user-002', 'admin@kayakclone.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', '+1234567891', '1985-06-15');

-- Insert sample admin user
INSERT INTO admin_users (id, email, password_hash, role, permissions) VALUES
('admin-001', 'admin@kayakclone.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '["read:users", "write:users", "read:bookings", "write:bookings"]');

EOF

echo "✅ Database init script created"
echo ""
echo "📋 Next steps:"
echo "1. Run: docker-compose up -d mysql mongodb redis kafka"
echo "2. Run: mysql -u kayak -p kayak < init-databases.sql"
echo "3. Run: source .env && ./start-dev.sh"
echo ""
echo "🌐 Access your application:"
echo "   • Client: http://localhost:3000"
echo "   • API Gateway: http://localhost:8000"
echo "   • Health: http://localhost:8000/health"
