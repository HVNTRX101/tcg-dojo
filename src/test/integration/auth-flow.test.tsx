import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogin, useCurrentUser, useLogout } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import { authToken, refreshToken } from '../../services/api';
import { mockUser, mockAuthResponse } from '../mocks/mockData';

// Mock the auth service
vi.mock('../../services/auth.service', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
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
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Authentication Flow Integration Tests', () => {
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

  it('should complete full login flow: login -> fetch user -> logout', async () => {
    // Step 1: User is not logged in
    vi.mocked(authToken.get).mockReturnValue(null);
    const { result: authResult } = renderHook(() => useCurrentUser(), { wrapper });

    expect(authResult.current.data).toBeUndefined();
    expect(authService.getCurrentUser).not.toHaveBeenCalled();

    // Step 2: User logs in
    vi.mocked(authService.login).mockResolvedValue(mockAuthResponse);
    const { result: loginResult } = renderHook(() => useLogin(), { wrapper });

    loginResult.current.mutate({
      email: 'test@example.com',
      password: 'password123',
    });

    await waitFor(() => {
      expect(loginResult.current.isSuccess).toBe(true);
    });

    // Verify tokens are stored
    expect(authToken.set).toHaveBeenCalledWith(mockAuthResponse.token);
    expect(refreshToken.set).toHaveBeenCalledWith(mockAuthResponse.refreshToken);

    // Step 3: User data is now available
    vi.mocked(authToken.get).mockReturnValue('mock-token');
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

    const { result: userResult } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(userResult.current.isSuccess).toBe(true);
    });

    expect(userResult.current.data).toEqual(mockUser);

    // Step 4: User logs out
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    const { result: logoutResult } = renderHook(() => useLogout(), { wrapper });

    logoutResult.current.mutate();

    await waitFor(() => {
      expect(logoutResult.current.isSuccess).toBe(true);
    });

    // Verify tokens are cleared
    expect(authToken.remove).toHaveBeenCalled();
    expect(refreshToken.remove).toHaveBeenCalled();
  });

  it('should handle login failure correctly', async () => {
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
    expect(authToken.set).not.toHaveBeenCalled();
    expect(refreshToken.set).not.toHaveBeenCalled();
  });

  it('should maintain auth state across multiple queries', async () => {
    vi.mocked(authToken.get).mockReturnValue('mock-token');
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

    // First render
    const { result: result1 } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    expect(result1.current.data).toEqual(mockUser);

    // Second render - should use cached data
    const { result: result2 } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    expect(result2.current.data).toEqual(mockUser);

    // getCurrentUser should only be called once due to caching
    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('should invalidate user data on logout', async () => {
    // Setup: User is logged in
    vi.mocked(authToken.get).mockReturnValue('mock-token');
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

    const { result: userResult } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(userResult.current.isSuccess).toBe(true);
    });

    // Logout
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    const { result: logoutResult } = renderHook(() => useLogout(), { wrapper });

    logoutResult.current.mutate();

    await waitFor(() => {
      expect(logoutResult.current.isSuccess).toBe(true);
    });

    // After logout, query client should be cleared
    const cachedData = queryClient.getQueryData(['auth', 'user']);
    expect(cachedData).toBeUndefined();
  });
});
