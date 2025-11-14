import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCart, useAddToCart, useRemoveFromCart, useClearCart } from '../../hooks/useCart';
import { cartService } from '../../services/cart.service';
import { mockCartItem, mockProduct } from '../mocks/mockData';

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

describe('Cart Flow Integration Tests', () => {
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

  it('should complete full cart flow: empty -> add item -> remove item -> clear', async () => {
    // Step 1: Cart is empty
    vi.mocked(cartService.getCart).mockResolvedValue({
      id: '1',
      userId: '1',
      items: [],
      itemCount: 0,
      subtotal: 0,
    });

    const { result: cartResult } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      expect(cartResult.current.isSuccess).toBe(true);
    });

    expect(cartResult.current.data?.items).toHaveLength(0);

    // Step 2: Add item to cart
    vi.mocked(cartService.addToCart).mockResolvedValue({ success: true, itemId: '1' });
    vi.mocked(cartService.getCart).mockResolvedValue({
      id: '1',
      userId: '1',
      items: [mockCartItem],
      itemCount: 1,
      subtotal: mockProduct.price * 2,
    });

    const { result: addResult } = renderHook(() => useAddToCart(), { wrapper });

    addResult.current.mutate({
      productId: mockProduct.id,
      quantity: 2,
    });

    await waitFor(() => {
      expect(addResult.current.isSuccess).toBe(true);
    });

    expect(cartService.addToCart).toHaveBeenCalledWith({
      productId: mockProduct.id,
      quantity: 2,
    });

    // Step 3: Cart now has item
    const { result: updatedCartResult } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      expect(updatedCartResult.current.isSuccess).toBe(true);
    });

    expect(updatedCartResult.current.data?.items).toHaveLength(1);
    expect(updatedCartResult.current.data?.itemCount).toBe(1);

    // Step 4: Remove item from cart
    vi.mocked(cartService.removeFromCart).mockResolvedValue({ success: true });
    vi.mocked(cartService.getCart).mockResolvedValue({
      id: '1',
      userId: '1',
      items: [],
      itemCount: 0,
      subtotal: 0,
    });

    const { result: removeResult } = renderHook(() => useRemoveFromCart(), { wrapper });

    removeResult.current.mutate('1');

    await waitFor(() => {
      expect(removeResult.current.isSuccess).toBe(true);
    });

    expect(cartService.removeFromCart).toHaveBeenCalledWith('1');

    // Step 5: Clear cart
    vi.mocked(cartService.clearCart).mockResolvedValue({ success: true });

    const { result: clearResult } = renderHook(() => useClearCart(), { wrapper });

    clearResult.current.mutate();

    await waitFor(() => {
      expect(clearResult.current.isSuccess).toBe(true);
    });

    expect(cartService.clearCart).toHaveBeenCalled();
  });

  it('should handle multiple items in cart', async () => {
    const multipleItems = [
      mockCartItem,
      {
        id: '2',
        productId: '2',
        quantity: 1,
        product: { ...mockProduct, id: '2', name: 'Mox Ruby', price: 5000 },
      },
    ];

    vi.mocked(cartService.getCart).mockResolvedValue({
      id: '1',
      userId: '1',
      items: multipleItems,
      itemCount: 2,
      subtotal: 25000,
    });

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.itemCount).toBe(2);
    expect(result.current.data?.subtotal).toBe(25000);
  });

  it('should handle adding duplicate items', async () => {
    // First add
    vi.mocked(cartService.addToCart).mockResolvedValue({ success: true, itemId: '1' });
    vi.mocked(cartService.getCart).mockResolvedValue({
      id: '1',
      userId: '1',
      items: [{ ...mockCartItem, quantity: 1 }],
      itemCount: 1,
      subtotal: mockProduct.price,
    });

    const { result: addResult1 } = renderHook(() => useAddToCart(), { wrapper });

    addResult1.current.mutate({ productId: mockProduct.id, quantity: 1 });

    await waitFor(() => {
      expect(addResult1.current.isSuccess).toBe(true);
    });

    // Second add of same product
    vi.mocked(cartService.getCart).mockResolvedValue({
      id: '1',
      userId: '1',
      items: [{ ...mockCartItem, quantity: 2 }],
      itemCount: 1,
      subtotal: mockProduct.price * 2,
    });

    const { result: addResult2 } = renderHook(() => useAddToCart(), { wrapper });

    addResult2.current.mutate({ productId: mockProduct.id, quantity: 1 });

    await waitFor(() => {
      expect(addResult2.current.isSuccess).toBe(true);
    });

    // Should have updated quantity, not added new item
    const { result: cartResult } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      expect(cartResult.current.data?.items).toHaveLength(1);
    });
  });

  it('should handle cart errors gracefully', async () => {
    const error = new Error('Product out of stock');
    vi.mocked(cartService.addToCart).mockRejectedValue(error);

    const { result } = renderHook(() => useAddToCart(), { wrapper });

    result.current.mutate({ productId: mockProduct.id, quantity: 100 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});
