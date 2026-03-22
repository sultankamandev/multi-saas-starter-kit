/**
 * Cookie utilities with secure defaults
 * Note: js-cookie doesn't support httpOnly (requires server-side)
 * For production, consider moving token to httpOnly cookies via API route
 */

import Cookies from 'js-cookie';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Get cookie with proper defaults for security
 */
export function getCookie(name: string): string | undefined {
  return Cookies.get(name);
}

/**
 * Set cookie with secure defaults
 * Note: httpOnly flag requires server-side cookie setting
 * Client-side cookies should not contain sensitive data if possible
 */
export function setCookie(name: string, value: string, options?: {
  expires?: number;
  path?: string;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
}) {
  Cookies.set(name, value, {
    expires: options?.expires || 7, // Default 7 days
    path: options?.path || '/',
    sameSite: options?.sameSite || 'strict', // CSRF protection
    secure: options?.secure ?? isProduction, // HTTPS only in production
    ...options,
  });
}

/**
 * Remove cookie
 */
export function removeCookie(name: string, options?: { path?: string }) {
  Cookies.remove(name, {
    path: options?.path || '/',
  });
}

/**
 * Token cookie management
 * Note: For better security, consider moving to httpOnly cookies via API route
 */
export const tokenCookie = {
  get: () => getCookie('token'),
  set: (token: string, expiresInDays: number = 7) => {
    setCookie('token', token, {
      expires: expiresInDays,
      sameSite: 'strict',
      secure: isProduction,
    });
  },
  remove: () => removeCookie('token'),
};

/**
 * Refresh token cookie management
 * Used for "Remember Me" functionality - longer expiration
 */
export const refreshTokenCookie = {
  get: () => getCookie('refresh_token'),
  set: (token: string, expiresInDays: number = 7) => {
    setCookie('refresh_token', token, {
      expires: expiresInDays,
      sameSite: 'strict',
      secure: isProduction,
    });
  },
  remove: () => removeCookie('refresh_token'),
};

