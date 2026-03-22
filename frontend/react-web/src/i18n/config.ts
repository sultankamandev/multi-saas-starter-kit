import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

export const SUPPORTED_LOCALES = ["en", "tr", "de", "fr", "es", "it", "ru"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_DISPLAY_CONFIG: Record<Locale, { name: string; flag: string }> = {
  en: { name: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  tr: { name: "T\u00FCrk\u00E7e", flag: "\u{1F1F9}\u{1F1F7}" },
  de: { name: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
  fr: { name: "Fran\u00E7ais", flag: "\u{1F1EB}\u{1F1F7}" },
  es: { name: "Espa\u00F1ol", flag: "\u{1F1EA}\u{1F1F8}" },
  it: { name: "Italiano", flag: "\u{1F1EE}\u{1F1F9}" },
  ru: { name: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", flag: "\u{1F1F7}\u{1F1FA}" },
};

export function isValidLocale(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LOCALES,
    interpolation: { escapeValue: false },
    backend: { loadPath: "/locales/{{lng}}/translation.json" },
    detection: {
      order: ["cookie", "localStorage", "navigator"],
      caches: ["cookie", "localStorage"],
      cookieOptions: { path: "/", sameSite: "lax" },
    },
  });

export default i18n;
