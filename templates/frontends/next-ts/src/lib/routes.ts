/**
 * Centralized route constants
 * Use these instead of hardcoded strings throughout the application
 */

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  VERIFY_2FA: '/verify-2fa',
  SETUP_2FA: '/setup-2fa',
  RECOVERY_LOGIN: '/recovery-login',
  ADMIN: '/admin',
} as const;

export type Route = typeof ROUTES[keyof typeof ROUTES];

/**
 * Check if a path is a public route (doesn't require authentication)
 */
export function isPublicRoute(pathname: string): boolean {
  return pathname === ROUTES.HOME || 
         pathname === ROUTES.LOGIN || 
         pathname === ROUTES.REGISTER ||
         pathname === ROUTES.FORGOT_PASSWORD ||
         pathname === ROUTES.RESET_PASSWORD ||
         pathname === ROUTES.VERIFY_EMAIL ||
         pathname === ROUTES.VERIFY_2FA ||
         pathname === ROUTES.RECOVERY_LOGIN ||
         pathname.startsWith(ROUTES.LOGIN) ||
         pathname.startsWith(ROUTES.REGISTER) ||
         pathname.startsWith(ROUTES.FORGOT_PASSWORD) ||
         pathname.startsWith(ROUTES.RESET_PASSWORD) ||
         pathname.startsWith(ROUTES.VERIFY_EMAIL) ||
         pathname.startsWith(ROUTES.VERIFY_2FA) ||
         pathname.startsWith(ROUTES.RECOVERY_LOGIN);
}

/**
 * Check if a path is a protected route (requires authentication).
 * Protected by default: only routes explicitly listed here require auth;
 * all others are considered public (see isPublicRoute for auth-related public routes).
 */
export function isProtectedRoute(pathname: string): boolean {
  return pathname === ROUTES.DASHBOARD ||
         pathname === ROUTES.PROFILE ||
         pathname === ROUTES.ADMIN ||
         pathname === ROUTES.SETUP_2FA ||
         pathname.startsWith(ROUTES.DASHBOARD) ||
         pathname.startsWith(ROUTES.PROFILE) ||
         pathname.startsWith(ROUTES.ADMIN) ||
         pathname.startsWith(ROUTES.SETUP_2FA);
}

