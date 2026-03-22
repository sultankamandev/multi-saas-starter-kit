'use client';

import React, { useState } from 'react';
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
import { LoginFormData, LoginResponse } from '@/types/auth';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';

const Login: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const t = useTranslations('login');
  const tv = useTranslations('login.validation');
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email: data.email_or_username,
        password: data.password,
        remember_me: data.remember_me || false,
      });
      const { token, refresh_token, user_id, requires_2fa, user: userData } = response.data;
      
      // Check if 2FA is required
      if (requires_2fa && user_id) {
        // Redirect to 2FA verification page
        router.push(`${ROUTES.VERIFY_2FA}?user_id=${user_id}&remember_me=${data.remember_me || false}`);
        return;
      }
      
      // If no 2FA required, proceed with normal login
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Store tokens and update auth context - pass user data if available to avoid extra API call
      // This will also set the user's language preference in the cookie
      await login(token, userData || undefined, refresh_token, data.remember_me);
      
      // Redirect immediately (toast will show on dashboard)
      const redirectTo = searchParams.get('redirect') || ROUTES.DASHBOARD;
      router.replace(redirectTo);
      
      // Show success toast after redirect is initiated (will appear on new page)
      toast.success(t('success'));
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
      
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate aria-label="Login form">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            {t('email')}
          </label>
          <input
            {...register('email_or_username', { 
              required: tv('emailRequired'),
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: tv('emailInvalid')
              }
            })}
            type="email"
            id="email"
            autoComplete="email"
            aria-required="true"
            aria-invalid={errors.email_or_username ? 'true' : 'false'}
            aria-describedby={errors.email_or_username ? 'email-error' : undefined}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.email_or_username && (
            <p id="email-error" className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
              {errors.email_or_username.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            {t('password')}
          </label>
          <input
            {...register('password', { required: tv('passwordRequired') })}
            type="password"
            id="password"
            autoComplete="current-password"
            aria-required="true"
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.password && (
            <p id="password-error" className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              {...register('remember_me')}
              type="checkbox"
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">{t('rememberMe')}</span>
          </label>
          <Link href={ROUTES.FORGOT_PASSWORD} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            {t('forgotPassword')}
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('submitting', { defaultValue: 'Logging in...' })}
            </span>
          ) : (
            t('submit')
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600">
        {t('noAccount')}{' '}
        <Link href={ROUTES.REGISTER} className="font-medium text-indigo-600 hover:text-indigo-500">
          {t('registerLink')}
        </Link>
      </p>
      </main>
    </>
  );
};

export default Login;

