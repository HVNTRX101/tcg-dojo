import { apiClient } from './api';

export interface CollectionItem {
  id: string;
  productId: string;
  name: string;
  set: string;
  game: string;
  quantity: number;
  condition: string;
  finish: string;
  image: string;
  addedAt: string;
  notes?: string;
}

export interface CollectionStats {
  totalCards: number;
  totalValue: number;
  gamesCount: number;
  setsCount: number;
  recentAdditions: CollectionItem[];
}

export interface CollectionFilters {
  game?: string;
  set?: string;
  rarity?: string;
  condition?: string;
  finish?: string;
  search?: string;
}

export const collectionService = {
  // Get user's collection
  getCollection: (filters: CollectionFilters = {}): Promise<CollectionItem[]> => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return apiClient.get(`/collection?${params.toString()}`);
  },

  // Add card to collection
  addToCollection: (
    productId: string,
    data: {
      quantity?: number;
      condition?: string;
      finish?: string;
      notes?: string;
    } = {}
  ): Promise<CollectionItem> => {
    return apiClient.post('/collection/items', {
      productId,
      ...data,
    });
  },

  // Update collection item
  updateCollectionItem: (
    itemId: string,
    data: {
      quantity?: number;
      condition?: string;
      finish?: string;
      notes?: string;
    }
  ): Promise<CollectionItem> => {
    return apiClient.patch(`/collection/items/${itemId}`, data);
  },

  // Remove card from collection
  removeFromCollection: (itemId: string): Promise<void> => {
    return apiClient.delete(`/collection/items/${itemId}`);
  },

  // Get collection statistics
  getCollectionStats: (): Promise<CollectionStats> => {
    return apiClient.get('/collection/stats');
  },

  // Export collection
  exportCollection: (format: 'csv' | 'json' = 'csv'): Promise<Blob> => {
    return apiClient.get(`/collection/export?format=${format}`, {
      responseType: 'blob',
    });
  },

  // Import collection
  importCollection: (file: File): Promise<{ imported: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post('/collection/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get collection wishlist
  getWishlist: (): Promise<CollectionItem[]> => {
    return apiClient.get('/collection/wishlist');
  },

  // Add to wishlist
  addToWishlist: (productId: string): Promise<void> => {
    return apiClient.post('/collection/wishlist', { productId });
  },

  // Remove from wishlist
  removeFromWishlist: (productId: string): Promise<void> => {
    return apiClient.delete(`/collection/wishlist/${productId}`);
  },
};
