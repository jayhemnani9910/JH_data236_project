/**
 * Missing services directory structure
 * These services need to be implemented for full functionality
 */

// Cars Service
export interface CarSearchRequest {
  pickupLocation: string;
  dropoffLocation?: string;
  pickupDate: string;
  dropoffDate: string;
  driverAge?: number;
  carType?: string[];
  transmission?: 'automatic' | 'manual';
  maxPrice?: number;
}

// Billing Service
export interface CreatePaymentRequest {
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  paymentDetails: any;
}

// Admin Service
export interface AdminStats {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
}

// Concierge Service - Already implemented with WebSocket support
export interface BundleRequest {
  origin?: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  budget: number;
  preferences: {
    flightClass?: 'economy' | 'business';
    hotelStarRating?: number[];
    carType?: string[];
    maxFlightDuration?: number;
  };
  constraints: {
    adults: number;
    children?: number;
    rooms?: number;
  };
}