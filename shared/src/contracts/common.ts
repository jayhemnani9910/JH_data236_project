/**
 * Common response patterns for all services
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  traceId?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
  traceId?: string;
}

/**
 * Common error codes
 */
export enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  IDEMPOTENCY_CONFLICT = 'IDEMPOTENCY_CONFLICT'
}

/**
 * Common request headers
 */
export interface RequestHeaders {
  'X-Trace-Id'?: string;
  'X-Idempotency-Key'?: string;
  'Authorization'?: string;
  'Content-Type'?: string;
}

/**
 * Health check response
 */
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  checks: {
    database?: 'healthy' | 'unhealthy';
    cache?: 'healthy' | 'unhealthy';
    queue?: 'healthy' | 'unhealthy';
  };
}

export function generateTraceId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}