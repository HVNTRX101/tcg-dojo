import request from 'supertest';
import express, { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import productRoutes from '../../routes/productRoutes';
import { TestDataFactory } from '../../__tests__/helpers/factories';
import { generateAccessToken } from '../../utils/jwt';

const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productRoutes);
  // Add a simple error handler for catching AppError
  app.use((err: any, req: any, res: any, next: any) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
  return app;
};

describe('Product Controller Integration Tests', () => {
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

  describe('GET /api/products', () => {
    it('should paginate and return products', async () => {
      // Create some products
      await factory.createProduct();
      await factory.createProduct();
      
      const response = await request(app)
        .get('/api/products?page=1&limit=10')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.products.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter products by condition', async () => {
      const product = await factory.createProduct(undefined, { condition: 'MINT' });
      await factory.createProduct(undefined, { condition: 'POOR' });
      
      const response = await request(app)
        .get('/api/products?condition=MINT')
        .expect(200);

      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].id).toBe(product.id);
    });

    it('should filter products by price range', async () => {
      await factory.createProduct(undefined, { price: 50 });
      await factory.createProduct(undefined, { price: 150 });
      
      const response = await request(app)
        .get('/api/products?minPrice=100&maxPrice=200')
        .expect(200);

      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].price).toBe(150);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should fail 404 for a non-existing product', async () => {
      const response = await request(app)
        .get('/api/products/123e4567-e89b-12d3-a456-426614174000')
        .expect(404);
        
      expect(response.body.error).toBe('Product not found');
    });

    it('should return a specific product by ID', async () => {
      const product = await factory.createProduct();
      
      const response = await request(app)
        .get(`/api/products/${product.id}`)
        .expect(200);

      expect(response.body.product).toBeDefined();
      expect(response.body.product.id).toEqual(product.id);
    });
  });

  describe('POST /api/products', () => {
    it('should fail if user is not authorized', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          name: 'Unauthorized Product',
          price: 100,
          stock: 10,
          gameId: '123e4567-e89b-12d3-a456-426614174000'
        });
      // Should result in a 401 or similar from the auth middleware
      expect(response.status).toBe(401);
    });

    it('should create a product if user is a SELLER', async () => {
      const sellerUser = await factory.createUser({ role: 'SELLER' });
      const seller = await factory.createSeller(sellerUser.id);
      const game = await factory.createGame();
      const accessToken = generateAccessToken({ userId: sellerUser.id, role: 'SELLER', email: sellerUser.email });
      
      const payload = {
        name: 'New Product',
        price: 25.0,
        stock: 5,
        gameId: game.id,
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);
        
      expect(response.body.product.name).toBe('New Product');
      expect(response.body.product.sellerId).toBe(seller.id);
    });
  });
});
