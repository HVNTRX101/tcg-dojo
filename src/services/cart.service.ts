import { apiClient } from './api';
import {
  Cart,
  CartResponse,
  AddToCartRequest,
  UpdateCartItemRequest,
  CartSummary,
} from '../types/cart.types';

export const cartService = {
  // Get user's cart
  getCart: (): Promise<Cart> => {
    return apiClient.get('/cart');
  },

  // Add item to cart
  addToCart: (request: AddToCartRequest): Promise<CartResponse> => {
    return apiClient.post('/cart/items', request);
  },

  // Update cart item quantity
  updateCartItem: (request: UpdateCartItemRequest): Promise<CartResponse> => {
    return apiClient.patch(`/cart/items/${request.itemId}`, {
      quantity: request.quantity,
    });
  },

  // Remove item from cart
  removeFromCart: (itemId: string): Promise<CartResponse> => {
    return apiClient.delete(`/cart/items/${itemId}`);
  },

  // Clear entire cart
  clearCart: (): Promise<void> => {
    return apiClient.delete('/cart');
  },

  // Get cart summary (totals, shipping, etc.)
  getCartSummary: (): Promise<CartSummary> => {
    return apiClient.get('/cart/summary');
  },

  // Apply coupon code
  applyCoupon: (code: string): Promise<CartResponse> => {
    return apiClient.post('/cart/coupon', { code });
  },

  // Remove coupon code
  removeCoupon: (): Promise<CartResponse> => {
    return apiClient.delete('/cart/coupon');
  },

  // Sync local cart with server (for offline support)
  syncCart: (localCartItems: any[]): Promise<CartResponse> => {
    return apiClient.post('/cart/sync', { items: localCartItems });
  },
};
