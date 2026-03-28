import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Domain defaults: see middleware + i18n/localeFromRequest.ts (do not use src/proxy.ts for helpers — that name is reserved for Next.js)
  // For App Router, we use next-intl with [locale] folder structure
  // Domains: app-tr.example.com (default: tr), app.example.com (default: en)
  // Both domains support all locales: en, tr, de, fr, es, it, ru
};

export default withNextIntl(nextConfig);
