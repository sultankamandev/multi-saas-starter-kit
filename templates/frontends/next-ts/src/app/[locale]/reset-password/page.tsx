'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import Navigation from '@/components/Navigation';
import { ROUTES } from '@/lib/routes';

interface ResetPasswordFormData {
  new_password: string;
  confirmPassword: string;
}

const ResetPassword: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('resetPassword');
  const tv = useTranslations('resetPassword.validation');
  const { register, handleSubmit, formState: { errors }, watch } = useForm<ResetPasswordFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const newPassword = watch('new_password');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      toast.error(t('missingToken'));
      router.push(ROUTES.LOGIN);
      return;
    }
    setToken(tokenParam);
  }, [searchParams, router, t]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error(t('missingToken'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: data.new_password,
      });
      toast.success(t('success'));
      // Redirect to login after successful reset
      setTimeout(() => {
        router.push(ROUTES.LOGIN);
      }, 2000);
    } catch (error) {
      const errorMessage = getErrorMessage(error) || t('failed');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <>
        <Navigation />
        <main className="p-8 flex flex-col gap-4 max-w-md mx-auto">
          <div className="text-center">
            <p className="text-gray-600">{t('loadingToken')}</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="p-8 flex flex-col gap-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-4">{t('title')}</h1>
        <p className="text-sm text-gray-600 text-center mb-4">
          {t('description')}
        </p>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate aria-label="Reset password form">
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
              {t('newPassword')}
            </label>
            <input
              {...register('new_password', { 
                required: tv('passwordRequired'),
                minLength: {
                  value: 8,
                  message: tv('passwordMinLength')
                }
              })}
              type="password"
              id="new_password"
              autoComplete="new-password"
              suppressHydrationWarning
              aria-required="true"
              aria-invalid={errors.new_password ? 'true' : 'false'}
              aria-describedby={errors.new_password ? 'password-error' : undefined}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.new_password && (
              <p id="password-error" className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
                {errors.new_password.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              {t('confirmPassword')}
            </label>
            <input
              {...register('confirmPassword', { 
                required: tv('confirmPasswordRequired'),
                validate: (value) => value === newPassword || tv('passwordsNotMatch')
              })}
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              suppressHydrationWarning
              aria-required="true"
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.confirmPassword && (
              <p id="confirm-password-error" className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            suppressHydrationWarning
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
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

        <p className="text-center text-sm text-gray-600">
          <Link href={ROUTES.LOGIN} className="font-medium text-indigo-600 hover:text-indigo-500">
            {t('backToLogin')}
          </Link>
        </p>
      </main>
    </>
  );
};

export default ResetPassword;
