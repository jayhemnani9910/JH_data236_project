/**
 * Common types used across all services
 */

export interface Address {
  street: string;
  city: string;
  state: string; // US state code
  zipCode: string; // ##### or #####-####
  country: string;
}

export interface Location {
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}