import axios, { AxiosError, InternalAxiosRequestConfig, CancelTokenSource } from "axios";
import Cookies from "js-cookie";
import { tokenCookie, refreshTokenCookie } from "@/lib/cookies";
import { AxiosErrorResponseData } from "@/types/api";
import { getGlobalUnauthorizedHandler, setGlobalUnauthorizedHandler } from "@/contexts/AuthErrorContext";
import { COOKIE_NAME, isValidLocale } from "@/i18n/constants";

/**
 * 2FA Error Codes
 * These error codes are returned by the Verify2FA endpoint
 */
export const TWO_FA_ERROR_CODES = {
  CODE_EXPIRED: 'TWO_FA_CODE_EXPIRED',
  INVALID_CODE: 'INVALID_2FA_CODE',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

// Export CancelTokenSource for use in components
export type { CancelTokenSource };

// Get API URL from environment variable with fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - automatically add auth token and language
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    const token = tokenCookie.get();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add app language to headers (if available in browser environment)
    // Using Accept-Language (standard header) to avoid CORS preflight issues
    if (typeof window !== 'undefined' && config.headers) {
      const locale = Cookies.get(COOKIE_NAME);
      // Use locale from cookie if valid, otherwise default to 'en'
      const language = (locale && isValidLocale(locale)) ? locale : 'en';
      // Only use standard Accept-Language header (no custom headers to avoid CORS preflight)
      config.headers['Accept-Language'] = language;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Refresh queue: only one refresh at a time; other 401s wait and retry with new token
let refreshPromise: Promise<string> | null = null;

function isAuthEndpointThatMustNotRetry(config: InternalAxiosRequestConfig): boolean {
  const url = config.url ?? config.baseURL ?? "";
  return url.includes("/auth/refresh-token") || url.includes("/auth/logout");
}

function triggerUnauthorizedRedirect() {
  if (typeof window === "undefined") return;
  const handler = getGlobalUnauthorizedHandler();
  if (handler) {
    handler();
  } else {
    const currentPath = window.location.pathname;
    if (!currentPath.includes("/login") && !currentPath.includes("/register")) {
      window.location.href = "/login";
    }
  }
}

// Response interceptor - handle errors globally and auto-refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<AxiosErrorResponseData>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Never retry or refresh when the failed request was refresh or logout
      if (isAuthEndpointThatMustNotRetry(originalRequest)) {
        return Promise.reject(error);
      }
      originalRequest._retry = true;
      
      const refreshToken = refreshTokenCookie.get();
      if (!refreshToken) {
        tokenCookie.remove();
        triggerUnauthorizedRedirect();
        return Promise.reject(error);
      }

      // Single refresh in flight: wait for it or start it
      if (!refreshPromise) {
        refreshPromise = (async (): Promise<string> => {
          try {
            const refreshResponse = await axios.post<{ access_token: string; refresh_token?: string }>(
              `${API_URL}/auth/refresh-token`,
              { refresh_token: refreshToken },
              { headers: { "Content-Type": "application/json" } }
            );
            const newAccessToken = refreshResponse.data.access_token;
            const newRefreshToken = refreshResponse.data.refresh_token;
            tokenCookie.set(newAccessToken, 7);
            if (newRefreshToken) {
              refreshTokenCookie.set(newRefreshToken, 7);
            }
            return newAccessToken;
          } catch (refreshError) {
            refreshPromise = null;
            tokenCookie.remove();
            refreshTokenCookie.remove();
            triggerUnauthorizedRedirect();
            return Promise.reject(refreshError);
          }
        })();
      }

      try {
        const newToken = await refreshPromise;
        refreshPromise = null;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error("Access forbidden");
      // Could show a toast here if needed
    }

    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error("Server error occurred");
      // Could show a toast here if needed
    }

    return Promise.reject(error);
  }
);

/**
 * Helper function to extract error message from API error
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<AxiosErrorResponseData>;
    const responseData = axiosError.response?.data;
    
    // Check for both 'message' and 'error' fields in the response
    return (
      responseData?.message ||
      responseData?.error || // Handle API responses with 'error' field
      axiosError.message ||
      "An unexpected error occurred"
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * Helper function to check if error has validation errors
 */
export function hasValidationErrors(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<AxiosErrorResponseData>;
    return !!axiosError.response?.data?.errors;
  }
  return false;
}

/**
 * Helper function to get validation errors
 * Returns errors in a normalized format (string or string[])
 */
export function getValidationErrors(error: unknown): Record<string, string | string[]> | null {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<AxiosErrorResponseData>;
    return axiosError.response?.data?.errors || null;
  }
  return null;
}

/**
 * Helper function to get error code from API error
 * Checks multiple possible locations for the error code
 */
export function getErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<AxiosErrorResponseData>;
    const responseData = axiosError.response?.data;
    
    // Check multiple possible locations for error code (order matters - check most common first)
    return (responseData as any)?.error_code ||  // Most common format: error_code
           responseData?.code ||                  // Standard format: code
           (responseData as any)?.errorCode ||    // CamelCase format: errorCode
           null;
  }
  return null;
}