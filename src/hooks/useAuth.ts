import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth.service';
import { LoginCredentials, SignupCredentials, UserProfile } from '../types/user.types';
import { AuthResponse } from '../types/user.types';

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  profile: (userId?: string) => [...authKeys.all, 'profile', userId] as const,
};

// Hooks
export const useCurrentUser = () => {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => authService.getCurrentUser(),
    // Always enabled since we can't check HttpOnly cookies from JS
    // Will return 401 if not authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 401) {
        return false; // Don't retry on 401
      }
      return failureCount < 3;
    },
  });
};

export const useUserProfile = (userId?: string) => {
  return useQuery({
    queryKey: authKeys.profile(userId),
    queryFn: () => authService.getUserProfile(userId),
    enabled: !!userId, // Only check if userId is provided
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Mutations
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data: AuthResponse) => {
      // Tokens are now stored in HttpOnly cookies by the server
      // Update user query cache
      queryClient.setQueryData(authKeys.user(), data.user);

      // Invalidate and refetch user profile
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });
    },
    onError: error => {
      console.error('Login failed:', error);
    },
  });
};

export const useSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: SignupCredentials) => authService.signup(credentials),
    onSuccess: (data: AuthResponse) => {
      // Tokens are now stored in HttpOnly cookies by the server
      // Update user query cache
      queryClient.setQueryData(authKeys.user(), data.user);

      // Invalidate and refetch user profile
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });
    },
    onError: error => {
      console.error('Signup failed:', error);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      // Cookies are cleared by the server
      // Clear all cached data
      queryClient.clear();
    },
    onError: () => {
      // Even if logout fails on server, clear local data
      queryClient.clear();
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserProfile>) => authService.updateProfile(data),
    onSuccess: updatedProfile => {
      // Update profile cache
      queryClient.setQueryData(authKeys.profile(), updatedProfile);

      // Invalidate user queries to refetch
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => authService.changePassword(currentPassword, newPassword),
  });
};

export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: (email: string) => authService.requestPasswordReset(email),
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authService.resetPassword(token, newPassword),
  });
};

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: (token: string) => authService.verifyEmail(token),
  });
};

export const useResendVerification = () => {
  return useMutation({
    mutationFn: () => authService.resendVerification(),
  });
};

// Utility hook for auth state
export const useAuth = () => {
  const { data: user, isLoading, error } = useCurrentUser();

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
  };
};
