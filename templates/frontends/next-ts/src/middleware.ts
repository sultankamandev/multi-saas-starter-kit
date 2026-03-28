import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { ROUTES, isProtectedRoute } from '@/lib/routes';
import { COOKIE_NAME, DOMAIN_DEFAULT_LOCALES, isValidLocale } from '@/i18n/constants';

const intlMiddleware = createMiddleware(routing);

/**
 * Must live next to `src/app` (`src/middleware.ts`). A `middleware.ts` only at the
 * project root (sibling of `src/`) is NOT picked up when using the `src/app` layout.
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (isProtectedRoute(pathname)) {
    if (!token) {
      const loginUrl = new URL(ROUTES.LOGIN, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (token && (pathname === ROUTES.LOGIN || pathname === ROUTES.REGISTER)) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
  }

  const hostname = request.headers.get('host') || 'localhost';
  const domain = hostname.split(':')[0];

  const domainLocale = DOMAIN_DEFAULT_LOCALES[domain] || routing.defaultLocale;
  const localeCookie = request.cookies.get(COOKIE_NAME);
  let resolvedLocale = domainLocale;
  if (localeCookie && isValidLocale(localeCookie.value)) {
    resolvedLocale = localeCookie.value;
  }

  const response = intlMiddleware(request);

  response.cookies.set(COOKIE_NAME, resolvedLocale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  });

  return response;
}

export const config = {
  matcher: [
    '/',
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
