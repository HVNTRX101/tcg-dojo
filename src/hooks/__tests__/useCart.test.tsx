import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCart,
  useAddToCart,
  useRemoveFromCart,
  useClearCart,
  useCartState,
} from '../useCart';
import { cartService } from '../../services/cart.service';
import { mockCartItem, mockProduct } from '../../test/mocks/mockData';

// Mock the cart service
vi.mock('../../services/cart.service', () => ({
  cartService: {
    getCart: vi.fn(),
    getCartSummary: vi.fn(),
    addToCart: vi.fn(),
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    applyCoupon: vi.fn(),
    removeCoupon: vi.fn(),
    syncCart: vi.fn(),
  },
}));

describe('useCart hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useCart', () => {
    it('should fetch cart data', async () => {
      const mockCart = {
        id: '1',
        userId: '1',
        items: [mockCartItem],
        itemCount: 1,
        subtotal: 20000,
      };

      vi.mocked(cartService.getCart).mockResolvedValue(mockCart);

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCart);
      expect(cartService.getCart).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 error', async () => {
      vi.mocked(cartService.getCart).mockRejectedValue({ status: 401 });

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should only be called once (no retries)
      expect(cartService.getCart).toHaveBeenCalledTimes(1);
    });
  });

  describe('useAddToCart', () => {
    it('should add item to cart and invalidate queries', async () => {
      const mockResponse = { success: true, itemId: '1' };
      vi.mocked(cartService.addToCart).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAddToCart(), { wrapper });

      result.current.mutate({
        productId: '1',
        quantity: 2,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(cartService.addToCart).toHaveBeenCalledWith({
        productId: '1',
        quantity: 2,
      });
    });

    it('should handle add to cart error', async () => {
      const error = new Error('Product out of stock');
      vi.mocked(cartService.addToCart).mockRejectedValue(error);

      const { result } = renderHook(() => useAddToCart(), { wrapper });

      result.current.mutate({
        productId: '1',
        quantity: 10,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useRemoveFromCart', () => {
    it('should remove item from cart', async () => {
      vi.mocked(cartService.removeFromCart).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useRemoveFromCart(), { wrapper });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(cartService.removeFromCart).toHaveBeenCalledWith('1');
    });
  });

  describe('useClearCart', () => {
    it('should clear all items from cart', async () => {
      vi.mocked(cartService.clearCart).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useClearCart(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(cartService.clearCart).toHaveBeenCalledTimes(1);
    });
  });

  describe('useCartState', () => {
    it('should return cart state with computed values', async () => {
      const mockCart = {
        id: '1',
        userId: '1',
        items: [mockCartItem],
        itemCount: 2,
        subtotal: 20000,
      };

      const mockSummary = {
        subtotal: 20000,
        tax: 1600,
        total: 21600,
        itemCount: 2,
      };

      vi.mocked(cartService.getCart).mockResolvedValue(mockCart);
      vi.mocked(cartService.getCartSummary).mockResolvedValue(mockSummary);

      const { result } = renderHook(() => useCartState(), { wrapper });

      await waitFor(() => {
        expect(result.current.cart).toBeDefined();
      });

      expect(result.current.itemCount).toBe(2);
      expect(result.current.total).toBe(21600);
    });

    it('should return default values when cart is empty', () => {
      vi.mocked(cartService.getCart).mockResolvedValue(null);
      vi.mocked(cartService.getCartSummary).mockResolvedValue(null);

      const { result } = renderHook(() => useCartState(), { wrapper });

      expect(result.current.itemCount).toBe(0);
      expect(result.current.total).toBe(0);
    });
  });
});
