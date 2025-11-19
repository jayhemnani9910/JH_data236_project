import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
const request = require('supertest');
const { app } = require('../index');

describe('User Service Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    // In production, this would use a separate test database
  });

  afterAll(async () => {
    // Cleanup test database
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should reject registration with duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'SecurePassword123!',
        firstName: 'Jane',
        lastName: 'Doe'
      };

      // First registration should succeed
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Password must be at least 8 characters');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid email format');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      // First register a user
      const registerData = {
        email: 'login@example.com',
        password: 'SecurePassword123!',
        firstName: 'Login',
        lastName: 'Test'
      };

      await request(app)
        .post('/auth/register')
        .send(registerData);

      // Then login
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'SecurePassword123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /users/:id', () => {
    it('should get user by ID', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .get(`/users/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', userId);
    });

    it('should return 404 for non-existent user', async () => {
      const userId = 'non-existent-user';

      const response = await request(app)
        .get(`/users/${userId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user information', async () => {
      const userId = 'user-123';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+9876543210'
      };

      const response = await request(app)
        .put(`/users/${userId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Updated');
      expect(response.body.data.phone).toBe('+9876543210');
    });

    it('should return 404 for updating non-existent user', async () => {
      const userId = 'non-existent-user';
      const updateData = { firstName: 'Updated' };

      const response = await request(app)
        .put(`/users/${userId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user successfully', async () => {
      const userId = 'user-to-delete';

      const response = await request(app)
        .delete(`/users/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('deleted successfully');
    });
  });

  describe('GET /users', () => {
    it('should search users with pagination', async () => {
      const response = await request(app)
        .get('/users?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    it('should search users by query', async () => {
      const response = await request(app)
        .get('/users?query=john')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /users/validate', () => {
    it('should validate user data successfully', async () => {
      const validationData = {
        email: 'valid@example.com',
        ssn: '123-45-6789',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/users/validate')
        .send(validationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid data', async () => {
      const validationData = {
        email: 'invalid-email',
        ssn: 'invalid-ssn'
      };

      const response = await request(app)
        .post('/users/validate')
        .send(validationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.service).toBe('user-svc');
    });
  });
});
