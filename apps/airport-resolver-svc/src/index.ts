/**
 * Airport Resolver Service
 * Provides autocomplete and airport resolution for search queries
 */

import express, { Request, Response } from 'express';
import { createClient } from 'redis';
import {
  searchAirports,
  resolveAirportQuery,
  getAirportByCode,
  getNearbyAirportCodes,
  formatAirportLabel,
  isLikelyAirportCode,
  generateTraceId
} from '@kayak/shared';

class AirportResolverService {
  private app: express.Application;
  private redis: any;
  private port: number = 8010;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.initializeRedis();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((req, res, next) => {
      const traceId = req.headers['x-trace-id'] as string || generateTraceId();
      (req as any).traceId = traceId;
      res.setHeader('X-Trace-Id', traceId);
      next();
    });
  }

  private async initializeRedis() {
    try {
      this.redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      await this.redis.connect();
      console.log('✅ Redis connected');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
    }
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          service: 'airport-resolver',
          timestamp: new Date().toISOString()
        }
      });
    });

    // Autocomplete/suggest airports
    this.app.get('/airports/suggest', this.suggestAirports.bind(this));
    
    // Resolve a single airport query to canonical code(s)
    this.app.get('/airports/resolve', this.resolveAirport.bind(this));
    
    // Get airport by code
    this.app.get('/airports/:code', this.getAirport.bind(this));
    
    // Get nearby airports
    this.app.get('/airports/:code/nearby', this.getNearbyAirports.bind(this));
  }

  private async suggestAirports(req: Request, res: Response) {
    try {
      const query = req.query.q as string;
      const maxResults = Math.min(Number(req.query.limit) || 8, 20);
      const includeNearby = req.query.nearby !== 'false';

      if (!query || query.trim().length < 2) {
        return res.json({
          success: true,
          data: { suggestions: [] },
          traceId: (req as any).traceId
        });
      }

      // Try cache first
      const cacheKey = `airport_suggest:${query.toLowerCase()}:${maxResults}:${includeNearby}`;
      if (this.redis && (this.redis as any).isReady) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return res.json({
            success: true,
            data: JSON.parse(cached),
            traceId: (req as any).traceId,
            cached: true
          });
        }
      }

      const matches = resolveAirportQuery(query, { maxResults, includeNearby });
      const suggestions = matches.map((match) => ({
        iata: match.airport.iata,
        icao: match.airport.icao,
        name: match.airport.name,
        city: match.airport.city,
        state: match.airport.state,
        country: match.airport.country,
        timezone: match.airport.timezone,
        latitude: match.airport.latitude,
        longitude: match.airport.longitude,
        metroCode: match.airport.metroCode,
        label: formatAirportLabel(match.airport),
        score: match.score,
        matchedField: match.matchedField
      }));

      const response = { suggestions };

      // Cache for 1 hour
      if (this.redis && (this.redis as any).isReady) {
        await this.redis.setEx(cacheKey, 3600, JSON.stringify(response));
      }

      res.json({
        success: true,
        data: response,
        traceId: (req as any).traceId
      });
    } catch (error: any) {
      console.error('Airport suggest error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          traceId: (req as any).traceId
        }
      });
    }
  }

  private async resolveAirport(req: Request, res: Response) {
    try {
      const query = req.query.q as string;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: 'Query parameter "q" is required',
            traceId: (req as any).traceId
          }
        });
      }

      // If it looks like an airport code, try exact match first
      if (isLikelyAirportCode(query)) {
        const airport = getAirportByCode(query);
        if (airport) {
          return res.json({
            success: true,
            data: {
              primary: airport.iata,
              alternatives: getNearbyAirportCodes(airport.iata),
              airport: {
                iata: airport.iata,
                icao: airport.icao,
                name: airport.name,
                city: airport.city,
                state: airport.state,
                country: airport.country,
                timezone: airport.timezone,
                latitude: airport.latitude,
                longitude: airport.longitude,
                metroCode: airport.metroCode
              }
            },
            traceId: (req as any).traceId
          });
        }
      }

      // Otherwise search
      const matches = resolveAirportQuery(query, { maxResults: 1, includeNearby: true });
      if (matches.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No airports found matching query',
            traceId: (req as any).traceId
          }
        });
      }

      const primary = matches[0].airport;
      res.json({
        success: true,
        data: {
          primary: primary.iata,
          alternatives: getNearbyAirportCodes(primary.iata),
          airport: {
            iata: primary.iata,
            icao: primary.icao,
            name: primary.name,
            city: primary.city,
            state: primary.state,
            country: primary.country,
            timezone: primary.timezone,
            latitude: primary.latitude,
            longitude: primary.longitude,
            metroCode: primary.metroCode
          }
        },
        traceId: (req as any).traceId
      });
    } catch (error: any) {
      console.error('Airport resolve error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          traceId: (req as any).traceId
        }
      });
    }
  }

  private async getAirport(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const airport = getAirportByCode(code);

      if (!airport) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Airport ${code} not found`,
            traceId: (req as any).traceId
          }
        });
      }

      res.json({
        success: true,
        data: {
          iata: airport.iata,
          icao: airport.icao,
          name: airport.name,
          city: airport.city,
          state: airport.state,
          country: airport.country,
          timezone: airport.timezone,
          latitude: airport.latitude,
          longitude: airport.longitude,
          metroCode: airport.metroCode,
          elevationFt: airport.elevationFt
        },
        traceId: (req as any).traceId
      });
    } catch (error: any) {
      console.error('Get airport error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          traceId: (req as any).traceId
        }
      });
    }
  }

  private async getNearbyAirports(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const airport = getAirportByCode(code);

      if (!airport) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Airport ${code} not found`,
            traceId: (req as any).traceId
          }
        });
      }

      const nearbyIatas = getNearbyAirportCodes(code);
      const nearbyAirports = nearbyIatas
        .map((iata) => getAirportByCode(iata))
        .filter((a): a is NonNullable<typeof a> => a !== undefined)
        .map((a) => ({
          iata: a.iata,
          icao: a.icao,
          name: a.name,
          city: a.city,
          state: a.state,
          country: a.country,
          timezone: a.timezone,
          latitude: a.latitude,
          longitude: a.longitude,
          metroCode: a.metroCode
        }));

      res.json({
        success: true,
        data: { airports: nearbyAirports },
        traceId: (req as any).traceId
      });
    } catch (error: any) {
      console.error('Get nearby airports error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          traceId: (req as any).traceId
        }
      });
    }
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Airport Resolver Service listening on port ${this.port}`);
      console.log(`📍 Health check: http://localhost:${this.port}/health`);
    });
  }
}

// Start the service
const service = new AirportResolverService();
service.start();

export default service;
