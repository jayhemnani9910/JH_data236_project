/**
 * Canonical Event Schemas for Kafka messaging
 * All services must produce and consume events matching these schemas
 */

/**
 * Deal Event - emitted by deals-worker, consumed by concierge and inventory services
 */
export interface DealEvent {
  event_type: 'deal_created' | 'deal_updated' | 'deal_expired';
  deal_id: string;
  type: 'flight' | 'hotel' | 'car' | 'package';
  destination?: string; // Destination city or airport code
  route?: string; // Flight route (e.g., "SFO-JFK") or null for hotels/cars
  summary?: string; // Human-readable summary (e.g., "United SFO-JFK")
  reference_id?: string; // ID of the flight/hotel/car (optional for backwards compatibility)
  price: {
    original: number;
    deal: number;
    discount: number; // percentage
  };
  score: number; // AI-generated score (0-100)
  tags: string[]; // e.g., ['popular', 'limited-time', 'best-value']
  valid_until: string; // ISO timestamp
  inventory?: number; // Available seats/rooms/cars
  timestamp: string; // ISO timestamp when event was created
}

/**
 * Payment Event - emitted by billing-svc, consumed by booking-svc
 */
export interface PaymentEvent {
  event_type: 'payment_succeeded' | 'payment_failed' | 'payment_refunded';
  payment_id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency: string;
  stripe_payment_intent_id: string;
  timestamp: string; // ISO timestamp
  metadata?: Record<string, any>;
}

/**
 * Booking Confirmation Event - emitted by booking-svc, consumed by notification-svc
 */
export interface BookingConfirmationEvent {
  event_type: 'booking_confirmed';
  booking_id: string;
  user_id: string;
  confirmation_number: string;
  total_amount: number;
  currency: string;
  items: Array<{
    type: 'flight' | 'hotel' | 'car';
    reference_id: string;
    quantity: number;
    price: number;
  }>;
  timestamp: string; // ISO timestamp
}

/**
 * Payment Confirmation Event - emitted by billing-svc, consumed by notification-svc
 */
export interface PaymentConfirmationEvent {
  event_type: 'payment_confirmed';
  payment_id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  timestamp: string; // ISO timestamp
}

/**
 * Deal Alert Event - emitted by concierge-svc, consumed by notification-svc
 */
export interface DealAlertEvent {
  event_type: 'deal_alert';
  user_id: string;
  watch_id: string;
  deal_id: string;
  type: 'flight' | 'hotel' | 'car';
  destination: string;
  price: {
    current: number;
    threshold: number;
    savings: number;
  };
  timestamp: string; // ISO timestamp
}
