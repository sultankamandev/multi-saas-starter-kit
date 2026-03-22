import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES, LOCALE_DISPLAY_CONFIG, type Locale } from "@/i18n/config";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLocale = (i18n.language?.substring(0, 2) || "en") as Locale;
  const current = LOCALE_DISPLAY_CONFIG[currentLocale] || LOCALE_DISPLAY_CONFIG.en;

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const changeLanguage = (locale: Locale) => {
    i18n.changeLanguage(locale);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
        <span className="text-lg">{current.flag}</span>
        <span className="hidden sm:inline">{currentLocale.toUpperCase()}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {SUPPORTED_LOCALES.map((locale) => {
            const info = LOCALE_DISPLAY_CONFIG[locale];
            return (
              <button key={locale} onClick={() => changeLanguage(locale)} disabled={locale === currentLocale}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${locale === currentLocale ? "bg-indigo-50 text-indigo-600 font-medium" : "text-gray-700 hover:bg-gray-50"} disabled:cursor-not-allowed`}>
                <span className="text-xl">{info.flag}</span>
                <span className="flex-1">{info.name}</span>
                {locale === currentLocale && <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
