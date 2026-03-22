'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage, getErrorCode, TWO_FA_ERROR_CODES } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { ROUTES } from '@/lib/routes';
import { Verify2FAFormData, Verify2FAResponse } from '@/types/auth';

const Verify2FA: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const t = useTranslations('verify2FA');
  const tv = useTranslations('verify2FA.validation');
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<Verify2FAFormData>({
    mode: 'onChange', // Enable real-time validation
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFAType, setTwoFAType] = useState<'email' | 'totp'>('email');
  const [codeExpired, setCodeExpired] = useState(false);

  const codeValue = watch('code');
  
  // Get the register props to access ref, onBlur, and name
  const { ref, onBlur, name } = register('code', {
    required: tv('codeRequired'),
    minLength: {
      value: 6,
      message: tv('codeLength')
    },
    maxLength: {
      value: 6,
      message: tv('codeLength')
    },
    pattern: {
      value: /^\d{6}$/,
      message: tv('codeInvalid')
    }
  });

  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    const rememberMeParam = searchParams.get('remember_me');
    const twoFATypeParam = searchParams.get('two_fa_type') as 'email' | 'totp' | null;
    
    if (!userIdParam) {
      toast.error(t('missingUserId'));
      router.push(ROUTES.LOGIN);
      return;
    }
    
    setUserId(userIdParam);
    setRememberMe(rememberMeParam === 'true');
    setTwoFAType(twoFATypeParam === 'totp' ? 'totp' : 'email');
  }, [searchParams, router, t]);

  const onSubmit = async (data: Verify2FAFormData) => {
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
      // Use different endpoint based on 2FA type
      const endpoint = twoFAType === 'totp' ? '/auth/verify-totp-login' : '/auth/verify-2fa';
      const requestBody = twoFAType === 'totp' 
        ? {
            user_id: userIdNumber,
            code: data.code,
            remember_me: rememberMe,
          }
        : {
            user_id: userIdNumber,
            code: data.code,
          };

      const response = await api.post<Verify2FAResponse>(endpoint, requestBody);
      
      // Handle both token and access_token field names
      const token = response.data.token || (response.data as any).access_token;
      const refresh_token = response.data.refresh_token || (response.data as any).refresh_token;
      const userData = response.data.user;
      
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
      setCodeExpired(false); // Reset expired/invalid state on success
    } catch (error) {
      const errorMessage = getErrorMessage(error) || t('failed');
      const errorCode = getErrorCode(error);
      
      // Check if code expired or invalid using error code (only for email 2FA)
      const isExpiredOrInvalid = twoFAType === 'email' && (
        errorCode === TWO_FA_ERROR_CODES.CODE_EXPIRED || 
        errorCode === TWO_FA_ERROR_CODES.INVALID_CODE
      );
      
      if (isExpiredOrInvalid) {
        setCodeExpired(true);
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
        setCodeExpired(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend 2FA code function
  const handleResendCode = async () => {
    if (!userId || twoFAType !== 'email') {
      return;
    }

    // Convert user_id to number (uint) for backend
    const userIdNumber = parseInt(userId, 10);
    if (isNaN(userIdNumber) || userIdNumber <= 0) {
      toast.error(t('missingUserId'));
      return;
    }

    setIsResending(true);
    try {
      const response = await api.post<{ message: string }>('/auth/resend-2fa', {
        user_id: userIdNumber,
      });
      
      // Show success message
      const message = response.data.message || t('codeResent', { defaultValue: 'A new code has been sent to your email.' });
      toast.success(message);
      setCodeExpired(false);
      // Clear the input field
      setValue('code', '', { shouldValidate: false });
    } catch (error) {
      const errorMessage = getErrorMessage(error) || t('resendFailed', { defaultValue: 'Failed to resend code. Please try again.' });
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  // Format code input to only allow digits and limit to 6 characters
  // Update react-hook-form state immediately using setValue
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    // Update react-hook-form state immediately - this will trigger watch() to update
    setValue('code', value, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
  };

  if (!userId) {
    return (
      <>
        <Navigation />
        <main className="p-8 flex flex-col items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600">{t('loading')}</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="p-8 flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
            <p className="text-gray-600">
              {twoFAType === 'email' 
                ? t('emailDescription', { defaultValue: 'A 6-digit code has been sent to your email. Please enter it below.' })
                : t('totpDescription', { defaultValue: 'Enter the 6-digit code from your authenticator app.' })
              }
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate aria-label="2FA verification form">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                {t('codeLabel')}
              </label>
              <input
                type="text"
                id="code"
                name={name}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={codeValue || ''}
                onChange={handleCodeChange}
                onBlur={onBlur}
                ref={ref}
                suppressHydrationWarning
                placeholder="000000"
                aria-required="true"
                aria-invalid={errors.code ? 'true' : 'false'}
                aria-describedby={errors.code ? 'code-error' : undefined}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl tracking-widest font-mono"
                autoFocus
              />
              {errors.code && (
                <p id="code-error" className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
                  {errors.code.message}
                </p>
              )}
              {codeValue && codeValue.length === 6 && (
                <p className="mt-1 text-sm text-green-600">{t('codeComplete')}</p>
              )}
              {codeExpired && twoFAType === 'email' && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800 mb-2">
                    {t('codeExpiredOrInvalid', { defaultValue: 'The verification code has expired or is invalid.' })}
                  </p>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending}
                    className="text-sm font-medium text-red-700 hover:text-red-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? t('resending', { defaultValue: 'Sending...' }) : t('resendCode', { defaultValue: 'Resend Code' })}
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !codeValue || codeValue.length !== 6}
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

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600 mb-2">{t('noCode')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`${ROUTES.RECOVERY_LOGIN}?user_id=${userId}&remember_me=${rememberMe}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                {t('useRecoveryCode')}
              </Link>
              <span className="hidden sm:inline text-gray-400">|</span>
              <Link href={ROUTES.LOGIN} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                {t('backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Verify2FA;

