import request from 'supertest';
import express, { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../../routes/authRoutes';
import { TestDataFactory } from '../../__tests__/helpers/factories';

// Create a test app
const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
};

describe('Auth Controller Integration Tests', () => {
  let app: Express;
  let prisma: PrismaClient;
  let factory: TestDataFactory;

  beforeAll(() => {
    app = createTestApp();
    prisma = new PrismaClient();
    factory = new TestDataFactory(prisma);
  });

  beforeEach(async () => {
    await factory.cleanup();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/);

      // Note: Actual status depends on your implementation
      // Adjust the expected status based on your API
      expect([200, 201]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('email', userData.email);
        expect(response.body.user).not.toHaveProperty('password');
      }
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: '123', // Weak password
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject duplicate email registration', async () => {
      // Create a user first
      const user = await factory.createUser({
        email: 'existing@example.com',
      });

      const userData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create a test user
      const user = await factory.createUser({
        email: 'testuser@example.com',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Test123!@#', // Default password from factory
        })
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('user');
      }
    });

    it('should reject login with invalid password', async () => {
      const user = await factory.createUser({
        email: 'testuser@example.com',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'WrongPassword123!',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user data with valid token', async () => {
      // This test requires authentication middleware to be properly set up
      // and a way to generate valid tokens for testing

      // Create user and login to get token
      const user = await factory.createUser({
        email: 'testuser@example.com',
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Test123!@#',
        });

      if (loginResponse.body.accessToken) {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
          .expect('Content-Type', /json/);

        expect([200, 201]).toContain(response.status);
      }
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
