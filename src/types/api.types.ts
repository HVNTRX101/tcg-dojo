// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Request Types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  game?: string;
  set?: string;
  rarity?: string;
  condition?: string;
  finish?: string;
  priceMin?: number;
  priceMax?: number;
  search?: string;
}

export interface ProductFilters extends FilterParams, PaginationParams, SortParams {}

// Error Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  message: string;
  errors?: ValidationError[];
  code?: string;
}
