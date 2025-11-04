/**
 * Application-wide constants
 *
 * This file contains all magic numbers and configuration values used throughout the application.
 * Centralizing these values ensures consistency and makes updates easier.
 */

// ============================================================================
// PAGINATION
// ============================================================================

export const ITEMS_PER_PAGE = 24;

export const PAGINATION_CONFIG = {
  ITEMS_PER_PAGE: 24,
  VISIBLE_PAGES: 5,
  PAGE_THRESHOLD: 3,
  PAGE_OFFSET: 1,
  ELLIPSIS_THRESHOLD: 2,
} as const;

// ============================================================================
// PRICING & COMMERCE
// ============================================================================

export const PRICE_RANGE = {
  MIN: 0,
  MAX: 1000,
  STEP: 10,
  DEFAULT: [0, 1000] as [number, number],
} as const;

export const SHIPPING = {
  FREE_THRESHOLD: 100,
  STANDARD_COST: 9.99,
} as const;

export const TAX_RATE = 0.08; // 8%

export const GIFT_CARD = {
  MIN_AMOUNT: 10,
  MAX_AMOUNT: 500,
} as const;

// ============================================================================
// ANIMATIONS & TRANSITIONS
// ============================================================================

export const ANIMATION_DURATION = {
  FAST: 0.2, // Quick interactions (hovers, taps)
  NORMAL: 0.3, // Standard animations (filters, modals)
  SLOW: 0.6, // Hero/entrance animations
  EXTENDED: 1.5, // Long animations (hero section)
  INFINITE: 8, // Infinite loop durations (background animations)
  TICKER_SCROLL: 40,
  TICKER_SCALE: 2,
} as const;

export const ANIMATION_DELAY = {
  STAGGER_1: 0.2,
  STAGGER_2: 0.3,
  STAGGER_3: 0.4,
  STAGGER_4: 0.5,
  STAGGER_5: 0.6,
} as const;

export const MOTION_SCALE = {
  HOVER: 1.05,
  TAP: 0.95,
  LIGHT_TAP: 0.98,
} as const;

export const MOTION_Y_OFFSET = {
  HOVER_UP: -8,
} as const;

// ============================================================================
// CACHE & QUERY CONFIGURATION
// ============================================================================

export const CACHE_STALE_TIME = {
  SEARCH_RESULTS: 2 * 60 * 1000, // 2 minutes
  LISTINGS: 2 * 60 * 1000, // 2 minutes
  PRODUCT_LIST: 5 * 60 * 1000, // 5 minutes
  PRODUCT_DETAIL: 10 * 60 * 1000, // 10 minutes
  RELATED_PRODUCTS: 15 * 60 * 1000, // 15 minutes
  PRICE_HISTORY: 30 * 60 * 1000, // 30 minutes
  GAME_DATA: 30 * 60 * 1000, // 30 minutes
  GAMES: 60 * 60 * 1000, // 1 hour
  SETS: 60 * 60 * 1000, // 1 hour
} as const;

// ============================================================================
// SEARCH & FILTERS
// ============================================================================

export const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  DEBOUNCE_MS: 300,
} as const;

export const FILTER_CONFIG = {
  ITEMS_MAX_HEIGHT: 300, // px
} as const;

// ============================================================================
// PRODUCT CONFIGURATION
// ============================================================================

export const PRODUCT_LIMITS = {
  RELATED_PRODUCTS: 4,
} as const;

export const PRICE_VARIANCE = {
  RANGE: 0.3, // 30% max variation
  OFFSET: 0.15, // Center offset
  MIN_FACTOR: 0.7, // Minimum price factor for variance
  BASE_FACTOR: 0.8, // Base price factor for calculations
} as const;

// ============================================================================
// UI DIMENSIONS & LAYOUT
// ============================================================================

export const CARD_SIZES = {
  PRODUCT_ASPECT_RATIO: '3/4',
  CART_DRAWER_IMAGE_WIDTH: 80, // px
  CART_DRAWER_IMAGE_HEIGHT: 112, // px
  CART_PAGE_IMAGE_SIZE: 80, // px (square)
} as const;

export const SIDEBAR_CONFIG = {
  WIDTH: 280, // px
  ANIMATION_DURATION: 0.3, // seconds
  ANIMATION_OFFSET: -280, // px
} as const;

export const LAYOUT_SPACING = {
  CHART_HEIGHT: 300, // px
  STICKY_TOP_OFFSET: 8, // px
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AnimationDuration = (typeof ANIMATION_DURATION)[keyof typeof ANIMATION_DURATION];
export type CacheStaleTime = (typeof CACHE_STALE_TIME)[keyof typeof CACHE_STALE_TIME];
