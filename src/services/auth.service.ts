import { apiClient } from './api';
import {
  AuthResponse,
  LoginCredentials,
  SignupCredentials,
  User,
  UserProfile,
} from '../types/user.types';

export const authService = {
  // Login user
  login: (credentials: LoginCredentials): Promise<AuthResponse> => {
    return apiClient.post('/auth/login', credentials);
  },

  // Signup user
  signup: (credentials: SignupCredentials): Promise<AuthResponse> => {
    return apiClient.post('/auth/signup', credentials);
  },

  // Logout user
  logout: (): Promise<void> => {
    return apiClient.post('/auth/logout');
  },

  // Get current user
  getCurrentUser: (): Promise<User> => {
    return apiClient.get('/auth/me');
  },

  // Refresh token
  refreshToken: (): Promise<{ token: string; refreshToken: string }> => {
    return apiClient.post('/auth/refresh');
  },

  // Get user profile
  getUserProfile: (userId?: string): Promise<UserProfile> => {
    const url = userId ? `/users/${userId}/profile` : '/users/profile';
    return apiClient.get(url);
  },

  // Update user profile
  updateProfile: (data: Partial<UserProfile>): Promise<UserProfile> => {
    return apiClient.patch('/users/profile', data);
  },

  // Change password
  changePassword: (currentPassword: string, newPassword: string): Promise<void> => {
    return apiClient.patch('/auth/password', {
      currentPassword,
      newPassword,
    });
  },

  // Request password reset
  requestPasswordReset: (email: string): Promise<void> => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  // Reset password
  resetPassword: (token: string, newPassword: string): Promise<void> => {
    return apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
  },

  // Verify email
  verifyEmail: (token: string): Promise<void> => {
    return apiClient.post('/auth/verify-email', { token });
  },

  // Resend verification email
  resendVerification: (): Promise<void> => {
    return apiClient.post('/auth/resend-verification');
  },
};
