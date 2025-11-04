import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionService, CollectionFilters } from '../services/collection.service';

// Query keys
export const collectionKeys = {
  all: ['collection'] as const,
  items: (filters: CollectionFilters) => [...collectionKeys.all, 'items', filters] as const,
  stats: () => [...collectionKeys.all, 'stats'] as const,
  wishlist: () => [...collectionKeys.all, 'wishlist'] as const,
};

// Hooks
export const useCollection = (filters: CollectionFilters = {}) => {
  return useQuery({
    queryKey: collectionKeys.items(filters),
    queryFn: () => collectionService.getCollection(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 401) {
        return false; // Don't retry on 401
      }
      return failureCount < 2;
    },
  });
};

export const useCollectionStats = () => {
  return useQuery({
    queryKey: collectionKeys.stats(),
    queryFn: () => collectionService.getCollectionStats(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useWishlist = () => {
  return useQuery({
    queryKey: collectionKeys.wishlist(),
    queryFn: () => collectionService.getWishlist(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Mutations
export const useAddToCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data?: any }) =>
      collectionService.addToCollection(productId, data),
    onSuccess: () => {
      // Invalidate collection queries to refetch
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    },
    onError: error => {
      console.error('Add to collection failed:', error);
    },
  });
};

export const useUpdateCollectionItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) =>
      collectionService.updateCollectionItem(itemId, data),
    onSuccess: () => {
      // Invalidate collection queries to refetch
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    },
    onError: error => {
      console.error('Update collection item failed:', error);
    },
  });
};

export const useRemoveFromCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => collectionService.removeFromCollection(itemId),
    onSuccess: () => {
      // Invalidate collection queries to refetch
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    },
    onError: error => {
      console.error('Remove from collection failed:', error);
    },
  });
};

export const useAddToWishlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => collectionService.addToWishlist(productId),
    onSuccess: () => {
      // Invalidate wishlist queries to refetch
      queryClient.invalidateQueries({ queryKey: collectionKeys.wishlist() });
    },
    onError: error => {
      console.error('Add to wishlist failed:', error);
    },
  });
};

export const useRemoveFromWishlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => collectionService.removeFromWishlist(productId),
    onSuccess: () => {
      // Invalidate wishlist queries to refetch
      queryClient.invalidateQueries({ queryKey: collectionKeys.wishlist() });
    },
    onError: error => {
      console.error('Remove from wishlist failed:', error);
    },
  });
};

export const useExportCollection = () => {
  return useMutation({
    mutationFn: (format: 'csv' | 'json' = 'csv') => collectionService.exportCollection(format),
    onError: error => {
      console.error('Export collection failed:', error);
    },
  });
};

export const useImportCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => collectionService.importCollection(file),
    onSuccess: () => {
      // Invalidate collection queries to refetch
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    },
    onError: error => {
      console.error('Import collection failed:', error);
    },
  });
};

// Utility hook for collection state
export const useCollectionState = (filters: CollectionFilters = {}) => {
  const { data: collection, isLoading, error } = useCollection(filters);
  const { data: stats } = useCollectionStats();

  return {
    collection,
    stats,
    isLoading,
    error,
    itemCount: collection?.length || 0,
    totalValue: stats?.totalValue || 0,
  };
};
