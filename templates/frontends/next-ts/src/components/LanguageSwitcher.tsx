"use client";

import { useState, useRef, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Cookies from "js-cookie";
import { COOKIE_NAME, SUPPORTED_LOCALES, LOCALE_DISPLAY_CONFIG, type Locale } from "@/i18n/constants";

const locales = SUPPORTED_LOCALES.map((code) => ({
  code,
  ...LOCALE_DISPLAY_CONFIG[code],
}));

export default function LanguageSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = useMemo(
    () => locales.find((loc) => loc.code === currentLocale) || locales[0],
    [currentLocale]
  );

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);

    Cookies.set(COOKIE_NAME, newLocale, {
      expires: 365,
      path: "/",
      sameSite: "lax",
    });

    startTransition(() => {
      router.refresh();
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        suppressHydrationWarning
        className="flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-border-strong hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-lg leading-none" aria-hidden>
          {currentLanguage.flag}
        </span>
        <span className="max-w-[9rem] truncate text-left text-sm sm:max-w-[11rem]">
          {currentLanguage.name}
        </span>
        <svg
          className={`h-4 w-4 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-elevated/95 py-1 shadow-xl shadow-foreground/10 backdrop-blur-md"
          role="menu"
          aria-label="Language selection menu"
        >
          {locales.map((locale) => (
            <button
              key={locale.code}
              onClick={() => handleLocaleChange(locale.code)}
              disabled={isPending || locale.code === currentLocale}
              role="menuitem"
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                locale.code === currentLocale
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-foreground hover:bg-subtle"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              aria-label={`Switch to ${locale.name}`}
              aria-current={locale.code === currentLocale ? "true" : "false"}
            >
              <span className="text-xl">{locale.flag}</span>
              <span className="flex-1">{locale.name}</span>
              {locale.code === currentLocale && (
                <svg className="h-4 w-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
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
