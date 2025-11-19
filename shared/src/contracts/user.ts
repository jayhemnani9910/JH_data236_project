/**
 * User service contracts
 */
import { Address } from '../models/common';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  ssn?: string; // Format: ###-##-####
  dateOfBirth?: string;
  address?: Address;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Address is defined in travel.ts to avoid circular dependencies

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  ssn?: string;
  dateOfBirth?: string;
  address?: Address;
  password?: string;
  profileImageUrl?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  id: string;
}

export interface UserSearchRequest {
  query?: string;
  city?: string;
  state?: string;
  page?: number;
  limit?: number;
}

export interface UserValidationRequest {
  email?: string;
  ssn?: string;
  phone?: string;
}

export interface UserValidationResult {
  valid: boolean;
  errors: string[];
}
