# Frontend Testing Suite Setup

## Overview
Comprehensive testing infrastructure for the TCG Dojo frontend application using Vitest and React Testing Library.

## Test Framework
- **Test Runner**: Vitest 4.0.9
- **Testing Library**: @testing-library/react 16.3.0
- **DOM Matchers**: @testing-library/jest-dom 6.9.1
- **User Interaction**: @testing-library/user-event 14.6.1
- **Environment**: jsdom / happy-dom

## Test Coverage

### Unit Tests (46 tests)

#### Services (18 tests)
- `src/services/__tests__/auth.service.test.tsx`
  - Login/logout functionality
  - Signup and user management
  - Password reset flows
  - Email verification
  - Profile management

#### Hooks (18 tests)
- `src/hooks/__tests__/useAuth.test.tsx` (10 tests)
  - Authentication state management
  - Login/logout hooks
  - User profile queries
  - Token management
  - Error handling

- `src/hooks/__tests__/useCart.test.tsx` (8 tests)
  - Cart queries and mutations
  - Add/remove/clear cart operations
  - Cart state management
  - Error handling

#### Components (12 tests)
- `src/components/__tests__/ProductCard.test.tsx`
  - Product information rendering
  - Rarity and condition badges
  - Foil card indicators
  - Price formatting
  - Cart interactions
  - Routing integration

### Integration Tests (8 tests)

#### Authentication Flow (4 tests)
- `src/test/integration/auth-flow.test.tsx`
  - Complete login → fetch user → logout flow
  - Login failure handling
  - Auth state persistence across queries
  - User data invalidation on logout

#### Cart Flow (4 tests)
- `src/test/integration/cart-flow.test.tsx`
  - Empty → add → remove → clear flow
  - Multiple items management
  - Duplicate item handling
  - Error handling

## Test Configuration

### vitest.config.ts
```typescript
- Environment: jsdom
- Setup file: src/test/setup.ts
- Coverage: 70% threshold (statements, branches, functions, lines)
- Provider: v8
```

### Test Utilities
- `src/test/utils.tsx` - Custom render function with providers
- `src/test/setup.ts` - Global test setup and mocks
- `src/test/mocks/mockData.ts` - Reusable mock data

## Running Tests

```bash
# Run all tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

## Test Results

**Total: 56 tests passing ✅**

- Services: 18/18 ✅
- Hooks: 18/18 ✅
- Components: 12/12 ✅
- Integration: 8/8 ✅

## Mocks and Setup

### Global Mocks
- `window.matchMedia` - Media query mocking
- `IntersectionObserver` - Viewport intersection mocking
- `ResizeObserver` - Element resize mocking
- `localStorage` - Storage API mocking
- `sessionStorage` - Session storage mocking

### Service Mocks
- `authService` - Authentication API calls
- `cartService` - Cart API calls
- `apiClient` - HTTP client

### Component Mocks
- `motion/react` - Framer Motion animations

## Best Practices

1. **Test Organization**: Tests are colocated with source files in `__tests__` directories
2. **Mock Data**: Centralized in `src/test/mocks/mockData.ts`
3. **Providers**: Custom wrapper functions ensure all required providers are available
4. **Cleanup**: Automatic cleanup after each test via setup file
5. **Type Safety**: Full TypeScript support in all tests

## Coverage Thresholds

- Statements: 70%
- Branches: 70%
- Functions: 70%
- Lines: 70%

## Next Steps

1. Add E2E tests with Playwright/Cypress
2. Increase component test coverage
3. Add visual regression tests
4. Implement snapshot testing for UI components
5. Add performance testing
