import { BaseModel } from './base.model';
import { Flight } from './flight.model';
import { User } from './user.model';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Passenger {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth: Date;
  passportNumber?: string;
  passportExpiry?: Date;
  nationality?: string;
  seatPreference?: string;
  mealPreference?: string;
}

export interface Booking extends BaseModel {
  userId: string;
  user: User;
  flightId: string;
  flight: Flight;
  passengers: Passenger[];
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  currency: string;
  bookingReference: string;
  confirmationNumber: string;
  bookingDate: Date;
  departureDate: Date;
  returnDate?: Date;
  paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'stripe';
  paymentIntentId?: string;
  ticketNumbers?: string[];
  baggage: {
    carryOn: number;
    checked: number;
  };
  seatAssignments?: {
    passengerId: string;
    seatNumber: string;
  }[];
  specialRequests?: string[];
  cancellationPolicy: {
    refundable: boolean;
    cancellationDeadline?: Date;
    cancellationFee?: number;
  };
  invoice?: {
    url: string;
    downloadUrl: string;
  };
}