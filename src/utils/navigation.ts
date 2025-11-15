/**
 * Navigation utility to handle routing without full page reload
 * Integrates with React Router for SPA behavior
 */

import { NavigateFunction } from 'react-router-dom';

let navigateFunction: NavigateFunction | null = null;

/**
 * Register the React Router navigate function
 * Call this in your root component or router setup
 */
export const registerNavigate = (navigate: NavigateFunction) => {
  navigateFunction = navigate;
};

/**
 * Navigate to a route using React Router if available
 * Falls back to window.location if router not registered
 */
export const navigateTo = (path: string, replace: boolean = false) => {
  if (navigateFunction) {
    navigateFunction(path, { replace });
  } else {
    // Fallback to window.location
    if (replace) {
      window.location.replace(path);
    } else {
      window.location.href = path;
    }
  }
};

/**
 * Navigate back in history
 */
export const navigateBack = () => {
  if (navigateFunction) {
    navigateFunction(-1);
  } else {
    window.history.back();
  }
};

/**
 * Navigate forward in history
 */
export const navigateForward = () => {
  if (navigateFunction) {
    navigateFunction(1);
  } else {
    window.history.forward();
  }
};

/**
 * Setup auth unauthorized handler
 * Redirects to signin on 401 errors
 */
export const setupAuthHandler = () => {
  window.addEventListener('auth:unauthorized', (event: any) => {
    console.warn('Unauthorized access detected', event.detail);
    navigateTo('/signin', true);
    event.preventDefault(); // Prevent fallback window.location
  });
};
