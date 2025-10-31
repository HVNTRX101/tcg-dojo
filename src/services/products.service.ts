import { apiClient } from './api';
import { Product, ProductFilters, ProductListing, PriceHistory, GameData } from '../types/product.types';
import { PaginatedResponse } from '../types/api.types';

export const productsService = {
  // Get products with filters and pagination
  getProducts: (filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    return apiClient.get(`/products?${params.toString()}`);
  },

  // Get single product by ID
  getProductById: (id: string): Promise<Product> => {
    return apiClient.get(`/products/${id}`);
  },

  // Search products
  searchProducts: (query: string, filters: Omit<ProductFilters, 'search'> = {}): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();
    params.append('search', query);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    return apiClient.get(`/products/search?${params.toString()}`);
  },

  // Get products by game
  getProductsByGame: (game: string, filters: Omit<ProductFilters, 'game'> = {}): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();
    params.append('game', game);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    return apiClient.get(`/products/game/${game}?${params.toString()}`);
  },

  // Get products by set
  getProductsBySet: (set: string, filters: Omit<ProductFilters, 'set'> = {}): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();
    params.append('set', set);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    return apiClient.get(`/products/set/${set}?${params.toString()}`);
  },

  // Get product listings (multiple sellers for same product)
  getProductListings: (productId: string): Promise<ProductListing[]> => {
    return apiClient.get(`/products/${productId}/listings`);
  },

  // Get price history for a product
  getPriceHistory: (productId: string, period: '1M' | '3M' | '6M' | '1Y' = '6M'): Promise<PriceHistory[]> => {
    return apiClient.get(`/products/${productId}/price-history?period=${period}`);
  },

  // Get game data
  getGameData: (game: string): Promise<GameData> => {
    return apiClient.get(`/games/${game}`);
  },

  // Get all games
  getGames: (): Promise<string[]> => {
    return apiClient.get('/games');
  },

  // Get all sets for a game
  getSetsByGame: (game: string): Promise<string[]> => {
    return apiClient.get(`/games/${game}/sets`);
  },

  // Get related products
  getRelatedProducts: (productId: string, limit: number = 4): Promise<Product[]> => {
    return apiClient.get(`/products/${productId}/related?limit=${limit}`);
  },
};
