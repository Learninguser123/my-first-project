const request = require('supertest');
const app = require('../../dist/index').default;
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

describe('Authentication Integration Tests', () => {
  let pool;
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Initialize test database connection
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:testpass@localhost:5432/hvv_test'
    });

    // Clean up existing test data
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%test%']);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%test%']);
    
    // Close database connection
    await pool.end();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        phone: '+491234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(newUser.email);
      expect(response.body.user).not.toHaveProperty('password');

      // Store test user for subsequent tests
      testUser = response.body.user;
    });

    it('should reject registration with invalid email', async () => {
      const invalidUser = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const weakPasswordUser = {
        email: 'weak@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    it('should reject duplicate email registration', async () => {
      const duplicateUser = {
        email: 'test@example.com',
        password: 'AnotherPassword123!',
        firstName: 'Another',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUser)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(credentials.email);
      expect(response.body.user).not.toHaveProperty('password');

      // Store auth token for subsequent tests
      authToken = response.body.token;
    });

    it('should reject login with invalid credentials', async () => {
      const invalidCredentials = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidCredentials)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('credentials');
    });

    it('should reject login for non-existent user', async () => {
      const nonExistentUser = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(nonExistentUser)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('credentials');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).toHaveProperty('firstName', 'Test');
      expect(response.body.user).toHaveProperty('lastName', 'User');
    });

    it('should reject profile access without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });

    it('should reject profile access with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update user profile with valid token', async () => {
      const updatedProfile = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+491111111111'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedProfile)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body.user.firstName).toBe(updatedProfile.firstName);
      expect(response.body.user.lastName).toBe(updatedProfile.lastName);
      expect(response.body.user.phone).toBe(updatedProfile.phone);
    });

    it('should reject profile update without token', async () => {
      const updatedProfile = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .send(updatedProfile)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      const passwordChange = {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewPassword456!'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordChange)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Password changed successfully');

      // Test login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'NewPassword456!'
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
    });

    it('should reject password change with invalid current password', async () => {
      const passwordChange = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword456!'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordChange)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('current password');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });
  });

  describe('Password Reset Flow', () => {
    it('should request password reset for existing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Password reset email sent');
    });

    it('should handle password reset for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200); // Still return 200 for security

      expect(response.body).toHaveProperty('message', 'Password reset email sent');
    });
  });
});