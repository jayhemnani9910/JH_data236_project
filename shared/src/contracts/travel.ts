// Common types used across services
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * Flight service contracts
 */

/**
 * Flight service contracts
 */
export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  origin: Airport;
  destination: Airport;
  departureTime: string;
  arrivalTime: string;
  duration: number; // minutes
  aircraft: string;
  price: number;
  currency: string;
  availableSeats: number;
  class: 'economy' | 'business' | 'first';
  amenities: string[];
  bookingClass: string;
  refundable: boolean;
  changeable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Airport {
  code: string; // IATA code
  name: string;
  city: string;
  state?: string;
  country: string;
  timezone: string;
}

export interface FlightSearchRequest {
  origin: string; // IATA code
  destination: string; // IATA code
  departureDate: string;
  returnDate?: string;
  passengers: number;
  class?: 'economy' | 'business' | 'first';
  directOnly?: boolean;
  maxPrice?: number;
  airlines?: string[];
}

export interface FlightSearchResponse {
  flights: Flight[];
  searchId: string;
  totalResults: number;
  filters: {
    airlines: { code: string; name: string; count: number }[];
    priceRange: { min: number; max: number; avg: number };
    duration: { min: number; max: number; avg: number };
    stops: { direct: number; oneStop: number; multiStop: number };
  };
}

/**
 * Hotel service contracts
 */
export interface Hotel {
  id: string;
  name: string;
  description: string;
  address: Address;
  starRating: number; // 1-5
  images: string[];
  amenities: string[];
  policies: {
    checkIn: string;
    checkOut: string;
    petsAllowed: boolean;
    cancellationPolicy: string;
  };
  averagePrice: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotelRoom {
  id: string;
  hotelId: string;
  type: string;
  description: string;
  maxOccupancy: number;
  beds: string;
  amenities: string[];
  images: string[];
  pricePerNight: number;
  currency: string;
  available: boolean;
}

export interface HotelSearchRequest {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  rooms?: number;
  minPrice?: number;
  maxPrice?: number;
  starRating?: number[];
  amenities?: string[];
  sortBy?: 'price' | 'rating' | 'distance' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export interface HotelSearchResponse {
  hotels: HotelRoom[];
  searchId: string;
  totalResults: number;
  filters: {
    priceRange: { min: number; max: number; avg: number };
    starRatings: { rating: number; count: number }[];
    amenities: { name: string; count: number }[];
  };
}

/**
 * Car rental service contracts
 */
export interface CarRental {
  id: string;
  vendor: string;
  location: Location;
  vehicleType: string;
  make: string;
  model: string;
  year: number;
  transmission: 'automatic' | 'manual';
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  seats: number;
  doors: number;
  airConditioning: boolean;
  dailyRate: number;
  currency: string;
  available: boolean;
  images: string[];
  policies: {
    minimumAge: number;
    mileagePolicy: string;
    fuelPolicy: string;
    insurance: string;
  };
}

export interface Location {
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface CarSearchRequest {
  pickupLocation: string;
  dropoffLocation?: string;
  pickupDate: string;
  dropoffDate: string;
  driverAge?: number;
  carType?: string[];
  transmission?: 'automatic' | 'manual';
  maxPrice?: number;
  sortBy?: 'price' | 'rating' | 'distance';
  sortOrder?: 'asc' | 'desc';
}

export interface CarSearchResponse {
  cars: CarRental[];
  searchId: string;
  totalResults: number;
  filters: {
    priceRange: { min: number; max: number; avg: number };
    carTypes: { type: string; count: number }[];
    vendors: { name: string; count: number }[];
    transmission: { type: 'automatic' | 'manual'; count: number }[];
  };
}