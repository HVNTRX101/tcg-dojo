import { Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AddToCartInput, UpdateCartItemInput } from '../types';
import { AuthRequest } from '../middleware/auth';

export const getCart = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              game: true,
              set: true,
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  rating: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Create cart if it doesn't exist
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                game: true,
                set: true,
                seller: {
                  select: {
                    id: true,
                    businessName: true,
                    rating: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // Calculate totals
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  res.json({
    cart,
    subtotal,
    itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
  });
};

export const addToCart = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { productId, quantity } = req.body as AddToCartInput;

  // Verify product exists and has enough quantity
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.quantity < quantity) {
    throw new AppError('Not enough product in stock', 400);
  }

  // Get or create cart
  let cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
    });
  }

  // Check if item already in cart
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
  });

  if (existingItem) {
    // Update quantity
    const newQuantity = existingItem.quantity + quantity;

    if (product.quantity < newQuantity) {
      throw new AppError('Not enough product in stock', 400);
    }

    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity },
    });
  } else {
    // Add new item
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
      },
    });
  }

  // Return updated cart
  const updatedCart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              game: true,
              set: true,
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  rating: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const subtotal = updatedCart!.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  res.json({
    cart: updatedCart,
    subtotal,
    itemCount: updatedCart!.items.reduce((sum, item) => sum + item.quantity, 0),
  });
};

export const updateCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { itemId } = req.params;
  const { quantity } = req.body as UpdateCartItemInput;

  // Get cart
  const cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  // Get cart item
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { product: true },
  });

  if (!cartItem || cartItem.cartId !== cart.id) {
    throw new AppError('Cart item not found', 404);
  }

  // Verify stock
  if (cartItem.product.quantity < quantity) {
    throw new AppError('Not enough product in stock', 400);
  }

  // Update quantity
  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });

  // Return updated cart
  const updatedCart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              game: true,
              set: true,
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  rating: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const subtotal = updatedCart!.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  res.json({
    cart: updatedCart,
    subtotal,
    itemCount: updatedCart!.items.reduce((sum, item) => sum + item.quantity, 0),
  });
};

export const removeFromCart = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { itemId } = req.params;

  // Get cart
  const cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  // Get cart item
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
  });

  if (!cartItem || cartItem.cartId !== cart.id) {
    throw new AppError('Cart item not found', 404);
  }

  // Delete item
  await prisma.cartItem.delete({
    where: { id: itemId },
  });

  // Return updated cart
  const updatedCart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              game: true,
              set: true,
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  rating: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const subtotal = updatedCart!.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  res.json({
    cart: updatedCart,
    subtotal,
    itemCount: updatedCart!.items.reduce((sum, item) => sum + item.quantity, 0),
  });
};

export const clearCart = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  // Get cart
  const cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  // Delete all items
  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  res.json({ message: 'Cart cleared successfully' });
};
