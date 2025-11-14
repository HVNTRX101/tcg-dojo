import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../auth.service';
import { apiClient } from '../api';
import { mockUser, mockAuthResponse } from '../../test/mocks/mockData';

// Mock the API client
vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  authToken: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
  refreshToken: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockAuthResponse);

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await authService.login(credentials);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error on invalid credentials', async () => {
      const error = new Error('Invalid credentials');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signup', () => {
    it('should signup with valid data', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockAuthResponse);

      const credentials = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await authService.signup(credentials);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/signup', credentials);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error when email already exists', async () => {
      const error = new Error('Email already in use');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      const credentials = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(authService.signup(credentials)).rejects.toThrow('Email already in use');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await authService.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockUser);

      const result = await authService.getCurrentUser();

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('should throw error when not authenticated', async () => {
      const error = new Error('Not authenticated');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(authService.getCurrentUser()).rejects.toThrow('Not authenticated');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const tokenResponse = {
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      vi.mocked(apiClient.post).mockResolvedValue(tokenResponse);

      const result = await authService.refreshToken();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh');
      expect(result).toEqual(tokenResponse);
    });
  });

  describe('getUserProfile', () => {
    it('should get current user profile when no userId provided', async () => {
      const mockProfile = { ...mockUser, bio: 'Test bio' };
      vi.mocked(apiClient.get).mockResolvedValue(mockProfile);

      const result = await authService.getUserProfile();

      expect(apiClient.get).toHaveBeenCalledWith('/users/profile');
      expect(result).toEqual(mockProfile);
    });

    it('should get specific user profile when userId provided', async () => {
      const mockProfile = { ...mockUser, bio: 'Test bio' };
      vi.mocked(apiClient.get).mockResolvedValue(mockProfile);

      const result = await authService.getUserProfile('123');

      expect(apiClient.get).toHaveBeenCalledWith('/users/123/profile');
      expect(result).toEqual(mockProfile);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updateData = { firstName: 'Jane', lastName: 'Smith' };
      const updatedProfile = { ...mockUser, ...updateData };
      vi.mocked(apiClient.patch).mockResolvedValue(updatedProfile);

      const result = await authService.updateProfile(updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/users/profile', updateData);
      expect(result).toEqual(updatedProfile);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue(undefined);

      await authService.changePassword('oldPassword', 'newPassword');

      expect(apiClient.patch).toHaveBeenCalledWith('/auth/password', {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword',
      });
    });

    it('should throw error when current password is wrong', async () => {
      const error = new Error('Current password is incorrect');
      vi.mocked(apiClient.patch).mockRejectedValue(error);

      await expect(authService.changePassword('wrongPassword', 'newPassword')).rejects.toThrow(
        'Current password is incorrect'
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await authService.requestPasswordReset('test@example.com');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com',
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await authService.resetPassword('valid-token', 'newPassword123');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'valid-token',
        newPassword: 'newPassword123',
      });
    });

    it('should throw error with invalid token', async () => {
      const error = new Error('Invalid or expired token');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(authService.resetPassword('invalid-token', 'newPassword')).rejects.toThrow(
        'Invalid or expired token'
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await authService.verifyEmail('valid-token');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/verify-email', {
        token: 'valid-token',
      });
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await authService.resendVerification();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/resend-verification');
    });
  });
});
