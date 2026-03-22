import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'tr', 'de', 'fr', 'es', 'it', 'ru'],

  // Used when no locale matches
  defaultLocale: 'en',
  
  // Never show locale in URL for better SEO
  localePrefix: 'never',
  
  // Locale detection - will use cookies and Accept-Language header
  localeDetection: true
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);

