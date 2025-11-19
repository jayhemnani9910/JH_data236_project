import { BaseModel } from './base.model';
import { User } from './user.model';
import { Booking } from './booking.model';

export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'stripe' | 'apple_pay' | 'google_pay';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface Payment extends BaseModel {
  userId: string;
  user: User;
  bookingId: string;
  booking: Booking;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentIntentId: string;
  transactionId?: string;
  status: PaymentStatus;
  metadata?: {
    last4?: string;
    brand?: string;
    country?: string;
  };
  refund?: {
    amount: number;
    reason: string;
    refundId: string;
    processedAt?: Date;
  };
  failureReason?: string;
  processingFee?: number;
  netAmount?: number;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentMethodId: string;
  savePaymentMethod?: boolean;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  paymentIntentId?: string;
  requiresAction?: boolean;
  clientSecret?: string;
  error?: string;
}

export interface RefundRequest {
  amount: number;
  reason: string;
  refundApplicationFee?: boolean;
}