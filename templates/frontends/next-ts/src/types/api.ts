/**
 * API response types and error types
 */

export interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface AxiosErrorResponseData {
  message?: string;
  error?: string;
  errors?: Record<string, string | string[]>;
  code?: string;
}

export interface AxiosErrorResponse {
  response?: {
    data?: AxiosErrorResponseData;
    status?: number;
  };
  message?: string;
}
