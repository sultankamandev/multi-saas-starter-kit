import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { ROUTES, isProtectedRoute } from '@/lib/routes';
import { COOKIE_NAME, DOMAIN_DEFAULT_LOCALES, isValidLocale } from '@/i18n/constants';

const intlMiddleware = createMiddleware(routing);

/**
 * Combined middleware for:
 * 1. Route protection (authentication)
 * 2. Internationalization (locale handling)
 * 
 * This runs on the server before the request is processed
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get('token')?.value;

  // ============================================
  // 1. Route Protection (Authentication)
  // ============================================
  
  // Check if this is a protected route
  if (isProtectedRoute(pathname)) {
    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL(ROUTES.LOGIN, request.url);
      // Preserve the intended destination for redirect after login
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If user has token and tries to access login/register, redirect to dashboard
  if (token && (pathname === ROUTES.LOGIN || pathname === ROUTES.REGISTER)) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
  }

  // ============================================
  // 2. Internationalization (Locale Handling)
  // ============================================
  
  // Get the hostname from the request
  const hostname = request.headers.get('host') || 'localhost';
  const domain = hostname.split(':')[0]; // Remove port if present
  
  // Determine default locale based on domain
  const domainLocale = DOMAIN_DEFAULT_LOCALES[domain] || routing.defaultLocale;
  
  // Get locale from our custom cookie
  const localeCookie = request.cookies.get(COOKIE_NAME);
  
  // Determine the locale to use
  let resolvedLocale = domainLocale;
  if (localeCookie && isValidLocale(localeCookie.value)) {
    resolvedLocale = localeCookie.value;
  }
  
  // Process with next-intl middleware
  const response = intlMiddleware(request);
  
  // Always ensure the cookie is set with the resolved locale
  // This way next-intl can read it on subsequent requests
  response.cookies.set(COOKIE_NAME, resolvedLocale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
    sameSite: 'lax',
    httpOnly: false // Allow client-side access for language switcher
  });
  
  return response;
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - Next.js internals
    // - Static files
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};

