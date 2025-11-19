export interface AirportMetadata {
  id: number;
  name: string;
  city: string;
  country: string;
  iata: string;
  icao?: string;
  latitude: number;
  longitude: number;
  elevationFt?: number;
  timezone?: string;
  tzOffsetHours?: number;
  dst?: string;
  type: string;
  source?: string;
  metroCode?: string;
  isoCountry?: string;
  region?: string;
  state?: string;
}
