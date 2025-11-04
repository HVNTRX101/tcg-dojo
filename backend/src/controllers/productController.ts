import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateProductInput, UpdateProductInput } from '../types';
import { AuthRequest } from '../middleware/auth';
import { recordInitialPrice, recordPriceChange } from '../services/priceHistoryService';

export const getProducts = async (req: Request, res: Response): Promise<any> => {
  const {
    page = '1',
    limit = '20',
    search,
    gameId,
    setId,
    condition,
    finish,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  // Build filter conditions
  const where: any = {};

  if (search) {
    where.name = {
      contains: search as string,
      mode: 'insensitive',
    };
  }

  if (gameId) {
    where.gameId = gameId as string;
  }

  if (setId) {
    where.setId = setId as string;
  }

  if (condition) {
    where.condition = condition as string;
  }

  if (finish) {
    where.finish = finish as string;
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice as string);
    if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
  }

  // Only show products with quantity > 0
  where.quantity = { gt: 0 };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy as string]: sortOrder as 'asc' | 'desc',
      },
      include: {
        game: {
          select: {
            id: true,
            name: true,
          },
        },
        set: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        seller: {
          select: {
            id: true,
            businessName: true,
            rating: true,
            isVerified: true,
          },
        },
        images: {
          orderBy: [
            { isPrimary: 'desc' },
            { displayOrder: 'asc' },
          ],
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    products,
    pagination: {
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
    },
  });
};

export const getProductById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      game: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      set: {
        select: {
          id: true,
          name: true,
          code: true,
          releaseDate: true,
        },
      },
      seller: {
        select: {
          id: true,
          businessName: true,
          description: true,
          rating: true,
          totalSales: true,
          isVerified: true,
        },
      },
      reviews: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      },
      images: {
        orderBy: [
          { isPrimary: 'desc' },
          { displayOrder: 'asc' },
        ],
      },
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.json({ product });
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<any> => {
  const userId = req.user!.userId;
  const productData = req.body as CreateProductInput;

  // Check if user has a seller profile
  const seller = await prisma.seller.findUnique({
    where: { userId },
  });

  if (!seller) {
    throw new AppError('You must have a seller profile to create products', 403);
  }

  // Verify game exists
  const game = await prisma.game.findUnique({
    where: { id: productData.gameId },
  });

  if (!game) {
    throw new AppError('Game not found', 404);
  }

  // Verify set exists if provided
  if (productData.setId) {
    const set = await prisma.set.findUnique({
      where: { id: productData.setId },
    });

    if (!set) {
      throw new AppError('Set not found', 404);
    }
  }

  const product = await prisma.product.create({
    data: {
      ...productData,
      sellerId: seller.id,
    },
    include: {
      game: true,
      set: true,
      seller: {
        select: {
          id: true,
          businessName: true,
          rating: true,
          isVerified: true,
        },
      },
      images: {
        orderBy: [
          { isPrimary: 'desc' },
          { displayOrder: 'asc' },
        ],
      },
    },
  });

  // Record initial price in price history
  await recordInitialPrice(product.id, product.price);

  res.status(201).json({ product });
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const updateData = req.body as UpdateProductInput;

  // Check if product exists and belongs to the user
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      seller: true,
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.seller.userId !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('You do not have permission to update this product', 403);
  }

  // Track price change if price is being updated
  const oldPrice = product.price;
  const newPrice = updateData.price;

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      game: true,
      set: true,
      seller: {
        select: {
          id: true,
          businessName: true,
          rating: true,
          isVerified: true,
        },
      },
      images: {
        orderBy: [
          { isPrimary: 'desc' },
          { displayOrder: 'asc' },
        ],
      },
    },
  });

  // Record price change if price was updated
  if (newPrice !== undefined && newPrice !== oldPrice) {
    await recordPriceChange(id, newPrice, oldPrice);
  }

  res.json({ product: updatedProduct });
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const userId = req.user!.userId;

  // Check if product exists and belongs to the user
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      seller: true,
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.seller.userId !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('You do not have permission to delete this product', 403);
  }

  await prisma.product.delete({
    where: { id },
  });

  res.json({ message: 'Product deleted successfully' });
};
