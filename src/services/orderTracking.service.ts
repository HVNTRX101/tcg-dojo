import { apiClient } from './api';

/**
 * Order Tracking Service
 * Handles order tracking API calls
 */

export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  status: string;
  trackingNumber?: string;
  shippingAddress: any;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface OrderTracking extends Order {
  statusHistory: OrderStatusHistory[];
  estimatedDelivery?: string;
}

export interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export interface OrderFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const orderTrackingService = {
  /**
   * Get user's orders with filtering
   */
  getMyOrders: async (filters?: OrderFilters): Promise<Order[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    return apiClient.get<Order[]>(`/order-tracking/my-orders${query ? `?${query}` : ''}`);
  },

  /**
   * Get order statistics
   */
  getOrderStats: async (): Promise<OrderStats> => {
    return apiClient.get<OrderStats>('/order-tracking/stats');
  },

  /**
   * Get order with full tracking information
   */
  getOrderTracking: async (orderId: string): Promise<OrderTracking> => {
    return apiClient.get<OrderTracking>(`/order-tracking/${orderId}/tracking`);
  },

  /**
   * Get order status history
   */
  getStatusHistory: async (orderId: string): Promise<OrderStatusHistory[]> => {
    return apiClient.get<OrderStatusHistory[]>(`/order-tracking/${orderId}/history`);
  },

  /**
   * Update order status (seller/admin)
   */
  updateStatus: async (orderId: string, status: string, notes?: string): Promise<Order> => {
    return apiClient.put<Order>(`/order-tracking/${orderId}/status`, { status, notes });
  },

  /**
   * Add tracking number (seller/admin)
   */
  setTrackingNumber: async (
    orderId: string,
    trackingNumber: string,
    carrier?: string
  ): Promise<Order> => {
    return apiClient.put<Order>(`/order-tracking/${orderId}/tracking-number`, {
      trackingNumber,
      carrier,
    });
  },
};
