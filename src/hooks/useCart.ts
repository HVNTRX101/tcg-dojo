import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartService } from '../services/cart.service';
import { AddToCartRequest, UpdateCartItemRequest } from '../types/cart.types';

// Query keys
export const cartKeys = {
  all: ['cart'] as const,
  cart: () => [...cartKeys.all, 'current'] as const,
  summary: () => [...cartKeys.all, 'summary'] as const,
};

// Hooks
export const useCart = () => {
  return useQuery({
    queryKey: cartKeys.cart(),
    queryFn: () => cartService.getCart(),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: (failureCount, error: any) => {
      if (error?.status === 401) {
        return false; // Don't retry on 401
      }
      return failureCount < 2;
    },
  });
};

export const useCartSummary = () => {
  return useQuery({
    queryKey: cartKeys.summary(),
    queryFn: () => cartService.getCartSummary(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Mutations
export const useAddToCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AddToCartRequest) => cartService.addToCart(request),
    onSuccess: () => {
      // Invalidate cart queries to refetch
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
    onError: error => {
      console.error('Add to cart failed:', error);
    },
  });
};

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateCartItemRequest) => cartService.updateCartItem(request),
    onSuccess: () => {
      // Invalidate cart queries to refetch
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
    onError: error => {
      console.error('Update cart item failed:', error);
    },
  });
};

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => cartService.removeFromCart(itemId),
    onSuccess: () => {
      // Invalidate cart queries to refetch
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
    onError: error => {
      console.error('Remove from cart failed:', error);
    },
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: () => {
      // Invalidate cart queries to refetch
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
    onError: error => {
      console.error('Clear cart failed:', error);
    },
  });
};

export const useApplyCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => cartService.applyCoupon(code),
    onSuccess: () => {
      // Invalidate cart queries to refetch
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
    onError: error => {
      console.error('Apply coupon failed:', error);
    },
  });
};

export const useRemoveCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartService.removeCoupon(),
    onSuccess: () => {
      // Invalidate cart queries to refetch
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
    onError: error => {
      console.error('Remove coupon failed:', error);
    },
  });
};

export const useSyncCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (localCartItems: any[]) => cartService.syncCart(localCartItems),
    onSuccess: () => {
      // Invalidate cart queries to refetch
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
    onError: error => {
      console.error('Sync cart failed:', error);
    },
  });
};

// Utility hook for cart state
export const useCartState = () => {
  const { data: cart, isLoading, error } = useCart();
  const { data: summary } = useCartSummary();

  return {
    cart,
    summary,
    isLoading,
    error,
    itemCount: cart?.itemCount || 0,
    total: summary?.total || 0,
  };
};
