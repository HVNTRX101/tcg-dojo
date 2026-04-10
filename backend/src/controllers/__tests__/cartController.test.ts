import { mockPrisma } from '../../__tests__/mocks/prisma';

jest.mock('../../config/database', () => {
  const { mockPrisma } = require('../../__tests__/mocks/prisma');
  return { __esModule: true, default: mockPrisma };
});

import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../cartController';
import { mockRequest, mockResponse } from '../../__tests__/helpers/testUtils';

describe('CartController', () => {
  let req: any;
  let res: any;

  const mockCartWithItems = {
    id: 'cart-1',
    userId: 'user-1',
    items: [
      {
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'p1',
        quantity: 2,
        product: { id: 'p1', price: 10.0, quantity: 5, game: {}, set: {}, seller: {} },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  // ============================================
  // getCart
  // ============================================
  describe('getCart', () => {
    beforeEach(() => {
      req = mockRequest({ user: { userId: 'user-1' } });
    });

    it('should return existing cart with totals', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCartWithItems);

      await getCart(req, res);

      expect(res.json).toHaveBeenCalledWith({
        cart: mockCartWithItems,
        subtotal: 20.0, // 10 * 2
        itemCount: 2,
      });
    });

    it('should create a new cart when none exists', async () => {
      const emptyCart = { id: 'cart-new', userId: 'user-1', items: [] };
      mockPrisma.cart.findUnique.mockResolvedValue(null);
      mockPrisma.cart.create.mockResolvedValue(emptyCart);

      await getCart(req, res);

      expect(mockPrisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: 'user-1' } })
      );
      expect(res.json).toHaveBeenCalledWith({
        cart: emptyCart,
        subtotal: 0,
        itemCount: 0,
      });
    });
  });

  // ============================================
  // addToCart
  // ============================================
  describe('addToCart', () => {
    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'user-1' },
        body: { productId: 'p1', quantity: 1 },
      });
    });

    it('should throw when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(addToCart(req, res)).rejects.toThrow('Product not found');
    });

    it('should throw when insufficient stock', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', quantity: 0 });

      await expect(addToCart(req, res)).rejects.toThrow('Not enough product in stock');
    });

    it('should add new item to existing cart', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', quantity: 10 });
      mockPrisma.cart.findUnique
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' }) // get cart
        .mockResolvedValueOnce(mockCartWithItems); // return updated cart
      mockPrisma.cartItem.findUnique.mockResolvedValue(null); // no existing item
      mockPrisma.cartItem.create.mockResolvedValue({});

      await addToCart(req, res);

      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith({
        data: { cartId: 'cart-1', productId: 'p1', quantity: 1 },
      });
      expect(res.json).toHaveBeenCalled();
    });

    it('should update quantity for existing cart item', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', quantity: 10 });
      mockPrisma.cart.findUnique
        .mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' })
        .mockResolvedValueOnce(mockCartWithItems);
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        quantity: 2,
      });
      mockPrisma.cartItem.update.mockResolvedValue({});

      await addToCart(req, res);

      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 3 }, // 2 + 1
      });
    });

    it('should create cart if it does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', quantity: 10 });
      mockPrisma.cart.findUnique
        .mockResolvedValueOnce(null) // no existing cart
        .mockResolvedValueOnce(mockCartWithItems); // return updated
      mockPrisma.cart.create.mockResolvedValue({ id: 'cart-new', userId: 'user-1' });
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);
      mockPrisma.cartItem.create.mockResolvedValue({});

      await addToCart(req, res);

      expect(mockPrisma.cart.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      });
    });

    it('should throw when combined quantity exceeds stock', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', quantity: 3 });
      mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', userId: 'user-1' });
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        quantity: 3,
      });

      await expect(addToCart(req, res)).rejects.toThrow('Not enough product in stock');
    });
  });

  // ============================================
  // updateCartItem
  // ============================================
  describe('updateCartItem', () => {
    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'user-1' },
        params: { itemId: 'item-1' },
        body: { quantity: 3 },
      });
    });

    it('should throw when cart not found', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      await expect(updateCartItem(req, res)).rejects.toThrow('Cart not found');
    });

    it('should throw when cart item not found', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1' });
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);

      await expect(updateCartItem(req, res)).rejects.toThrow('Cart item not found');
    });

    it('should throw when item belongs to different cart', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1' });
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cartId: 'other-cart',
        product: { quantity: 10 },
      });

      await expect(updateCartItem(req, res)).rejects.toThrow('Cart item not found');
    });

    it('should throw when stock is insufficient', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1' });
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        product: { quantity: 2 },
      });

      await expect(updateCartItem(req, res)).rejects.toThrow('Not enough product in stock');
    });

    it('should update item quantity', async () => {
      mockPrisma.cart.findUnique
        .mockResolvedValueOnce({ id: 'cart-1' })
        .mockResolvedValueOnce(mockCartWithItems);
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        product: { quantity: 10 },
      });
      mockPrisma.cartItem.update.mockResolvedValue({});

      await updateCartItem(req, res);

      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 3 },
      });
      expect(res.json).toHaveBeenCalled();
    });
  });

  // ============================================
  // removeFromCart
  // ============================================
  describe('removeFromCart', () => {
    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'user-1' },
        params: { itemId: 'item-1' },
      });
    });

    it('should remove item from cart', async () => {
      mockPrisma.cart.findUnique
        .mockResolvedValueOnce({ id: 'cart-1' })
        .mockResolvedValueOnce({ ...mockCartWithItems, items: [] });
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
      });
      mockPrisma.cartItem.delete.mockResolvedValue({});

      await removeFromCart(req, res);

      expect(mockPrisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
      expect(res.json).toHaveBeenCalled();
    });

    it('should throw when cart not found', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      await expect(removeFromCart(req, res)).rejects.toThrow('Cart not found');
    });

    it('should throw when item not found', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1' });
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);

      await expect(removeFromCart(req, res)).rejects.toThrow('Cart item not found');
    });
  });

  // ============================================
  // clearCart
  // ============================================
  describe('clearCart', () => {
    it('should delete all cart items', async () => {
      req = mockRequest({ user: { userId: 'user-1' } });
      mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1' });
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 3 });

      await clearCart(req, res);

      expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'Cart cleared successfully' });
    });

    it('should throw when cart not found', async () => {
      req = mockRequest({ user: { userId: 'user-1' } });
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      await expect(clearCart(req, res)).rejects.toThrow('Cart not found');
    });
  });
});
