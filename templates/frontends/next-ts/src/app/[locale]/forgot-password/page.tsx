'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import Navigation from '@/components/Navigation';
import { ROUTES } from '@/lib/routes';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const router = useRouter();
  const t = useTranslations('forgotPassword');
  const tv = useTranslations('forgotPassword.validation');
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    try {
      await api.post('/auth/forgot-password', data);
      toast.success(t('success'));
      // Optionally redirect to login after a short delay
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

  return (
    <>
      <Navigation />
      <main className="p-8 flex flex-col gap-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-4">{t('title')}</h1>
        <p className="text-sm text-gray-600 text-center mb-4">
          {t('description')}
        </p>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate aria-label="Forgot password form">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              {t('email')}
            </label>
            <input
              {...register('email', { 
                required: tv('emailRequired'),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: tv('emailInvalid')
                }
              })}
              type="email"
              id="email"
              autoComplete="email"
              suppressHydrationWarning
              aria-required="true"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            suppressHydrationWarning
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
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

export default ForgotPassword;
