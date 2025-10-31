import { apiClient } from './api';
import { Product, ProductListing } from '../types/product.types';

export interface SellerProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinedDate: string;
  totalSales: number;
  totalProducts: number;
  rating: number;
  reviewCount: number;
  responseTime: string;
  shippingPolicy: string;
  returnPolicy: string;
}

export interface SellerReview {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  productName: string;
  productImage: string;
}

export interface SellerStats {
  totalSales: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  averageResponseTime: string;
  topSellingProducts: Product[];
}

export const sellerService = {
  // Get seller profile
  getSellerProfile: (sellerId: string): Promise<SellerProfile> => {
    return apiClient.get(`/sellers/${sellerId}`);
  },

  // Get seller listings
  getSellerListings: (sellerId: string, filters: {
    game?: string;
    set?: string;
    rarity?: string;
    condition?: string;
    finish?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ listings: ProductListing[]; pagination: any }> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    return apiClient.get(`/sellers/${sellerId}/listings?${params.toString()}`);
  },

  // Get seller reviews
  getSellerReviews: (sellerId: string, page: number = 1, limit: number = 10): Promise<{
    reviews: SellerReview[];
    pagination: any;
  }> => {
    return apiClient.get(`/sellers/${sellerId}/reviews?page=${page}&limit=${limit}`);
  },

  // Get seller statistics
  getSellerStats: (sellerId: string): Promise<SellerStats> => {
    return apiClient.get(`/sellers/${sellerId}/stats`);
  },

  // Follow seller
  followSeller: (sellerId: string): Promise<void> => {
    return apiClient.post(`/sellers/${sellerId}/follow`);
  },

  // Unfollow seller
  unfollowSeller: (sellerId: string): Promise<void> => {
    return apiClient.delete(`/sellers/${sellerId}/follow`);
  },

  // Check if user follows seller
  isFollowingSeller: (sellerId: string): Promise<boolean> => {
    return apiClient.get(`/sellers/${sellerId}/follow-status`);
  },

  // Get followed sellers
  getFollowedSellers: (): Promise<SellerProfile[]> => {
    return apiClient.get('/sellers/followed');
  },

  // Get seller's top products
  getSellerTopProducts: (sellerId: string, limit: number = 10): Promise<Product[]> => {
    return apiClient.get(`/sellers/${sellerId}/top-products?limit=${limit}`);
  },

  // Report seller
  reportSeller: (sellerId: string, reason: string, description?: string): Promise<void> => {
    return apiClient.post(`/sellers/${sellerId}/report`, {
      reason,
      description,
    });
  },
};
