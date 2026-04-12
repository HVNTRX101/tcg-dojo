import request from 'supertest';
import express, { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import reviewRoutes from '../../routes/reviewRoutes';
import { TestDataFactory } from '../../__tests__/helpers/factories';
import { generateAccessToken } from '../../utils/jwt';

const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/reviews', reviewRoutes);
  app.use((err: any, req: any, res: any, next: any) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
  return app;
};

describe('Review Controller Integration Tests', () => {
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

  describe('POST /api/reviews', () => {
    it('should create a review for a product', async () => {
      const user = await factory.createUser();
      const product = await factory.createProduct();
      const token = generateAccessToken({ userId: user.id, role: user.role, email: user.email });

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product.id,
          rating: 4,
          comment: 'Great card condition',
        })
        .expect(201);

      expect(response.body.message).toBe('Review created successfully');
      expect(response.body.review.rating).toBe(4);
      expect(response.body.review.moderationStatus).toBe('PENDING');
    });

    it('should not allow multiple reviews on the same product by the same user', async () => {
      const user = await factory.createUser();
      const product = await factory.createProduct();
      const token = generateAccessToken({ userId: user.id, role: user.role, email: user.email });

      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, rating: 5, comment: 'First' })
        .expect(201);

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product.id, rating: 4, comment: 'Second' })
        .expect(400);

      expect(response.body.error).toBe('You have already reviewed this item');
    });
  });

  describe('GET /api/reviews/product/:productId', () => {
    it('should fetch APPROVED reviews for a product', async () => {
      const product = await factory.createProduct();
      await factory.createReview(product.id, undefined, { moderationStatus: 'APPROVED', rating: 5 });
      await factory.createReview(product.id, undefined, { moderationStatus: 'PENDING', rating: 3 });

      const response = await request(app)
        .get(`/api/reviews/product/${product.id}`)
        .expect(200);

      expect(response.body.reviews).toHaveLength(1);
      expect(response.body.stats.averageRating).toBe(5);
    });
  });

  describe('PUT /api/reviews/:reviewId', () => {
    it('should update a review and reset moderation to PENDING', async () => {
      const user = await factory.createUser();
      const product = await factory.createProduct();
      const review = await factory.createReview(product.id, user.id, { moderationStatus: 'APPROVED', rating: 5 });
      const token = generateAccessToken({ userId: user.id, role: user.role, email: user.email });

      const response = await request(app)
        .put(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 4, comment: 'Updated comment' })
        .expect(200);

      expect(response.body.review.rating).toBe(4);
      expect(response.body.review.moderationStatus).toBe('PENDING');
    });
  });

  describe('DELETE /api/reviews/:reviewId', () => {
    it('should delete a review if owned by user', async () => {
      const user = await factory.createUser();
      const product = await factory.createProduct();
      const review = await factory.createReview(product.id, user.id);
      const token = generateAccessToken({ userId: user.id, role: user.role, email: user.email });

      await request(app)
        .delete(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should delete a review if acting as ADMIN', async () => {
      const user = await factory.createUser();
      const admin = await factory.createUser({ role: 'ADMIN' });
      const product = await factory.createProduct();
      const review = await factory.createReview(product.id, user.id);
      const token = generateAccessToken({ userId: admin.id, role: 'ADMIN', email: admin.email });

      await request(app)
        .delete(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Admin Moderation', () => {
    it('should allow Admin to moderate a review', async () => {
      const product = await factory.createProduct();
      const review = await factory.createReview(product.id, undefined, { moderationStatus: 'PENDING' });
      
      const admin = await factory.createUser({ role: 'ADMIN' });
      const adminToken = generateAccessToken({ userId: admin.id, role: admin.role, email: admin.email });

      const response = await request(app)
        .put(`/api/reviews/${review.id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED', notes: 'Looks good' })
        .expect(200);

      expect(response.body.review.moderationStatus).toBe('APPROVED');
    });
  });
});
