import { Request, Response } from 'express';
import { getProducts, getProductById, createProduct } from '../productController';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { mockRequest, mockResponse } from '../../__tests__/helpers/testUtils';
import { AppError } from '../../middleware/errorHandler';

// Mock Prisma client
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    seller: {
      findUnique: jest.fn(),
    },
    game: {
      findUnique: jest.fn(),
    },
    set: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock price history service
jest.mock('../../services/priceHistoryService', () => ({
  recordInitialPrice: jest.fn(),
  recordPriceChange: jest.fn(),
}));

describe('ProductController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Test Card 1',
        price: 10.99,
        quantity: 5,
        gameId: 'game1',
        setId: 'set1',
        condition: 'NM',
        finish: 'FOIL',
        game: { id: 'game1', name: 'Magic: The Gathering' },
        set: { id: 'set1', name: 'Test Set', code: 'TST' },
        seller: { id: 'seller1', businessName: 'Test Seller', rating: 4.5, isVerified: true },
        images: [],
      },
      {
        id: '2',
        name: 'Test Card 2',
        price: 5.99,
        quantity: 10,
        gameId: 'game1',
        setId: 'set1',
        condition: 'LP',
        finish: 'NORMAL',
        game: { id: 'game1', name: 'Magic: The Gathering' },
        set: { id: 'set1', name: 'Test Set', code: 'TST' },
        seller: { id: 'seller1', businessName: 'Test Seller', rating: 4.5, isVerified: true },
        images: [],
      },
    ];

    it('should return paginated products with default parameters', async () => {
      const req = mockRequest({
        query: {},
      });
      const res = mockResponse();

      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.count as jest.Mock).mockResolvedValue(2);

      await getProducts(req as Request, res as Response);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          where: expect.objectContaining({
            quantity: { gt: 0 },
          }),
        })
      );

      expect(res.json).toHaveBeenCalledWith({
        products: mockProducts,
        pagination: {
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
    });

    it('should filter products by search query', async () => {
      const req = mockRequest({
        query: { search: 'Test Card' },
      });
      const res = mockResponse();

      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.count as jest.Mock).mockResolvedValue(2);

      await getProducts(req as Request, res as Response);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: {
              contains: 'Test Card',
              mode: 'insensitive',
            },
          }),
        })
      );
    });

    it('should filter products by game ID', async () => {
      const req = mockRequest({
        query: { gameId: 'game1' },
      });
      const res = mockResponse();

      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.count as jest.Mock).mockResolvedValue(2);

      await getProducts(req as Request, res as Response);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gameId: 'game1',
          }),
        })
      );
    });

    it('should filter products by price range', async () => {
      const req = mockRequest({
        query: { minPrice: '5', maxPrice: '15' },
      });
      const res = mockResponse();

      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.count as jest.Mock).mockResolvedValue(2);

      await getProducts(req as Request, res as Response);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: {
              gte: 5,
              lte: 15,
            },
          }),
        })
      );
    });

    it('should filter products by condition', async () => {
      const req = mockRequest({
        query: { condition: 'NM' },
      });
      const res = mockResponse();

      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProducts[0]]);
      (prisma.product.count as jest.Mock).mockResolvedValue(1);

      await getProducts(req as Request, res as Response);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            condition: 'NM',
          }),
        })
      );
    });

    it('should sort products by specified field and order', async () => {
      const req = mockRequest({
        query: { sortBy: 'price', sortOrder: 'asc' },
      });
      const res = mockResponse();

      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.count as jest.Mock).mockResolvedValue(2);

      await getProducts(req as Request, res as Response);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            price: 'asc',
          },
        })
      );
    });

    it('should handle pagination correctly', async () => {
      const req = mockRequest({
        query: { page: '2', limit: '10' },
      });
      const res = mockResponse();

      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.count as jest.Mock).mockResolvedValue(25);

      await getProducts(req as Request, res as Response);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );

      expect(res.json).toHaveBeenCalledWith({
        products: mockProducts,
        pagination: {
          total: 25,
          page: 2,
          limit: 10,
          totalPages: 3,
        },
      });
    });

    it('should always filter products with quantity > 0', async () => {
      const req = mockRequest({
        query: {},
      });
      const res = mockResponse();

      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
      (prisma.product.count as jest.Mock).mockResolvedValue(2);

      await getProducts(req as Request, res as Response);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            quantity: { gt: 0 },
          }),
        })
      );
    });
  });

  describe('getProductById', () => {
    const mockProduct = {
      id: '1',
      name: 'Test Card',
      price: 10.99,
      quantity: 5,
      gameId: 'game1',
      setId: 'set1',
      condition: 'NM',
      finish: 'FOIL',
      game: {
        id: 'game1',
        name: 'Magic: The Gathering',
        description: 'A trading card game',
      },
      set: {
        id: 'set1',
        name: 'Test Set',
        code: 'TST',
        releaseDate: new Date('2024-01-01'),
      },
      seller: {
        id: 'seller1',
        businessName: 'Test Seller',
        description: 'Test seller description',
        rating: 4.5,
        totalSales: 100,
        isVerified: true,
      },
      reviews: [],
      images: [],
    };

    it('should return product by ID with all related data', async () => {
      const req = mockRequest({
        params: { id: '1' },
      });
      const res = mockResponse();

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      await getProductById(req as Request, res as Response);

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.objectContaining({
          game: expect.any(Object),
          set: expect.any(Object),
          seller: expect.any(Object),
          reviews: expect.any(Object),
          images: expect.any(Object),
        }),
      });

      expect(res.json).toHaveBeenCalledWith({ product: mockProduct });
    });

    it('should throw 404 error when product not found', async () => {
      const req = mockRequest({
        params: { id: 'nonexistent' },
      });
      const res = mockResponse();

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getProductById(req as Request, res as Response)).rejects.toThrow(AppError);
      await expect(getProductById(req as Request, res as Response)).rejects.toThrow('Product not found');
    });
  });

  describe('createProduct', () => {
    const mockSeller = {
      id: 'seller1',
      userId: 'user1',
      businessName: 'Test Seller',
    };

    const mockGame = {
      id: 'game1',
      name: 'Magic: The Gathering',
    };

    const mockSet = {
      id: 'set1',
      name: 'Test Set',
    };

    const mockProductInput = {
      name: 'New Card',
      description: 'A new test card',
      price: 15.99,
      quantity: 10,
      gameId: 'game1',
      setId: 'set1',
      condition: 'NM',
      finish: 'FOIL',
    };

    it('should create product successfully when user is a seller', async () => {
      const req = mockRequest({
        user: { userId: 'user1' },
        body: mockProductInput,
      });
      const res = mockResponse();

      (prisma.seller.findUnique as jest.Mock).mockResolvedValue(mockSeller);
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prisma.set.findUnique as jest.Mock).mockResolvedValue(mockSet);
      (prisma.product.create as jest.Mock).mockResolvedValue({
        id: '1',
        ...mockProductInput,
        sellerId: mockSeller.id,
      });

      await createProduct(req as AuthRequest, res as Response);

      expect(prisma.seller.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user1' },
      });

      expect(prisma.game.findUnique).toHaveBeenCalledWith({
        where: { id: 'game1' },
      });

      expect(prisma.product.create).toHaveBeenCalled();
    });

    it('should throw 403 error when user is not a seller', async () => {
      const req = mockRequest({
        user: { userId: 'user1' },
        body: mockProductInput,
      });
      const res = mockResponse();

      (prisma.seller.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(createProduct(req as AuthRequest, res as Response)).rejects.toThrow(AppError);
      await expect(createProduct(req as AuthRequest, res as Response)).rejects.toThrow(
        'You must have a seller profile to create products'
      );
    });

    it('should throw 404 error when game not found', async () => {
      const req = mockRequest({
        user: { userId: 'user1' },
        body: mockProductInput,
      });
      const res = mockResponse();

      (prisma.seller.findUnique as jest.Mock).mockResolvedValue(mockSeller);
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(createProduct(req as AuthRequest, res as Response)).rejects.toThrow(AppError);
      await expect(createProduct(req as AuthRequest, res as Response)).rejects.toThrow('Game not found');
    });
  });
});
