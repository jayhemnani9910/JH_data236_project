export interface AirportMetadata {
  id: number;
  iata: string;
  icao?: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  isoCountry: string;
  latitude: number;
  longitude: number;
  elevationFt?: number;
  timezone?: string;
  tzOffsetHours?: number;
  dst?: string;
  type: string;
  source?: string;
  region?: string;
  metroCode?: string;
}

// Import generated airport data - this is built from data/airports.dat
import airportsGenerated from './airports.generated.json';

export const ALL_AIRPORTS: AirportMetadata[] = airportsGenerated as AirportMetadata[];

// Convenience export for US airports only
export const US_AIRPORTS: AirportMetadata[] = ALL_AIRPORTS.filter(
  (airport) => airport.country === 'United States' || airport.isoCountry === 'US'
);
