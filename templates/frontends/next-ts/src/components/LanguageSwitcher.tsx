"use client";

import { useState, useRef, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Cookies from "js-cookie";
import { COOKIE_NAME, SUPPORTED_LOCALES, LOCALE_DISPLAY_CONFIG, type Locale } from "@/i18n/constants";

// Memoize locales list to prevent recalculation on each render
const locales = SUPPORTED_LOCALES.map(code => ({
  code,
  ...LOCALE_DISPLAY_CONFIG[code]
}));

export default function LanguageSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Memoize current language lookup
  const currentLanguage = useMemo(
    () => locales.find(loc => loc.code === currentLocale) || locales[0],
    [currentLocale]
  );

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    
    // Store locale in cookie
    Cookies.set(COOKIE_NAME, newLocale, { 
      expires: 365, 
      path: '/',
      sameSite: 'lax'
    });
    
    // Use transition for better UX - refresh will pick up the new locale from cookie
    // Since localePrefix is 'never', the locale is determined by cookie server-side
    startTransition(() => {
      // Refresh the router which will cause server components to re-render with new locale
      router.refresh();
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        // Suppress hydration warning for browser extension-injected attributes (e.g., fdprocessedid from password managers)
        suppressHydrationWarning
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200 hover:border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="hidden sm:inline">{currentLanguage.code.toUpperCase()}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 transform transition-all duration-200 ease-out"
          role="menu"
          aria-label="Language selection menu"
        >
          {locales.map((locale) => (
            <button
              key={locale.code}
              onClick={() => handleLocaleChange(locale.code)}
              disabled={isPending || locale.code === currentLocale}
              role="menuitem"
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                locale.code === currentLocale
                  ? "bg-indigo-50 text-indigo-600 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={`Switch to ${locale.name}`}
              aria-current={locale.code === currentLocale ? 'true' : 'false'}
            >
              <span className="text-xl">{locale.flag}</span>
              <span className="flex-1">{locale.name}</span>
              {locale.code === currentLocale && (
                <svg
                  className="w-4 h-4 text-indigo-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

