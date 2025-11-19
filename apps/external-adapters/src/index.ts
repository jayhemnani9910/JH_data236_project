/**
 * External API Adapters for Travel Services
 * Amadeus (Flights), Booking.com (Hotels), etc.
 */

import express from 'express';
import axios, { AxiosInstance } from 'axios';

// Retry utility with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const shouldRetry = !isLastAttempt && 
                       (error.code === 'ECONNRESET' || 
                        error.code === 'ECONNREFUSED' ||
                        error.response?.status >= 500 ||
                        error.response?.status === 429);

      if (!shouldRetry) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
}

export interface HotelSearchParams {
  city: string;
  checkinDate: string;
  checkoutDate: string;
  adults: number;
  rooms: number;
  priceRange?: { min: number; max: number };
  starRating?: number[];
  amenities?: string[];
}

export class AmadeusAdapter {
  private client: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY || '';
    this.apiSecret = process.env.AMADEUS_API_SECRET || '';
    
    this.client = axios.create({
      baseURL: 'https://test.api.amadeus.com',
      timeout: 10000
    });
  }

  async getAccessToken(): Promise<string> {
    return retryWithBackoff(async () => {
      const response = await this.client.post('/v1/security/oauth2/token', 
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.apiSecret
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      
      if (!response.data.access_token) {
        throw new Error('No access token received from Amadeus API');
      }
      
      return response.data.access_token;
    }, 3, 1000);
  }

  async searchFlights(params: FlightSearchParams): Promise<any[]> {
    return retryWithBackoff(async () => {
      const token = await this.getAccessToken();
      
      const response = await this.client.get('/v2/shopping/flight-offers', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          originLocationCode: params.origin,
          destinationLocationCode: params.destination,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          adults: params.adults,
          children: params.children || 0,
          travelClass: params.travelClass || 'ECONOMY',
          max: 50
        },
        timeout: 15000
      });

      if (!response.data.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from Amadeus API');
      }

      // Transform Amadeus response to our format
      return response.data.data.map((offer: any) => ({
        id: offer.id,
        price: {
          total: parseFloat(offer.price.total),
          currency: offer.price.currency
        },
        itineraries: offer.itineraries.map((itinerary: any) => ({
          duration: itinerary.duration,
          segments: itinerary.segments.map((segment: any) => ({
            departure: {
              iataCode: segment.departure.iataCode,
              at: segment.departure.at
            },
            arrival: {
              iataCode: segment.arrival.iataCode,
              at: segment.arrival.at
            },
            carrierCode: segment.carrierCode,
            number: segment.number,
            aircraft: segment.aircraft
          }))
        }))
      }));
    }, 3, 2000).catch((error: any) => {
      console.error('Amadeus flight search error after retries:', error.response?.data || error.message);
      throw new Error(`Failed to search flights via Amadeus: ${error.message}`);
    });
  }

  async getAirportInfo(iataCode: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      
      const response = await this.client.get('/v1/reference-data/locations', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          subType: 'AIRPORT',
          keyword: iataCode,
          page: { limit: 1 }
        }
      });

      return response.data.data[0] || null;
    } catch (error) {
      console.error('Amadeus airport info error:', error);
      return null;
    }
  }
}

export class BookingComAdapter {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.BOOKING_COM_API_KEY || '';
    
    this.client = axios.create({
      baseURL: 'https://distribution-xml.booking.com',
      timeout: 10000
    });
  }

  async searchHotels(params: HotelSearchParams): Promise<any[]> {
    try {
      // Note: Booking.com API requires XML requests in many cases
      // This is a simplified REST example
      const response = await this.client.get('/hotels', {
        params: {
          dest_type: 'city',
          dest_id: params.city,
          checkin_date: params.checkinDate,
          checkout_date: params.checkoutDate,
          adults_number: params.adults,
          room_number: params.rooms,
          order_by: 'price',
          filter_by_currency: 'USD'
        },
        headers: {
          'X-Booking-ApiKey': this.apiKey
        }
      });

      return response.data.hotels.map((hotel: any) => ({
        id: hotel.hotel_id,
        name: hotel.hotel_name,
        address: hotel.address,
        city: hotel.city,
        country: hotel.country,
        starRating: hotel.class,
        price: {
          amount: hotel.min_total_price,
          currency: hotel.currency
        },
        amenities: hotel.hotel_facilities || [],
        photos: hotel.photos?.map((photo: any) => photo.url_max) || []
      }));
    } catch (error: any) {
      console.error('Booking.com hotel search error:', error.response?.data || error.message);
      throw new Error('Failed to search hotels via Booking.com');
    }
  }

  async getHotelDetails(hotelId: string): Promise<any> {
    try {
      const response = await this.client.get(`/hotels/${hotelId}`, {
        headers: {
          'X-Booking-ApiKey': this.apiKey
        }
      });

      return {
        id: response.data.hotel_id,
        name: response.data.hotel_name,
        description: response.data.hotel_description,
        address: response.data.address,
        amenities: response.data.hotel_facilities,
        photos: response.data.photos?.map((photo: any) => photo.url_max) || [],
        rooms: response.data.room_info || []
      };
    } catch (error) {
      console.error('Booking.com hotel details error:', error);
      throw new Error('Failed to get hotel details from Booking.com');
    }
  }
}

export class ExternalAPIService {
  private amadeus: AmadeusAdapter;
  private booking: BookingComAdapter;
  private app: express.Application;
  private port: number = 8010;

  constructor() {
    this.app = express();
    this.amadeus = new AmadeusAdapter();
    this.booking = new BookingComAdapter();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request tracing
    this.app.use((req, res, next) => {
      const traceId = req.headers['x-trace-id'] as string || `ext-${Date.now()}`;
      (req as any).traceId = traceId;
      res.setHeader('X-Trace-Id', traceId);
      next();
    });

    // Error handling middleware
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('External API Service error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error in external API service',
          traceId: (req as any).traceId
        }
      });
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'external-adapters',
        adapters: {
          amadeus: !!this.amadeus,
          booking: !!this.booking
        }
      });
    });

    // Flight search
    this.app.post('/flights/search', async (req, res) => {
      try {
        const searchParams: FlightSearchParams = req.body;
        const results = await this.amadeus.searchFlights(searchParams);
        res.json({
          success: true,
          data: results,
          traceId: (req as any).traceId
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: {
            code: 'FLIGHT_SEARCH_FAILED',
            message: error.message,
            traceId: (req as any).traceId
          }
        });
      }
    });

    // Hotel search
    this.app.post('/hotels/search', async (req, res) => {
      try {
        const searchParams: HotelSearchParams = req.body;
        const results = await this.booking.searchHotels(searchParams);
        res.json({
          success: true,
          data: results,
          traceId: (req as any).traceId
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: {
            code: 'HOTEL_SEARCH_FAILED',
            message: error.message,
            traceId: (req as any).traceId
          }
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
          traceId: (req as any).traceId
        }
      });
    });
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 External API Service listening on port ${this.port}`);
      console.log('📍 Health check: http://localhost:${this.port}/health');
      console.log('📡 Amadeus adapter:', this.amadeus ? '✅ Active' : '❌ Inactive');
      console.log('🏨 Booking.com adapter:', this.booking ? '✅ Active' : '❌ Inactive');
    });
  }
}

// Start the service
const apiService = new ExternalAPIService();
apiService.start();
