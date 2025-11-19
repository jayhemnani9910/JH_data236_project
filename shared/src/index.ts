// Export basic models and contracts
export { Address, Location } from './models/common';
export { HealthCheck, ApiResponse, generateTraceId } from './contracts/common';
export type { User as UserContract } from './contracts/user';
export { User, CreateUserRequest, UpdateUserRequest } from './contracts/user';
export { Flight, Hotel, CarRental } from './contracts/travel';
export { FlightSearchRequest, FlightSearchResponse, HotelSearchRequest, HotelSearchResponse, CarSearchRequest, CarSearchResponse } from './contracts/travel';
export { Booking, Payment } from './contracts/booking';
export { ValidationError, US_STATES, US_STATES_FULL, validateSSN, validateState, validateZipCode, validateEmail, validatePhone, validateAddress, generateIdempotencyKey } from './validators/common';
export { DealEvent, PaymentEvent, BookingConfirmationEvent, PaymentConfirmationEvent, DealAlertEvent } from './contracts/events';
export type { AirportMetadata } from './data/us-airports';
export { US_AIRPORTS, ALL_AIRPORTS } from './data/us-airports';
export type { AirportMatch } from './lib/airports';
export {
	formatAirportLabel,
	searchAirports,
	resolveAirportQuery,
	getAirportByCode,
	getNearbyAirportCodes,
	isLikelyAirportCode
} from './lib/airports';
