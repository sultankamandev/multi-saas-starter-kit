'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="bg-app-mesh bg-noise flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-elevated/95 p-8 shadow-[0_24px_80px_-28px_oklch(0.35_0.06_265_/_0.35)] backdrop-blur-md">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-200/80 bg-red-50">
          <svg className="h-7 w-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="font-display text-center text-xl font-bold text-foreground">
          {t('title', { defaultValue: 'Something went wrong' })}
        </h2>

        <p className="mt-3 text-center text-sm leading-relaxed text-muted">
          {t('message', { defaultValue: 'An unexpected error occurred. Please try again.' })}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-full bg-accent py-3 text-sm font-semibold text-white shadow-md shadow-accent/20 transition hover:bg-accent-hover"
          >
            {t('tryAgain', { defaultValue: 'Try Again' })}
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = '/')}
            className="flex-1 rounded-full border border-border bg-elevated py-3 text-sm font-semibold text-foreground transition hover:bg-subtle"
          >
            {t('goHome', { defaultValue: 'Go Home' })}
          </button>
        </div>
      </div>
    </div>
  );
}
