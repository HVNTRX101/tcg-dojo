import request from 'supertest';
import express, { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import productRoutes from '../../routes/productRoutes';
import { TestDataFactory } from '../../__tests__/helpers/factories';
import { generateAccessToken } from '../../utils/jwt';

// Mock price history service
jest.mock('../../services/priceHistoryService', () => ({
  recordInitialPrice: jest.fn(),
  recordPriceChange: jest.fn(),
}));

// Create a test app
const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productRoutes);

  // Error handler
  app.use((err: any, req: any, res: any, next: any) => {
    res.status(err.statusCode || 500).json({
      error: err.message || 'Internal server error',
    });
  });

  return app;
};

describe('Product Controller Integration Tests', () => {
  let app: Express;
  let prisma: PrismaClient;
  let factory: TestDataFactory;
  let sellerUser: any;
  let seller: any;
  let sellerToken: string;
  let regularUser: any;
  let regularToken: string;

  beforeAll(async () => {
    app = createTestApp();
    prisma = new PrismaClient();
    factory = new TestDataFactory(prisma);

    // Create test users
    sellerUser = await factory.createUser({
      email: 'seller@test.com',
      role: 'SELLER',
    });

    regularUser = await factory.createUser({
      email: 'user@test.com',
      role: 'USER',
    });

    // Create seller profile
    seller = await factory.createSeller(sellerUser.id);

    // Generate tokens
    sellerToken = generateAccessToken({ userId: sellerUser.id, email: sellerUser.email, role: sellerUser.role });
    regularToken = generateAccessToken({ userId: regularUser.id, email: regularUser.email, role: regularUser.role });
  });

  beforeEach(async () => {
    // Clean up products before each test
    await prisma.product.deleteMany({});
  });

  afterAll(async () => {
    await factory.cleanup();
    await prisma.$disconnect();
  });

  describe('GET /api/products', () => {
    it('should return paginated products', async () => {
      // Create test products with quantity field
      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      await prisma.product.createMany({
        data: [
          {
            name: 'Black Lotus',
            description: 'Rare card',
            price: 10000,
            quantity: 5,
            sellerId: seller.id,
            gameId: game.id,
            setId: set.id,
            condition: 'NEAR_MINT',
            rarity: 'Mythic Rare',
            cardNumber: '001',
          },
          {
            name: 'Mox Ruby',
            description: 'Power Nine',
            price: 5000,
            quantity: 3,
            sellerId: seller.id,
            gameId: game.id,
            setId: set.id,
            condition: 'NEAR_MINT',
            rarity: 'Rare',
            cardNumber: '002',
          },
        ],
      });

      const response = await request(app)
        .get('/api/products?page=1&limit=20')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.products).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter products by search query', async () => {
      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      await prisma.product.create({
        data: {
          name: 'Black Lotus',
          description: 'Rare card',
          price: 10000,
          quantity: 5,
          sellerId: seller.id,
          gameId: game.id,
          setId: set.id,
          condition: 'NEAR_MINT',
          rarity: 'Mythic Rare',
          cardNumber: '001',
        },
      });

      const response = await request(app)
        .get('/api/products?search=Lotus')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toContain('Lotus');
    });

    it('should filter products by game', async () => {
      const game1 = await factory.createGame({ name: 'MTG' });
      const game2 = await factory.createGame({ name: 'Pokemon' });
      const set1 = await factory.createSet(game1.id);
      const set2 = await factory.createSet(game2.id);

      await prisma.product.createMany({
        data: [
          {
            name: 'MTG Card',
            description: 'MTG card',
            price: 100,
            quantity: 5,
            sellerId: seller.id,
            gameId: game1.id,
            setId: set1.id,
            condition: 'NEAR_MINT',
            rarity: 'Common',
            cardNumber: '001',
          },
          {
            name: 'Pokemon Card',
            description: 'Pokemon card',
            price: 50,
            quantity: 10,
            sellerId: seller.id,
            gameId: game2.id,
            setId: set2.id,
            condition: 'NEAR_MINT',
            rarity: 'Common',
            cardNumber: '002',
          },
        ],
      });

      const response = await request(app)
        .get(`/api/products?gameId=${game1.id}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].game.id).toBe(game1.id);
    });

    it('should filter products by price range', async () => {
      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      await prisma.product.createMany({
        data: [
          {
            name: 'Cheap Card',
            description: 'Cheap',
            price: 10,
            quantity: 5,
            sellerId: seller.id,
            gameId: game.id,
            setId: set.id,
            condition: 'NEAR_MINT',
            rarity: 'Common',
            cardNumber: '001',
          },
          {
            name: 'Expensive Card',
            description: 'Expensive',
            price: 1000,
            quantity: 1,
            sellerId: seller.id,
            gameId: game.id,
            setId: set.id,
            condition: 'NEAR_MINT',
            rarity: 'Rare',
            cardNumber: '002',
          },
        ],
      });

      const response = await request(app)
        .get('/api/products?minPrice=100&maxPrice=2000')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].price).toBe(1000);
    });

    it('should only show products with quantity > 0', async () => {
      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      await prisma.product.createMany({
        data: [
          {
            name: 'In Stock',
            description: 'Available',
            price: 100,
            quantity: 5,
            sellerId: seller.id,
            gameId: game.id,
            setId: set.id,
            condition: 'NEAR_MINT',
            rarity: 'Common',
            cardNumber: '001',
          },
          {
            name: 'Out of Stock',
            description: 'Unavailable',
            price: 100,
            quantity: 0,
            sellerId: seller.id,
            gameId: game.id,
            setId: set.id,
            condition: 'NEAR_MINT',
            rarity: 'Common',
            cardNumber: '002',
          },
        ],
      });

      const response = await request(app)
        .get('/api/products')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe('In Stock');
    });

    it('should support sorting', async () => {
      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      await prisma.product.createMany({
        data: [
          {
            name: 'Card B',
            description: 'Card B',
            price: 200,
            quantity: 5,
            sellerId: seller.id,
            gameId: game.id,
            setId: set.id,
            condition: 'NEAR_MINT',
            rarity: 'Common',
            cardNumber: '001',
          },
          {
            name: 'Card A',
            description: 'Card A',
            price: 100,
            quantity: 5,
            sellerId: seller.id,
            gameId: game.id,
            setId: set.id,
            condition: 'NEAR_MINT',
            rarity: 'Common',
            cardNumber: '002',
          },
        ],
      });

      const response = await request(app)
        .get('/api/products?sortBy=price&sortOrder=asc')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.products[0].price).toBe(100);
      expect(response.body.products[1].price).toBe(200);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return product by id', async () => {
      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      const product = await prisma.product.create({
        data: {
          name: 'Black Lotus',
          description: 'Rare card',
          price: 10000,
          quantity: 5,
          sellerId: seller.id,
          gameId: game.id,
          setId: set.id,
          condition: 'NEAR_MINT',
          rarity: 'Mythic Rare',
          cardNumber: '001',
        },
      });

      const response = await request(app)
        .get(`/api/products/${product.id}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('product');
      expect(response.body.product.id).toBe(product.id);
      expect(response.body.product.name).toBe('Black Lotus');
    });

    it('should return 404 if product not found', async () => {
      const response = await request(app)
        .get('/api/products/invalid-id')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should include related data', async () => {
      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      const product = await prisma.product.create({
        data: {
          name: 'Black Lotus',
          description: 'Rare card',
          price: 10000,
          quantity: 5,
          sellerId: seller.id,
          gameId: game.id,
          setId: set.id,
          condition: 'NEAR_MINT',
          rarity: 'Mythic Rare',
          cardNumber: '001',
        },
      });

      const response = await request(app)
        .get(`/api/products/${product.id}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.product).toHaveProperty('game');
      expect(response.body.product).toHaveProperty('set');
      expect(response.body.product).toHaveProperty('seller');
      expect(response.body.product).toHaveProperty('reviews');
      expect(response.body.product).toHaveProperty('images');
    });
  });

  describe('POST /api/products', () => {
    it('should create product for seller', async () => {
      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      const productData = {
        name: 'Black Lotus',
        description: 'Rare card',
        price: 10000,
        quantity: 5,
        gameId: game.id,
        setId: set.id,
        condition: 'NEAR_MINT',
        rarity: 'Mythic Rare',
        cardNumber: '001',
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(productData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('product');
      expect(response.body.product.name).toBe('Black Lotus');
      expect(response.body.product.sellerId).toBe(seller.id);
    });

    it('should return 403 if user is not a seller', async () => {
      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      const productData = {
        name: 'Black Lotus',
        description: 'Rare card',
        price: 10000,
        quantity: 5,
        gameId: game.id,
        setId: set.id,
        condition: 'NEAR_MINT',
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(productData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(403);
    });

    it('should return 401 if not authenticated', async () => {
      const game = await factory.createGame();

      const productData = {
        name: 'Black Lotus',
        price: 10000,
        quantity: 5,
        gameId: game.id,
        condition: 'NEAR_MINT',
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });

    it('should return 404 if game not found', async () => {
      const productData = {
        name: 'Black Lotus',
        description: 'Rare card',
        price: 10000,
        quantity: 5,
        gameId: 'invalid-game-id',
        condition: 'NEAR_MINT',
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(productData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Game not found');
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product if owned by seller', async () => {
      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      const product = await prisma.product.create({
        data: {
          name: 'Black Lotus',
          description: 'Rare card',
          price: 10000,
          quantity: 5,
          sellerId: seller.id,
          gameId: game.id,
          setId: set.id,
          condition: 'NEAR_MINT',
          rarity: 'Mythic Rare',
          cardNumber: '001',
        },
      });

      const updateData = {
        price: 12000,
        quantity: 3,
      };

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.product.price).toBe(12000);
      expect(response.body.product.quantity).toBe(3);
    });

    it('should return 404 if product not found', async () => {
      const updateData = {
        price: 12000,
      };

      const response = await request(app)
        .put('/api/products/invalid-id')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
    });

    it('should return 403 if user does not own product', async () => {
      // Create another seller
      const otherUser = await factory.createUser({ role: 'SELLER' });
      const otherSeller = await factory.createSeller(otherUser.id);

      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      const product = await prisma.product.create({
        data: {
          name: 'Card',
          description: 'Card',
          price: 100,
          quantity: 5,
          sellerId: otherSeller.id,
          gameId: game.id,
          setId: set.id,
          condition: 'NEAR_MINT',
          rarity: 'Common',
          cardNumber: '001',
        },
      });

      const updateData = {
        price: 200,
      };

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product if owned by seller', async () => {
      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      const product = await prisma.product.create({
        data: {
          name: 'Black Lotus',
          description: 'Rare card',
          price: 10000,
          quantity: 5,
          sellerId: seller.id,
          gameId: game.id,
          setId: set.id,
          condition: 'NEAR_MINT',
          rarity: 'Mythic Rare',
          cardNumber: '001',
        },
      });

      const response = await request(app)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');

      // Verify product was deleted
      const deletedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(deletedProduct).toBeNull();
    });

    it('should return 404 if product not found', async () => {
      const response = await request(app)
        .delete('/api/products/invalid-id')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
    });

    it('should return 403 if user does not own product', async () => {
      // Create another seller
      const otherUser = await factory.createUser({ role: 'SELLER' });
      const otherSeller = await factory.createSeller(otherUser.id);

      const game = await factory.createGame();
      const set = await factory.createSet(game.id);

      const product = await prisma.product.create({
        data: {
          name: 'Card',
          description: 'Card',
          price: 100,
          quantity: 5,
          sellerId: otherSeller.id,
          gameId: game.id,
          setId: set.id,
          condition: 'NEAR_MINT',
          rarity: 'Common',
          cardNumber: '001',
        },
      });

      const response = await request(app)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(403);
    });
  });
});
