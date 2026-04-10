import { mockPrisma } from '../../__tests__/mocks/prisma';

jest.mock('../../config/database', () => {
  const { mockPrisma } = require('../../__tests__/mocks/prisma');
  return { __esModule: true, default: mockPrisma };
});

jest.mock('../../services/websocket', () => ({
  emitNotificationToUser: jest.fn(),
}));

jest.mock('../../services/emailNotificationService', () => ({
  sendEmailNotification: jest.fn().mockResolvedValue(undefined),
}));

import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getPreferences,
  updatePreferences,
} from '../notificationController';
import { emitNotificationToUser } from '../../services/websocket';
import { sendEmailNotification } from '../../services/emailNotificationService';
import { mockRequest, mockResponse } from '../../__tests__/helpers/testUtils';

describe('NotificationController', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  // ============================================
  // createNotification (utility function)
  // ============================================
  describe('createNotification', () => {
    it('should create notification, emit WebSocket, and send email', async () => {
      const mockNotif = {
        id: 'n1',
        userId: 'user-1',
        type: 'ORDER_UPDATE',
        title: 'Test',
        message: 'Hello',
        link: '/test',
        data: '{"key":"val"}',
        createdAt: new Date(),
      };
      mockPrisma.notification.create.mockResolvedValue(mockNotif);

      const result = await createNotification(
        'user-1',
        'ORDER_UPDATE',
        'Test',
        'Hello',
        '/test',
        { key: 'val' }
      );

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'ORDER_UPDATE',
          title: 'Test',
          message: 'Hello',
          link: '/test',
          data: '{"key":"val"}',
        },
      });
      expect(emitNotificationToUser).toHaveBeenCalledWith('user-1', {
        ...mockNotif,
        data: { key: 'val' },
      });
      expect(sendEmailNotification).toHaveBeenCalledWith(
        'user-1', 'ORDER_UPDATE', 'Test', 'Hello', '/test', { key: 'val' }
      );
      expect(result).toEqual(mockNotif);
    });

    it('should handle null data', async () => {
      const mockNotif = {
        id: 'n1',
        userId: 'user-1',
        data: null,
      };
      mockPrisma.notification.create.mockResolvedValue(mockNotif);

      await createNotification('user-1', 'ORDER_UPDATE', 'Test', 'Hello');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ data: null }),
      });
    });

    it('should not throw when email notification fails', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n1',
        data: null,
      });
      (sendEmailNotification as jest.Mock).mockRejectedValue(new Error('SMTP fail'));

      // Should not throw — email failure is caught internally
      await expect(
        createNotification('user-1', 'ORDER_UPDATE', 'Test', 'Hello')
      ).resolves.toBeDefined();
    });
  });

  // ============================================
  // getNotifications
  // ============================================
  describe('getNotifications', () => {
    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'user-1' },
        query: { page: '1', limit: '20' },
      });
    });

    it('should return paginated notifications with parsed data', async () => {
      const mockNotifs = [
        { id: 'n1', data: '{"key":"val"}', createdAt: new Date() },
        { id: 'n2', data: null, createdAt: new Date() },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifs);
      mockPrisma.notification.count.mockResolvedValue(2);

      await getNotifications(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ id: 'n1', data: { key: 'val' } }),
          expect.objectContaining({ id: 'n2', data: null }),
        ],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      });
    });

    it('should filter unread only when requested', async () => {
      req.query = { page: '1', limit: '20', unreadOnly: 'true' };
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await getNotifications(req, res);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
        })
      );
    });
  });

  // ============================================
  // getUnreadCount
  // ============================================
  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      req = mockRequest({ user: { userId: 'user-1' } });
      mockPrisma.notification.count.mockResolvedValue(5);

      await getUnreadCount(req, res);

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
      expect(res.json).toHaveBeenCalledWith({ unreadCount: 5 });
    });
  });

  // ============================================
  // markAsRead
  // ============================================
  describe('markAsRead', () => {
    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'user-1' },
        params: { notificationId: 'n1' },
      });
    });

    it('should mark notification as read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'user-1',
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'n1',
        isRead: true,
        data: null,
      });

      await markAsRead(req, res);

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { isRead: true, readAt: expect.any(Date) },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Notification marked as read' })
      );
    });

    it('should return 404 when notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when user does not own notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'other-user',
      });

      await markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================
  // markAllAsRead
  // ============================================
  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      req = mockRequest({ user: { userId: 'user-1' } });
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      await markAllAsRead(req, res);

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'All notifications marked as read',
      });
    });
  });

  // ============================================
  // deleteNotification
  // ============================================
  describe('deleteNotification', () => {
    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'user-1' },
        params: { notificationId: 'n1' },
      });
    });

    it('should delete notification for owner', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'user-1',
      });
      mockPrisma.notification.delete.mockResolvedValue({});

      await deleteNotification(req, res);

      expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'n1' },
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Notification deleted successfully',
      });
    });

    it('should return 404 when notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when user does not own notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'other-user',
      });

      await deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================
  // deleteAllRead
  // ============================================
  describe('deleteAllRead', () => {
    it('should delete all read notifications and return count', async () => {
      req = mockRequest({ user: { userId: 'user-1' } });
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 7 });

      await deleteAllRead(req, res);

      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: true },
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Read notifications deleted successfully',
        deletedCount: 7,
      });
    });
  });

  // ============================================
  // getPreferences
  // ============================================
  describe('getPreferences', () => {
    beforeEach(() => {
      req = mockRequest({ user: { userId: 'user-1' } });
    });

    it('should return existing preferences', async () => {
      const mockSettings = {
        emailOnOrderUpdate: true,
        emailOnNewMessage: true,
        emailOnNewReview: false,
        emailOnNewFollower: false,
        emailOnPriceDrop: true,
        emailOnMarketingUpdates: false,
        notifyOnOrderUpdate: true,
        notifyOnNewMessage: true,
        notifyOnNewReview: true,
        notifyOnNewFollower: true,
        notifyOnPriceDrop: true,
      };
      mockPrisma.userSettings.findUnique.mockResolvedValue(mockSettings);

      await getPreferences(req, res);

      expect(res.json).toHaveBeenCalledWith({ preferences: mockSettings });
    });

    it('should create default settings when none exist', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(null);
      mockPrisma.userSettings.create.mockResolvedValue({
        emailOnOrderUpdate: true,
        emailOnNewMessage: true,
        emailOnNewReview: true,
        emailOnNewFollower: true,
        emailOnPriceDrop: true,
        emailOnMarketingUpdates: false,
        notifyOnOrderUpdate: true,
        notifyOnNewMessage: true,
        notifyOnNewReview: true,
        notifyOnNewFollower: true,
        notifyOnPriceDrop: true,
      });

      await getPreferences(req, res);

      expect(mockPrisma.userSettings.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      });
      expect(res.json).toHaveBeenCalledWith({
        preferences: expect.objectContaining({ emailOnOrderUpdate: true }),
      });
    });
  });

  // ============================================
  // updatePreferences
  // ============================================
  describe('updatePreferences', () => {
    it('should update partial preferences via upsert', async () => {
      req = mockRequest({
        user: { userId: 'user-1' },
        body: { emailOnOrderUpdate: false, notifyOnPriceDrop: true },
      });
      mockPrisma.userSettings.upsert.mockResolvedValue({
        emailOnOrderUpdate: false,
        emailOnNewMessage: true,
        emailOnNewReview: true,
        emailOnNewFollower: true,
        emailOnPriceDrop: true,
        emailOnMarketingUpdates: false,
        notifyOnOrderUpdate: true,
        notifyOnNewMessage: true,
        notifyOnNewReview: true,
        notifyOnNewFollower: true,
        notifyOnPriceDrop: true,
      });

      await updatePreferences(req, res);

      expect(mockPrisma.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { emailOnOrderUpdate: false, notifyOnPriceDrop: true },
        create: {
          userId: 'user-1',
          emailOnOrderUpdate: false,
          notifyOnPriceDrop: true,
        },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Notification preferences updated successfully',
        })
      );
    });
  });
});
