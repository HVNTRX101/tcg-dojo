import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth, useLogin, useLogout, useSignup, useCurrentUser } from '../useAuth';
import { authService } from '../../services/auth.service';
import { authToken, refreshToken } from '../../services/api';
import { mockUser, mockAuthResponse } from '../../test/mocks/mockData';

// Mock the auth service
vi.mock('../../services/auth.service', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    getUserProfile: vi.fn(),
  },
}));

// Mock the API token storage
vi.mock('../../services/api', () => ({
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

describe('useAuth hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useCurrentUser', () => {
    it('should fetch current user when token exists', async () => {
      vi.mocked(authToken.get).mockReturnValue('mock-token');
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useCurrentUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUser);
      expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('should not fetch when no token exists', () => {
      vi.mocked(authToken.get).mockReturnValue(null);

      const { result } = renderHook(() => useCurrentUser(), { wrapper });

      expect(result.current.data).toBeUndefined();
      expect(authService.getCurrentUser).not.toHaveBeenCalled();
    });

    it('should not retry on 401 error', async () => {
      vi.mocked(authToken.get).mockReturnValue('mock-token');
      vi.mocked(authService.getCurrentUser).mockRejectedValue({ status: 401 });

      const { result } = renderHook(() => useCurrentUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should only be called once (no retries)
      expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('useLogin', () => {
    it('should login user and store tokens', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useLogin(), { wrapper });

      result.current.mutate({
        email: 'test@example.com',
        password: 'password123',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(authToken.set).toHaveBeenCalledWith(mockAuthResponse.token);
      expect(refreshToken.set).toHaveBeenCalledWith(mockAuthResponse.refreshToken);
    });

    it('should handle login error', async () => {
      const error = new Error('Invalid credentials');
      vi.mocked(authService.login).mockRejectedValue(error);

      const { result } = renderHook(() => useLogin(), { wrapper });

      result.current.mutate({
        email: 'test@example.com',
        password: 'wrong-password',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useSignup', () => {
    it('should signup user and store tokens', async () => {
      vi.mocked(authService.signup).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useSignup(), { wrapper });

      result.current.mutate({
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authService.signup).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(authToken.set).toHaveBeenCalledWith(mockAuthResponse.token);
      expect(refreshToken.set).toHaveBeenCalledWith(mockAuthResponse.refreshToken);
    });
  });

  describe('useLogout', () => {
    it('should logout and clear tokens', async () => {
      vi.mocked(authService.logout).mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogout(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authService.logout).toHaveBeenCalledTimes(1);
      expect(authToken.remove).toHaveBeenCalledTimes(1);
      expect(refreshToken.remove).toHaveBeenCalledTimes(1);
    });

    it('should clear tokens even if logout fails', async () => {
      vi.mocked(authService.logout).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useLogout(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Tokens should still be removed
      expect(authToken.remove).toHaveBeenCalledTimes(1);
      expect(refreshToken.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('useAuth', () => {
    it('should return authenticated state when user is logged in', async () => {
      vi.mocked(authToken.get).mockReturnValue('mock-token');
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoading).toBe(false);
    });

    it('should return unauthenticated state when no user', () => {
      vi.mocked(authToken.get).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeUndefined();
    });
  });
});
