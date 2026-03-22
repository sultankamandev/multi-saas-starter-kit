import { routing } from './routing';

export const COOKIE_NAME = 'NEXT_LOCALE';

export type Locale = 'en' | 'tr' | 'de' | 'fr' | 'es' | 'it' | 'ru';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'tr', 'de', 'fr', 'es', 'it', 'ru'];

export const LOCALE_DISPLAY_CONFIG: Record<Locale, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇬🇧' },
  tr: { name: 'Türkçe', flag: '🇹🇷' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  fr: { name: 'Français', flag: '🇫🇷' },
  es: { name: 'Español', flag: '🇪🇸' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  ru: { name: 'Русский', flag: '🇷🇺' },
};

export const DOMAIN_DEFAULT_LOCALES: Record<string, string> = {
  'app-tr.example.com': 'tr',
  'app.example.com': 'en',
};

export function isValidLocale(locale: string): boolean {
  return (routing.locales as readonly string[]).includes(locale);
}
