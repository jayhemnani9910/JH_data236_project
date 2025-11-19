// Import types from travel module
import { Flight, HotelRoom, CarRental } from './travel';

/**
 * Booking service contracts
 */
export interface Booking {
  id: string;
  userId: string;
  type: 'flight' | 'hotel' | 'car' | 'package';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  items: BookingItem[];
  totalAmount: number;
  currency: string;
  paymentId?: string;
  confirmationNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingItem {
  id: string;
  type: 'flight' | 'hotel' | 'car';
  referenceId: string; // flight_id, hotel_id, car_id
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  details: any; // flexible for different item types
}

export interface CreateBookingRequest {
  userId: string;
  type: 'flight' | 'hotel' | 'car' | 'package';
  items: Omit<BookingItem, 'id' | 'totalPrice'>[];
  idempotencyKey?: string;
}

export interface BookingResponse {
  booking: Booking;
  paymentRequired: boolean;
  paymentUrl?: string;
}

/**
 * Billing service contracts
 */
export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  transactionId?: string;
  paymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingRecord {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  type: 'charge' | 'refund' | 'partial_refund';
  status: 'completed' | 'pending' | 'failed';
  paymentId?: string;
  description: string;
  createdAt: string;
}

export interface CreatePaymentRequest {
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  paymentDetails: any; // card details, etc.
  idempotencyKey?: string;
}

/**
 * Admin service contracts
 */
export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'moderator' | 'support';
  permissions: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  topDestinations: { destination: string; count: number }[];
  bookingsByType: { type: string; count: number; revenue: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}

export interface CreateListingRequest {
  type: 'flight' | 'hotel' | 'car';
  data: any; // flexible for different listing types
}

export interface UpdateListingRequest {
  id: string;
  type: 'flight' | 'hotel' | 'car';
  data: any;
}

/**
 * Deals and recommendations contracts
 */
export interface Deal {
  id: string;
  type: 'flight' | 'hotel' | 'car' | 'package';
  referenceId: string;
  originalPrice: number;
  dealPrice: number;
  discount: number; // percentage
  currency: string;
  validUntil: string;
  conditions: string[];
  tags: string[];
  score: number; // recommendation score
  createdAt: string;
}

export interface DealScore {
  dealId: string;
  score: number;
  factors: {
    priceDrop: number;
    availability: number;
    timing: number;
    popularity: number;
  };
  explanation: string;
}

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

export interface Bundle {
  id: string;
  components: {
    flight?: Flight;
    hotel?: HotelRoom;
    car?: CarRental;
  };
  totalPrice: number;
  savings: number;
  fitScore: number;
  explanation: string;
  validUntil: string;
}

export interface WebSocketMessage {
  type: 'deal_alert' | 'price_watch' | 'booking_update' | 'system_notification';
  data: any;
  timestamp: string;
  userId?: string;
}