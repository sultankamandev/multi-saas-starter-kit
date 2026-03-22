import { DOMAIN_DEFAULT_LOCALES } from '@/i18n/constants';

export function getDefaultLocaleFromRequest(request: Request): string {
  const host = request.headers.get('host') || '';
  const domain = host.split(':')[0];
  return DOMAIN_DEFAULT_LOCALES[domain] ?? 'en';
}
