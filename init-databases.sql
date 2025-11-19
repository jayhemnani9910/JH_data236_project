-- Initialize MySQL database with sample data
USE kayak;

-- Insert sample flights
INSERT INTO flights (id, airline, flight_number, origin_airport_code, destination_airport_code, departure_time, arrival_time, duration_minutes, aircraft, price, available_seats, class) VALUES
('flight-001', 'Delta Airlines', 'DL123', 'JFK', 'LAX', '2024-12-15 08:00:00', '2024-12-15 11:30:00', 330, 'Boeing 737', 299.99, 150, 'economy'),
('flight-002', 'United Airlines', 'UA456', 'JFK', 'LAX', '2024-12-15 14:00:00', '2024-12-15 17:30:00', 330, 'Airbus A320', 349.99, 120, 'economy'),
('flight-003', 'American Airlines', 'AA789', 'LAX', 'JFK', '2024-12-16 09:00:00', '2024-12-16 17:30:00', 330, 'Boeing 737', 279.99, 180, 'economy'),
('flight-004', 'JetBlue', 'B6101', 'BOS', 'MIA', '2024-12-15 07:00:00', '2024-12-15 10:30:00', 210, 'Airbus A321', 199.99, 200, 'economy'),
('flight-005', 'Southwest', 'WN202', 'DEN', 'SEA', '2024-12-15 12:00:00', '2024-12-15 14:45:00', 165, 'Boeing 737', 249.99, 160, 'economy'),
('flight-006', 'Delta Airlines', 'DL999', 'JFK', 'LAX', '2025-12-01 08:00:00', '2025-12-01 11:30:00', 330, 'Boeing 737', 320.50, 150, 'economy'),
('flight-007', 'United Airlines', 'UA888', 'JFK', 'LAX', '2025-12-01 14:00:00', '2025-12-01 17:30:00', 330, 'Airbus A320', 355.00, 120, 'economy'),
('flight-008', 'American Airlines', 'AA777', 'LAX', 'JFK', '2025-12-05 09:00:00', '2025-12-05 17:30:00', 330, 'Boeing 737', 285.00, 180, 'economy'),
('flight-009', 'British Airways', 'BA111', 'LHR', 'JFK', '2025-12-01 10:00:00', '2025-12-01 13:00:00', 480, 'Boeing 777', 600.00, 250, 'economy'),
('flight-010', 'Air France', 'AF222', 'CDG', 'JFK', '2025-12-01 11:00:00', '2025-12-01 14:00:00', 500, 'Airbus A350', 580.00, 280, 'economy');

-- Insert sample hotels
INSERT INTO hotels (id, name, description, star_rating, address_street, address_city, address_state, address_zip_code, average_price) VALUES
('hotel-001', 'Grand Plaza Hotel', 'Luxury hotel in downtown', 5, '123 Main St', 'Los Angeles', 'CA', '90210', 299.99),
('hotel-002', 'Comfort Inn', 'Budget-friendly accommodation', 3, '456 Oak Ave', 'New York', 'NY', '10001', 129.99),
('hotel-003', 'Marriott Downtown', 'Business hotel with conference facilities', 4, '789 Business Blvd', 'Chicago', 'IL', '60601', 219.99),
('hotel-004', 'Hilton Garden Inn', 'Family-friendly hotel with pool', 4, '321 Family Way', 'Miami', 'FL', '33101', 189.99),
('hotel-005', 'Holiday Inn Express', 'Convenient airport location', 3, '654 Airport Rd', 'Denver', 'CO', '80202', 149.99);

-- Insert sample car rentals
INSERT INTO car_rentals (id, vendor, location_code, location_name, vehicle_type, make, model, year, transmission, fuel_type, seats, doors, daily_rate) VALUES
('car-001', 'Hertz', 'LAX', 'Los Angeles Airport', 'Economy', 'Toyota', 'Corolla', 2023, 'automatic', 'gasoline', 5, 4, 45.99),
('car-002', 'Enterprise', 'JFK', 'John F. Kennedy Airport', 'SUV', 'Ford', 'Explorer', 2023, 'automatic', 'gasoline', 7, 4, 89.99),
('car-003', 'Avis', 'MIA', 'Miami International Airport', 'Luxury', 'BMW', '5 Series', 2023, 'automatic', 'gasoline', 5, 4, 129.99),
('car-004', 'Budget', 'ORD', 'Chicago O\'Hare Airport', 'Compact', 'Honda', 'Civic', 2023, 'automatic', 'gasoline', 5, 4, 55.99),
('car-005', 'National', 'DEN', 'Denver International Airport', 'Mid-size', 'Chevrolet', 'Malibu', 2023, 'automatic', 'gasoline', 5, 4, 69.99);

-- Insert sample users
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, date_of_birth, role) VALUES
('user-001', 'demo@kayakclone.com', 'b02IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo', 'User', '+1234567890', '1990-01-01', 'user'),
('user-002', 'admin@kayakclone.com', 'b02IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', '+1234567891', '1985-06-15', 'admin');

-- Insert sample admin user
INSERT INTO admin_users (id, email, password_hash, role, permissions) VALUES
('admin-001', 'admin@kayakclone.com', 'b02IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '["read:users", "write:users", "read:bookings", "write:bookings"]');

