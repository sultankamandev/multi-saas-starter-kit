'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="bg-app-mesh bg-noise flex min-h-[calc(100dvh-4.25rem)] items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-pulse rounded-2xl border border-border bg-elevated" />
            <p className="text-sm font-medium text-muted">{tc('loading')}</p>
          </div>
        </main>
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    toast.success(tc('logoutSuccess', { defaultValue: 'Logged out successfully' }));
    router.push('/login');
  };

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || '—';

  return (
    <>
      <Navigation />
      <main className="min-h-[calc(100dvh-4.25rem)] bg-app-mesh bg-noise px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {t('title')}
              </h1>
              <p className="mt-2 text-muted">{t('welcomeBack')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/profile"
                className="rounded-full border border-border bg-elevated px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-accent/35"
              >
                {t('editProfile')}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-ink-inverse transition hover:opacity-90"
              >
                {t('logout')}
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-elevated/95 p-6 shadow-sm backdrop-blur-sm sm:col-span-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t('name')}</h2>
              <p className="font-display mt-2 text-2xl font-semibold text-foreground">{displayName}</p>
            </div>
            <div className="rounded-3xl border border-border bg-elevated/95 p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t('email')}</h2>
              <p className="mt-2 break-all text-sm font-medium text-foreground">{user?.email}</p>
            </div>
            <div className="rounded-3xl border border-border bg-elevated/95 p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t('role')}</h2>
              <p className="mt-2">
                <span className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
                  {user?.role}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-accent/25 bg-accent-soft/50 p-6 backdrop-blur-sm">
            <h3 className="font-display text-lg font-semibold text-foreground">{t('features.title')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t('features.description')}</p>
          </div>
        </div>
      </main>
    </>
  );
};

export default Dashboard;
