import request from 'supertest';
import express, { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import userSettingsRoutes from '../../routes/userSettingsRoutes';
import { TestDataFactory } from '../../__tests__/helpers/factories';
import { generateAccessToken } from '../../utils/jwt';

const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/user/settings', userSettingsRoutes);
  app.use((err: any, req: any, res: any, next: any) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
  return app;
};

describe('User Settings Controller Integration Tests', () => {
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

  describe('GET /api/user/settings', () => {
    it('should return user settings, creating defaults if not exist', async () => {
      const user = await factory.createUser();
      const token = generateAccessToken({ userId: user.id, role: user.role, email: user.email });

      const response = await request(app)
        .get('/api/user/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.settings).toBeDefined();
      expect(response.body.settings.userId).toBe(user.id);
      expect(response.body.settings.language).toBe('en'); // Assuming default is 'en'
    });
  });

  describe('PUT /api/user/settings', () => {
    it('should update user settings', async () => {
      const user = await factory.createUser();
      const token = generateAccessToken({ userId: user.id, role: user.role, email: user.email });

      const payload = {
        language: 'fr',
        currency: 'EUR',
      };

      const response = await request(app)
        .put('/api/user/settings')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(200);

      expect(response.body.settings.language).toBe('fr');
      expect(response.body.settings.currency).toBe('EUR');
    });
  });

  describe('GET /api/user/settings/privacy', () => {
    it('should return privacy settings only', async () => {
      const user = await factory.createUser();
      const token = generateAccessToken({ userId: user.id, role: user.role, email: user.email });

      const response = await request(app)
        .get('/api/user/settings/privacy')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.privacy).toBeDefined();
      expect(response.body.privacy).toHaveProperty('profileIsPublic');
      expect(response.body.privacy).not.toHaveProperty('language'); // Should only be privacy fields
    });
  });

  describe('PUT /api/user/settings/privacy', () => {
    it('should update privacy settings explicitly', async () => {
      const user = await factory.createUser();
      const token = generateAccessToken({ userId: user.id, role: user.role, email: user.email });

      const response = await request(app)
        .put('/api/user/settings/privacy')
        .set('Authorization', `Bearer ${token}`)
        .send({ profileIsPublic: true })
        .expect(200);

      expect(response.body.privacy.profileIsPublic).toBe(true);
    });
  });
});
