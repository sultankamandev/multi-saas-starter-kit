'use client';

import React, { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/routes';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Route protection component that ensures only admin users can access the wrapped content
 * Redirects to login if not authenticated, or to dashboard if authenticated but not admin
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations('common');

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!isAuthenticated || !user) {
      toast.error(t('unauthorized', { defaultValue: 'Please log in to access this page' }));
      router.push(ROUTES.LOGIN);
      return;
    }

    if (user.role !== 'admin') {
      toast.error(t('adminOnly', { defaultValue: 'Admin access required' }));
      router.push(ROUTES.DASHBOARD);
      return;
    }
  }, [user, isAuthenticated, loading, router, t]);

  // Show nothing while loading or if access denied
  if (loading || !isAuthenticated || !user || user.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
};


