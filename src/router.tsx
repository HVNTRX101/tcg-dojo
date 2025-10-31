import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ThemeProvider';
import { CartProvider } from './components/CartContext';
import { Toaster } from './components/ui/sonner';

// Import layout components (not lazy loaded as they're needed immediately)
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';

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
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
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
            <CollectionTrackerPage />
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
        path: 'account',
        element: (
          <LazyRoute>
            <AccountPage />
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
            <CheckoutPage />
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
            <RouterProvider router={router} />
            <Toaster />
          </CartProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
