import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../services/products.service';
import { ProductFilters, Product } from '../types/product.types';
import { PaginatedResponse } from '../types/api.types';
import { CACHE_STALE_TIME, SEARCH_CONFIG, PRODUCT_LIMITS } from '../constants';

// Query keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  search: (query: string, filters: Omit<ProductFilters, 'search'>) => 
    [...productKeys.all, 'search', query, filters] as const,
  game: (game: string, filters: Omit<ProductFilters, 'game'>) => 
    [...productKeys.all, 'game', game, filters] as const,
  set: (set: string, filters: Omit<ProductFilters, 'set'>) => 
    [...productKeys.all, 'set', set, filters] as const,
  listings: (id: string) => [...productKeys.detail(id), 'listings'] as const,
  priceHistory: (id: string, period: string) => 
    [...productKeys.detail(id), 'priceHistory', period] as const,
  related: (id: string) => [...productKeys.detail(id), 'related'] as const,
  games: () => [...productKeys.all, 'games'] as const,
  gameData: (game: string) => [...productKeys.all, 'gameData', game] as const,
  sets: (game: string) => [...productKeys.all, 'sets', game] as const,
};

// Hooks
export const useProducts = (filters: ProductFilters = {}) => {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productsService.getProducts(filters),
    staleTime: CACHE_STALE_TIME.PRODUCT_LIST,
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsService.getProductById(id),
    enabled: !!id,
    staleTime: CACHE_STALE_TIME.PRODUCT_DETAIL,
  });
};

export const useProductSearch = (query: string, filters: Omit<ProductFilters, 'search'> = {}) => {
  return useQuery({
    queryKey: productKeys.search(query, filters),
    queryFn: () => productsService.searchProducts(query, filters),
    enabled: !!query && query.length > SEARCH_CONFIG.MIN_QUERY_LENGTH,
    staleTime: CACHE_STALE_TIME.SEARCH_RESULTS,
  });
};

export const useProductsByGame = (game: string, filters: Omit<ProductFilters, 'game'> = {}) => {
  return useQuery({
    queryKey: productKeys.game(game, filters),
    queryFn: () => productsService.getProductsByGame(game, filters),
    enabled: !!game,
    staleTime: CACHE_STALE_TIME.PRODUCT_LIST,
  });
};

export const useProductsBySet = (set: string, filters: Omit<ProductFilters, 'set'> = {}) => {
  return useQuery({
    queryKey: productKeys.set(set, filters),
    queryFn: () => productsService.getProductsBySet(set, filters),
    enabled: !!set,
    staleTime: CACHE_STALE_TIME.PRODUCT_LIST,
  });
};

export const useProductListings = (productId: string) => {
  return useQuery({
    queryKey: productKeys.listings(productId),
    queryFn: () => productsService.getProductListings(productId),
    enabled: !!productId,
    staleTime: CACHE_STALE_TIME.LISTINGS,
  });
};

export const usePriceHistory = (productId: string, period: '1M' | '3M' | '6M' | '1Y' = '6M') => {
  return useQuery({
    queryKey: productKeys.priceHistory(productId, period),
    queryFn: () => productsService.getPriceHistory(productId, period),
    enabled: !!productId,
    staleTime: CACHE_STALE_TIME.PRICE_HISTORY,
  });
};

export const useRelatedProducts = (productId: string, limit: number = PRODUCT_LIMITS.RELATED_PRODUCTS) => {
  return useQuery({
    queryKey: productKeys.related(productId),
    queryFn: () => productsService.getRelatedProducts(productId, limit),
    enabled: !!productId,
    staleTime: CACHE_STALE_TIME.RELATED_PRODUCTS,
  });
};

export const useGames = () => {
  return useQuery({
    queryKey: productKeys.games(),
    queryFn: () => productsService.getGames(),
    staleTime: CACHE_STALE_TIME.GAMES,
  });
};

export const useGameData = (game: string) => {
  return useQuery({
    queryKey: productKeys.gameData(game),
    queryFn: () => productsService.getGameData(game),
    enabled: !!game,
    staleTime: CACHE_STALE_TIME.GAME_DATA,
  });
};

export const useSetsByGame = (game: string) => {
  return useQuery({
    queryKey: productKeys.sets(game),
    queryFn: () => productsService.getSetsByGame(game),
    enabled: !!game,
    staleTime: CACHE_STALE_TIME.SETS,
  });
};

// Utility hook for invalidating product queries
export const useInvalidateProducts = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
    invalidateProduct: (id: string) => queryClient.invalidateQueries({ queryKey: productKeys.detail(id) }),
    invalidateList: () => queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
  };
};
