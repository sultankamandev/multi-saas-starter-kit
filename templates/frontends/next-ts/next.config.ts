import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Note: Domain-based i18n routing is handled via proxy.ts (Next.js 16+)
  // For App Router, we use next-intl with [locale] folder structure
  // Domains: app-tr.example.com (default: tr), app.example.com (default: en)
  // Both domains support all locales: en, tr, de, fr, es, it, ru
};

export default withNextIntl(nextConfig);
