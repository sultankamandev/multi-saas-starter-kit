'use client';

import React, { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/routes';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

interface UserRouteProps {
  children: React.ReactNode;
}

export const UserRoute: React.FC<UserRouteProps> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations('common');

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      toast.error(t('unauthorized', { defaultValue: 'Please log in to access this page' }));
      router.push(ROUTES.LOGIN);
    }
  }, [user, isAuthenticated, loading, router, t]);

  if (loading || !isAuthenticated || !user) {
    return null;
  }

  return <>{children}</>;
};
