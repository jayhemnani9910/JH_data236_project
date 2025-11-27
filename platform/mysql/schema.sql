-- MySQL Database Schema for Kayak-like Travel Booking System

-- Users table (core entity)
-- NOTE: id is SSN in format ###-##-#### per spec requirement
CREATE TABLE users (
    id VARCHAR(11) PRIMARY KEY, -- SSN format: ###-##-####
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    profile_image_url VARCHAR(500),
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_name (first_name, last_name),
    INDEX idx_user_role (role)
) ENGINE=InnoDB;

-- User addresses table
CREATE TABLE user_addresses (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(11) NOT NULL, -- References users.id (SSN format)
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL, -- US state abbreviation or full name
    zip_code VARCHAR(10) NOT NULL, -- ##### or #####-####
    country VARCHAR(100) NOT NULL DEFAULT 'US',
    address_type VARCHAR(20) DEFAULT 'home', -- home, work, billing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_zip_code (zip_code)
) ENGINE=InnoDB;

-- Payment methods table
CREATE TABLE payment_methods (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(11) NOT NULL, -- References users.id (SSN format)
    payment_type VARCHAR(50) NOT NULL,
    last_four VARCHAR(4) NOT NULL,
    expiry_month INT NOT NULL,
    expiry_year INT NOT NULL,
    billing_address VARCHAR(500),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- Bookings table (core booking entity)
CREATE TABLE bookings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(11) NOT NULL, -- References users.id (SSN format)
    type ENUM('flight', 'hotel', 'car', 'package') NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'awaiting_payment', 'failed') DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    -- Trip-level dates for past/current/future classification
    trip_start_date DATE NULL,
    trip_end_date DATE NULL,
    payment_id VARCHAR(36),
    confirmation_number VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_booking_status (status),
    INDEX idx_booking_type (type),
    INDEX idx_booking_date (created_at),
    INDEX idx_booking_trip_dates (trip_start_date, trip_end_date),
    INDEX idx_confirmation_number (confirmation_number)
) ENGINE=InnoDB;

-- Booking items table (flexible for different types of bookings)
CREATE TABLE booking_items (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL,
    type ENUM('flight', 'hotel', 'car') NOT NULL,
    reference_id VARCHAR(36) NOT NULL, -- flight_id, hotel_id, car_id
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    -- Item-level dates for more granular trip windows
    start_date DATE NULL,
    end_date DATE NULL,
    details JSON, -- flexible JSON storage for item-specific details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_booking_id (booking_id),
    INDEX idx_reference_id (reference_id),
    INDEX idx_item_type (type),
    INDEX idx_item_dates (start_date, end_date)
) ENGINE=InnoDB;

-- Flights table
CREATE TABLE flights (
    id VARCHAR(36) PRIMARY KEY,
    airline VARCHAR(100) NOT NULL,
    flight_number VARCHAR(20) NOT NULL,
    origin_airport_code VARCHAR(3) NOT NULL,
    destination_airport_code VARCHAR(3) NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    duration_minutes INT NOT NULL,
    aircraft VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    available_seats INT NOT NULL DEFAULT 0,
    class ENUM('economy', 'business', 'first') DEFAULT 'economy',
    booking_class VARCHAR(10),
    refundable BOOLEAN DEFAULT FALSE,
    changeable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_flight_route (origin_airport_code, destination_airport_code),
    INDEX idx_flight_date (departure_time),
    INDEX idx_flight_price (price),
    INDEX idx_flight_airline (airline),
    INDEX idx_available_seats (available_seats),
    INDEX idx_flight_search (origin_airport_code, destination_airport_code, departure_time),
    INDEX idx_flight_class_price (class, price)
) ENGINE=InnoDB;

-- Hotels table
CREATE TABLE hotels (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    star_rating INT NOT NULL CHECK (star_rating >= 1 AND star_rating <= 5),
    address_street VARCHAR(255) NOT NULL,
    address_city VARCHAR(100) NOT NULL,
    address_state VARCHAR(50) NOT NULL, -- US state abbreviation or full name
    address_zip_code VARCHAR(10) NOT NULL,
    address_country VARCHAR(100) NOT NULL DEFAULT 'US',
    location_code VARCHAR(20), -- Added for hotels-svc compatibility
    latitude DECIMAL(10, 8), -- Added for geolocation
    longitude DECIMAL(11, 8), -- Added for geolocation
    amenities JSON, -- Added for hotel-level amenities
    policies JSON, -- Added for hotel policies (check-in/out, cancellation, etc.)
    average_price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hotel_city (address_city),
    INDEX idx_hotel_state (address_state),
    INDEX idx_hotel_rating (star_rating),
    INDEX idx_hotel_price (average_price),
    INDEX idx_hotel_location (address_city, star_rating, average_price),
    INDEX idx_hotel_location_code (location_code),
    INDEX idx_hotel_search (address_city, address_state, star_rating)
) ENGINE=InnoDB;

-- Hotel rooms table
CREATE TABLE hotel_rooms (
    id VARCHAR(36) PRIMARY KEY,
    hotel_id VARCHAR(36) NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    max_occupancy INT NOT NULL,
    beds VARCHAR(100),
    bed_type VARCHAR(50), -- Added for compatibility with hotels-svc
    available_rooms INT DEFAULT 1, -- Added for inventory tracking
    base_price DECIMAL(10, 2), -- Added as alias/alternative to price_per_night
    amenities JSON, -- array of amenities
    images JSON, -- array of image URLs
    price_per_night DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    INDEX idx_hotel_id (hotel_id),
    INDEX idx_room_type (type),
    INDEX idx_room_price (price_per_night),
    INDEX idx_room_availability (available)
) ENGINE=InnoDB;

-- Car rentals table
CREATE TABLE car_rentals (
    id VARCHAR(36) PRIMARY KEY,
    vendor VARCHAR(100) NOT NULL,
    location_code VARCHAR(20) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    transmission ENUM('automatic', 'manual') NOT NULL,
    fuel_type ENUM('gasoline', 'diesel', 'electric', 'hybrid') NOT NULL,
    seats INT NOT NULL,
    doors INT NOT NULL,
    air_conditioning BOOLEAN DEFAULT FALSE,
    daily_rate DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    available BOOLEAN DEFAULT TRUE,
    minimum_age INT DEFAULT 21,
    mileage_policy TEXT,
    fuel_policy TEXT,
    insurance TEXT,
    features JSON, -- Added for admin CRUD compatibility
    images JSON, -- array of image URLs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_car_vendor (vendor),
    INDEX idx_car_location (location_code),
    INDEX idx_car_type (vehicle_type),
    INDEX idx_car_price (daily_rate),
    INDEX idx_car_availability (available),
    INDEX idx_car_daily_rate (daily_rate),
    INDEX idx_car_search (location_code, vehicle_type, daily_rate)
) ENGINE=InnoDB;

-- Billing/payments table
CREATE TABLE billing_records (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(11) NOT NULL, -- References users.id (SSN format)
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    type ENUM('charge', 'refund', 'partial_refund') NOT NULL,
    status ENUM('completed', 'pending', 'failed') DEFAULT 'pending',
    payment_id VARCHAR(36),
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_booking_id (booking_id),
    INDEX idx_user_id (user_id),
    INDEX idx_billing_status (status),
    INDEX idx_billing_date (created_at)
) ENGINE=InnoDB;

-- Payments table for Stripe integration
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(11) NOT NULL, -- References users.id (SSN format)
    booking_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'succeeded', 'failed', 'refunded', 'processing', 'requires_payment_method') DEFAULT 'pending',
    payment_method VARCHAR(50) NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_booking_id (booking_id),
    INDEX idx_payment_status (status),
    INDEX idx_stripe_payment_intent (stripe_payment_intent_id)
) ENGINE=InnoDB;

-- User refresh tokens table for JWT
CREATE TABLE user_refresh_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(11) NOT NULL, -- References users.id (SSN format)
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- Notifications table
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(11) NOT NULL, -- References users.id (SSN format)
    type ENUM('email', 'sms', 'push') NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    content TEXT NOT NULL,
    status ENUM('pending', 'sent', 'delivered', 'failed') DEFAULT 'pending',
    external_id VARCHAR(255), -- message ID from email/SMS provider
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_notification_type (type),
    INDEX idx_notification_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Admin users table
CREATE TABLE admin_users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'moderator', 'support') NOT NULL,
    permissions JSON, -- array of permissions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    INDEX idx_admin_email (email),
    INDEX idx_admin_role (role)
) ENGINE=InnoDB;

-- Deals table (for recommendations)
CREATE TABLE deals (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('flight', 'hotel', 'car', 'package') NOT NULL,
    reference_id VARCHAR(36) NOT NULL,
    original_price DECIMAL(10, 2) NOT NULL,
    deal_price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(5, 2) NOT NULL, -- percentage
    currency VARCHAR(3) DEFAULT 'USD',
    valid_until DATETIME NOT NULL,
    conditions JSON, -- array of conditions
    tags JSON, -- array of tags
    score DECIMAL(5, 2) DEFAULT 0, -- recommendation score
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_deal_type (type),
    INDEX idx_deal_reference (reference_id),
    INDEX idx_deal_valid_until (valid_until),
    INDEX idx_deal_score (score),
    INDEX idx_deal_discount (discount)
) ENGINE=InnoDB;

-- Outbox table for exactly-once event publishing
CREATE TABLE outbox_events (
    id VARCHAR(36) PRIMARY KEY,
    aggregate_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSON NOT NULL,
    status ENUM('pending', 'published', 'failed') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    INDEX idx_outbox_status (status),
    INDEX idx_outbox_aggregate (aggregate_id),
    INDEX idx_outbox_created (created_at)
) ENGINE=InnoDB;

-- Idempotency keys table for preventing duplicate operations
CREATE TABLE idempotency_keys (
    `key` VARCHAR(255) PRIMARY KEY,
    response JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Flight reservations table for Saga pattern
CREATE TABLE flight_reservations (
    id VARCHAR(36) PRIMARY KEY,
    flight_id VARCHAR(36) NOT NULL,
    booking_id VARCHAR(36) NOT NULL,
    seats INT NOT NULL DEFAULT 1,
    status ENUM('pending', 'confirmed', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (flight_id) REFERENCES flights(id),
    INDEX idx_booking_id (booking_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- Hotel reservations table for Saga pattern
CREATE TABLE hotel_reservations (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    booking_id VARCHAR(36) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES hotel_rooms(id),
    INDEX idx_booking_id (booking_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- Car reservations table for Saga pattern
CREATE TABLE car_reservations (
    id VARCHAR(36) PRIMARY KEY,
    car_id VARCHAR(36) NOT NULL,
    booking_id VARCHAR(36) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES car_rentals(id),
    INDEX idx_booking_id (booking_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;
