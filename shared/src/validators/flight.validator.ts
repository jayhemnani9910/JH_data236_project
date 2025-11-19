import { FlightSearchParams } from '../models/flight.model';

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateFlightSearch(query: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (typeof query !== 'object' || query === null) {
    errors.root = 'Query must be an object';
    return { isValid: false, errors };
  }

  const params = query as Partial<FlightSearchParams>;

  // Required fields validation
  if (!params.origin?.trim()) {
    errors.origin = 'Origin airport code is required';
  } else if (!/^[A-Z]{3}$/.test(params.origin.trim())) {
    errors.origin = 'Origin must be a valid 3-letter IATA code';
  }

  if (!params.destination?.trim()) {
    errors.destination = 'Destination airport code is required';
  } else if (!/^[A-Z]{3}$/.test(params.destination.trim())) {
    errors.destination = 'Destination must be a valid 3-letter IATA code';
  }

  if (!params.departureDate) {
    errors.departureDate = 'Departure date is required';
  } else {
    const departureDate = new Date(params.departureDate);
    if (isNaN(departureDate.getTime())) {
      errors.departureDate = 'Invalid departure date format';
    } else if (departureDate < new Date()) {
      errors.departureDate = 'Departure date must be in the future';
    }
  }

  if (params.returnDate) {
    const returnDate = new Date(params.returnDate);
    if (isNaN(returnDate.getTime())) {
      errors.returnDate = 'Invalid return date format';
    } else if (params.departureDate && returnDate < new Date(params.departureDate)) {
      errors.returnDate = 'Return date must be after departure date';
    }
  }

  // Passengers validation
  if (!params.passengers) {
    errors.passengers = 'Passenger information is required';
  } else {
    const { adults = 0, children = 0, infants = 0 } = params.passengers;
    
    if (adults < 1 || adults > 9) {
      errors.adults = 'Number of adults must be between 1 and 9';
    }

    if (children < 0 || children > 9) {
      errors.children = 'Number of children must be between 0 and 9';
    }

    if (infants < 0 || infants > adults) {
      errors.infants = 'Number of infants cannot exceed number of adults';
    }

    if (adults + children + infants > 9) {
      errors.totalPassengers = 'Total passengers cannot exceed 9';
    }
  }

  // Price range validation
  if (params.priceRange) {
    const { min, max } = params.priceRange;
    if (min < 0 || max < 0) {
      errors.priceRange = 'Price range values must be positive';
    } else if (min > max) {
      errors.priceRange = 'Minimum price must be less than maximum price';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function isValidIATACode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code.trim());
}

export function isValidDateString(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}