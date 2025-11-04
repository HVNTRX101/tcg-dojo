import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ThemeProvider';
import { CartProvider } from './components/CartContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { Toaster } from './components/ui/sonner';

// Import layout components (not lazy loaded as they're needed immediately)
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequireRole } from './components/RequireRole';

// Lazy load pages for better performance and code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const GameLandingPage = lazy(() => import('./pages/GameLandingPage'));
const CollectionTrackerPage = lazy(() => import('./pages/CollectionTrackerPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const SellerProfilePage = lazy(() => import('./pages/SellerProfilePage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const SellerAnalyticsPage = lazy(() => import('./pages/SellerAnalyticsPage'));
const MoreProductsPage = lazy(() => import('./pages/MoreProductsPage'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const EmailVerificationPage = lazy(() => import('./pages/EmailVerificationPage'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Wrapper component to add Suspense and ErrorBoundary to lazy-loaded routes
const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary level="route">
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  </ErrorBoundary>
);

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

// Create router
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <LazyRoute>
            <HomePage />
          </LazyRoute>
        ),
      },
      {
        path: 'products/:id',
        element: (
          <LazyRoute>
            <ProductDetailPage />
          </LazyRoute>
        ),
      },
      {
        path: 'games/:game',
        element: (
          <LazyRoute>
            <GameLandingPage />
          </LazyRoute>
        ),
      },
      {
        path: 'collection',
        element: (
          <LazyRoute>
            <ProtectedRoute>
              <CollectionTrackerPage />
            </ProtectedRoute>
          </LazyRoute>
        ),
      },
      {
        path: 'signin',
        element: (
          <LazyRoute>
            <SignInPage />
          </LazyRoute>
        ),
      },
      {
        path: 'signup',
        element: (
          <LazyRoute>
            <SignupPage />
          </LazyRoute>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <LazyRoute>
            <ForgotPasswordPage />
          </LazyRoute>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <LazyRoute>
            <ResetPasswordPage />
          </LazyRoute>
        ),
      },
      {
        path: 'verify-email',
        element: (
          <LazyRoute>
            <EmailVerificationPage />
          </LazyRoute>
        ),
      },
      {
        path: 'account',
        element: (
          <LazyRoute>
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          </LazyRoute>
        ),
      },
      {
        path: 'cart',
        element: (
          <LazyRoute>
            <CartPage />
          </LazyRoute>
        ),
      },
      {
        path: 'checkout',
        element: (
          <LazyRoute>
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          </LazyRoute>
        ),
      },
      {
        path: 'search',
        element: (
          <LazyRoute>
            <SearchResultsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'seller/:sellerId',
        element: (
          <LazyRoute>
            <SellerProfilePage />
          </LazyRoute>
        ),
      },
      {
        path: 'messages',
        element: (
          <LazyRoute>
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          </LazyRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <LazyRoute>
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          </LazyRoute>
        ),
      },
      {
        path: 'orders',
        element: (
          <LazyRoute>
            <ProtectedRoute>
              <OrderTrackingPage />
            </ProtectedRoute>
          </LazyRoute>
        ),
      },
      {
        path: 'faq',
        element: (
          <LazyRoute>
            <FAQPage />
          </LazyRoute>
        ),
      },
      {
        path: 'help',
        element: (
          <LazyRoute>
            <HelpCenterPage />
          </LazyRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <LazyRoute>
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminDashboardPage />
            </RequireRole>
          </LazyRoute>
        ),
      },
      {
        path: 'seller/analytics',
        element: (
          <LazyRoute>
            <RequireRole allowedRoles={['SELLER', 'ADMIN']}>
              <SellerAnalyticsPage />
            </RequireRole>
          </LazyRoute>
        ),
      },
      {
        path: 'more-products',
        element: (
          <LazyRoute>
            <MoreProductsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'unauthorized',
        element: (
          <LazyRoute>
            <UnauthorizedPage />
          </LazyRoute>
        ),
      },
    ],
  },
]);

// Main App component with providers
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <CartProvider>
            <WebSocketProvider>
              <RouterProvider router={router} />
              <Toaster />
            </WebSocketProvider>
          </CartProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
