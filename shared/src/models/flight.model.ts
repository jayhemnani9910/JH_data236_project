import { BaseModel } from './base.model';

export type Airline = 'AA' | 'DL' | 'UA' | 'WN' | 'AS' | 'BA' | 'LH' | 'AF';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';
export type CabinClass = 'economy' | 'premium' | 'business' | 'first';

export interface Price {
  amount: number;
  currency: Currency;
  originalAmount?: number;
  discount?: number;
}

export interface Flight extends BaseModel {
  airline: Airline;
  flightNumber: string;
  origin: string; // IATA code
  destination: string; // IATA code
  departureTime: Date;
  arrivalTime: Date;
  duration: number; // in minutes
  price: Price;
  seatsAvailable: number;
  aircraftType: string;
  stops: number;
  cabinClass: CabinClass;
  gate?: string;
  terminal?: string;
  baggageAllowance: {
    carryOn: number;
    checked: number;
  };
  amenities: string[];
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate?: Date;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  cabinClass?: CabinClass;
  maxStops?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  preferredAirlines?: Airline[];
  dateFlexibility?: 'exact' | 'flexible';
  sortBy?: 'price' | 'duration' | 'departure' | 'arrival';
  sortOrder?: 'asc' | 'desc';
}

export interface FlightFilter {
  departureTime?: {
    min: string;
    max: string;
  };
  arrivalTime?: {
    min: string;
    max: string;
  };
  airlines?: Airline[];
  stops?: number[];
  priceRange?: {
    min: number;
    max: number;
  };
}