import { createI18n } from "vue-i18n";
import { setCookie, getCookie } from "@/lib/cookies";

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

function getInitialLocale(): Locale {
  const stored = getCookie("vue-i18n-locale") || getCookie("i18next") || navigator.language.split("-")[0];
  return isValidLocale(stored) ? stored : "en";
}

const initialLocale = getInitialLocale();

const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: "en",
  messages: {},
});

export default i18n;

export async function loadLocale(locale: Locale): Promise<void> {
  if (i18n.global.availableLocales.includes(locale)) return;
  const res = await fetch(`/locales/${locale}/translation.json`);
  const messages = await res.json();
  i18n.global.setLocaleMessage(locale, messages);
}

export async function initI18n(): Promise<void> {
  await loadLocale(initialLocale as Locale);
}

export async function setLocale(locale: Locale): Promise<void> {
  await loadLocale(locale);
  i18n.global.locale.value = locale;
  setCookie("vue-i18n-locale", locale, { expires: 365 });
}
