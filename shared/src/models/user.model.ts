import { BaseModel } from './base.model';

export type UserRole = 'user' | 'admin' | 'partner';

export interface UserPreferences {
  maxPrice?: number;
  preferredDuration?: number; // in minutes
  preferredDepartureTime?: number; // hour of day (0-23)
  preferredAirlines?: string[];
  cabinClass?: 'economy' | 'premium' | 'business' | 'first';
  language?: string;
  currency?: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';
  newsletterSubscription?: boolean;
}

export interface User extends BaseModel {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  preferences?: UserPreferences;
  isEmailVerified: boolean;
  phoneNumber?: string;
  dateOfBirth?: Date;
  loyaltyPoints?: number;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  lastLoginAt?: Date;
  profile?: {
    avatar?: string;
    bio?: string;
    location?: string;
    timezone?: string;
  };
}

export interface UserAuth {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordResetRequest {
  email: string;
  code: string;
  expiresAt: Date;
}