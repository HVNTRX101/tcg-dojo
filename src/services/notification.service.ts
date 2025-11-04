import { apiClient } from './api';

/**
 * Notification Service
 * Handles notification API calls
 */

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  orderUpdates: boolean;
  priceAlerts: boolean;
  productMessages: boolean;
  promotions: boolean;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}

export const notificationService = {
  /**
   * Get all notifications
   */
  getNotifications: async (filters?: NotificationFilters): Promise<Notification[]> => {
    const params = new URLSearchParams();
    if (filters?.unreadOnly) params.append('unreadOnly', 'true');
    if (filters?.type) params.append('type', filters.type);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    return apiClient.get<Notification[]>(`/notifications${query ? `?${query}` : ''}`);
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<{ count: number }> => {
    return apiClient.get<{ count: number }>('/notifications/unread-count');
  },

  /**
   * Mark single notification as read
   */
  markAsRead: async (notificationId: string): Promise<void> => {
    return apiClient.put<void>(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<void> => {
    return apiClient.put<void>('/notifications/read-all');
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (notificationId: string): Promise<void> => {
    return apiClient.delete<void>(`/notifications/${notificationId}`);
  },

  /**
   * Delete all read notifications
   */
  deleteAllRead: async (): Promise<void> => {
    return apiClient.delete<void>('/notifications/read');
  },

  /**
   * Get notification preferences
   */
  getPreferences: async (): Promise<NotificationPreferences> => {
    return apiClient.get<NotificationPreferences>('/notifications/preferences');
  },

  /**
   * Update notification preferences
   */
  updatePreferences: async (
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> => {
    return apiClient.put<NotificationPreferences>('/notifications/preferences', preferences);
  },
};
