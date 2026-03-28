'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const Navigation: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const t = useTranslations('nav');
  const tc = useTranslations('common');

  return (
    <nav
      className="sticky top-0 z-40 border-b border-border/80 bg-elevated/80 shadow-[0_1px_0_oklch(0.92_0.02_260_/_0.6)] backdrop-blur-xl supports-[backdrop-filter]:bg-elevated/70"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center">
          <Link
            href="/"
            className="font-display group truncate text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
            aria-label={`${t('appName')} - Home`}
          >
            <span className="bg-gradient-to-r from-accent to-accent-glow bg-clip-text text-transparent group-hover:opacity-90">
              {t('appName')}
            </span>
          </Link>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3 md:gap-4"
          role="menubar"
        >
          <LanguageSwitcher />

          {isAuthenticated ? (
            <>
              <span
                className="hidden max-w-[14rem] truncate rounded-full border border-border bg-subtle/80 px-3 py-1 text-xs font-medium text-muted sm:inline"
                aria-live="polite"
              >
                {t('welcome', {
                  name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
                })}
              </span>
              <Link
                href="/dashboard"
                className="rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                role="menuitem"
                aria-label={t('dashboard')}
              >
                {t('dashboard')}
              </Link>
              {user?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  role="menuitem"
                  aria-label="Admin Panel"
                >
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  logout();
                  toast.success(tc('logoutSuccess', { defaultValue: 'Logged out successfully' }));
                }}
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-ink-inverse transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
                aria-label={t('logout')}
              >
                {t('logout')}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Link
                href="/login"
                className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                role="menuitem"
                aria-label={t('login')}
              >
                {t('login')}
              </Link>
              <Link
                href="/register"
                className="whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-md shadow-accent/25 transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                role="menuitem"
                aria-label={t('register')}
              >
                {t('register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
