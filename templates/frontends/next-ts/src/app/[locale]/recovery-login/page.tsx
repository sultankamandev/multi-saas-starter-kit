'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { ROUTES } from '@/lib/routes';
import { RecoveryLoginFormData, RecoveryLoginResponse } from '@/types/auth';

const RecoveryLogin: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const t = useTranslations('recoveryLogin');
  const tv = useTranslations('recoveryLogin.validation');
  const { register, handleSubmit, formState: { errors } } = useForm<RecoveryLoginFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const rememberMeParam = searchParams.get('remember_me');
    
    if (!userIdParam) {
      toast.error(t('missingUserId'));
      router.push(ROUTES.LOGIN);
      return;
    }
    
    setUserId(userIdParam);
    setRememberMe(rememberMeParam === 'true');
  }, [searchParams, router, t]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, authLoading, router]);

  const onSubmit = async (data: RecoveryLoginFormData) => {
    if (!userId) {
      toast.error(t('missingUserId'));
      return;
    }

    // Convert user_id to number (uint) for backend
    const userIdNumber = parseInt(userId, 10);
    if (isNaN(userIdNumber) || userIdNumber <= 0) {
      toast.error(t('missingUserId'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post<RecoveryLoginResponse>('/auth/use-recovery-code', {
        user_id: userIdNumber,
        code: data.code,
      });
      
      const { token, refresh_token, user: userData } = response.data;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Store tokens and update auth context
      await login(token, userData || undefined, refresh_token, rememberMe);
      
      // Redirect to dashboard
      const redirectTo = searchParams.get('redirect') || ROUTES.DASHBOARD;
      router.replace(redirectTo);
      
      // Show success toast
      toast.success(t('success'));
    } catch (error) {
      const errorMessage = getErrorMessage(error) || t('failed');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format code input to handle recovery codes (alphanumeric, typically 8 characters)
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow alphanumeric characters and hyphens (common in recovery codes)
    const value = e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    e.target.value = value;
  };

  if (authLoading) {
    return (
      <>
        <Navigation />
        <main className="p-8 flex justify-center items-center min-h-screen">
          <div className="text-lg">{t('loading')}</div>
        </main>
      </>
    );
  }

  if (!userId || isAuthenticated) {
    return null;
  }

  return (
    <>
      <Navigation />
      <main className="p-8 flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
            <p className="text-gray-600">{t('description')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate aria-label="Recovery code login form">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                {t('codeLabel')}
              </label>
              <input
                {...register('code', {
                  required: tv('codeRequired'),
                  minLength: {
                    value: 4,
                    message: tv('codeMinLength')
                  }
                })}
                type="text"
                id="code"
                autoComplete="off"
                onChange={handleCodeChange}
                suppressHydrationWarning
                placeholder="XXXX-XXXX"
                aria-required="true"
                aria-invalid={errors.code ? 'true' : 'false'}
                aria-describedby={errors.code ? 'code-error' : undefined}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center text-lg tracking-widest font-mono uppercase"
                autoFocus
              />
              {errors.code && (
                <p id="code-error" className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
                  {errors.code.message}
                </p>
              )}
              <p className="mt-2 text-sm text-gray-500">{t('codeHint')}</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              suppressHydrationWarning
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('submitting')}
                </span>
              ) : (
                t('submit')
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">{t('noRecoveryCode')}</p>
            <Link href={ROUTES.LOGIN} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              {t('backToLogin')}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
};

export default RecoveryLogin;

