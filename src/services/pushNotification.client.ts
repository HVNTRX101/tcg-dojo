/**
 * Client-side Push Notification Service
 * Handles service worker registration and push subscription
 */

import { apiClient } from './api';

const BASE_URL = '/api/push';

/**
 * URL-safe base64 encoding (required for VAPID keys)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class PushNotificationClientService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private publicKey: string | null = null;

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Check current notification permission
   */
  getPermission(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register(
        '/service-worker.js'
      );
      console.log('✅ Service Worker registered:', this.serviceWorkerRegistration);
      return this.serviceWorkerRegistration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported');
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  /**
   * Get VAPID public key from server
   */
  async getPublicKey(): Promise<string> {
    if (this.publicKey) {
      return this.publicKey;
    }

    try {
      const response = await apiClient.get<{ publicKey: string }>(`${BASE_URL}/public-key`);
      this.publicKey = response.publicKey;
      return this.publicKey;
    } catch (error) {
      console.error('Failed to get VAPID public key:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription> {
    // 1. Check support
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported');
    }

    // 2. Request permission
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // 3. Register service worker
    if (!this.serviceWorkerRegistration) {
      await this.registerServiceWorker();
    }

    // 4. Get VAPID public key
    const publicKey = await this.getPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // 5. Subscribe to push
    const subscription = await this.serviceWorkerRegistration!.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    console.log('✅ Push subscription created:', subscription);

    // 6. Send subscription to server
    await apiClient.post(`${BASE_URL}/subscribe`, subscription.toJSON());

    console.log('✅ Push subscription saved to server');
    return subscription;
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      throw new Error('Service worker not registered');
    }

    const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe locally
      await subscription.unsubscribe();
      console.log('✅ Local push subscription removed');
    }

    // Notify server
    await apiClient.post(`${BASE_URL}/unsubscribe`);
    console.log('✅ Server notified of unsubscription');
  }

  /**
   * Check if already subscribed
   */
  async isSubscribed(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    if (!this.serviceWorkerRegistration) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
      } catch (error) {
        return false;
      }
    }

    const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
    return subscription !== null;
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported() || !this.serviceWorkerRegistration) {
      return null;
    }

    return await this.serviceWorkerRegistration.pushManager.getSubscription();
  }

  /**
   * Send test notification
   */
  async sendTestNotification(): Promise<void> {
    await apiClient.post(`${BASE_URL}/test`);
    console.log('✅ Test notification requested');
  }

  /**
   * Show local notification (doesn't require push)
   */
  async showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Notifications are not supported');
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    if (!this.serviceWorkerRegistration) {
      await this.registerServiceWorker();
    }

    await this.serviceWorkerRegistration!.showNotification(title, {
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      ...options,
    });
  }
}

// Singleton instance
export const pushNotificationClient = new PushNotificationClientService();

// Export type for use in components
export type { PushSubscription };
