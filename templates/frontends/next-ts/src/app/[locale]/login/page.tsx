'use client';

import React, { useState } from 'react';
import Script from 'next/script';
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

const fieldClass =
  'mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-elevated px-3.5 py-2.5 text-foreground shadow-sm outline-none transition placeholder:text-muted ring-0 focus:border-accent focus:ring-2 focus:ring-accent/20';

const labelClass = 'text-sm font-medium text-foreground';

const Login: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const t = useTranslations('login');
  const tv = useTranslations('login.validation');
  const tvReg = useTranslations('register.validation');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rememberMe = !!watch('remember_me');
  const { buttonRef } = useGoogleSignIn({ rememberMe });
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email_or_username: data.email_or_username.trim(),
        password: data.password,
        remember_me: data.remember_me || false,
      });
      const body = response.data;
      const { access_token, token: legacyToken, refresh_token, user_id, requires_2fa, two_fa_type, user: userData } =
        body;

      const pending2FA =
        user_id != null &&
        (requires_2fa === true || two_fa_type === 'email' || two_fa_type === 'totp');
      if (pending2FA) {
        const q = new URLSearchParams({
          user_id: String(user_id),
          remember_me: String(data.remember_me || false),
        });
        if (two_fa_type) {
          q.set('two_fa_type', two_fa_type);
        }
        router.push(`${ROUTES.VERIFY_2FA}?${q.toString()}`);
        return;
      }

      const accessToken = access_token || legacyToken;
      if (!accessToken) {
        throw new Error('No token received from server');
      }

      const normalizedUser = userData ? { ...userData, id: String(userData.id) } : undefined;

      await login(accessToken, normalizedUser, refresh_token, data.remember_me);

      const redirectTo = searchParams.get('redirect') || ROUTES.DASHBOARD;
      router.replace(redirectTo);
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
      {googleClientId ? (
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      ) : null}
      <Navigation />
      <div className="min-h-[calc(100dvh-4.25rem)] bg-app-mesh bg-noise">
        <main className="mx-auto flex max-w-md flex-col px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-3xl border border-border bg-elevated/95 p-6 shadow-[0_24px_80px_-28px_oklch(0.35_0.06_265_/_0.35)] backdrop-blur-md sm:p-8">
            <div className="mb-8 text-center">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t('title')}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {t('noAccount')}{' '}
                <Link
                  href={ROUTES.REGISTER}
                  className="font-semibold text-accent hover:text-accent-hover"
                >
                  {t('registerLink')}
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate aria-label="Login form">
              <div>
                <label htmlFor="email" className={labelClass}>
                  {t('email')}
                </label>
                <input
                  {...register('email_or_username', {
                    required: tv('emailRequired'),
                    validate: (value) => {
                      const v = value.trim();
                      if (v.includes('@')) {
                        return (
                          /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v) || tv('emailInvalid')
                        );
                      }
                      if (v.length < 3) {
                        return tvReg('usernameMinLength');
                      }
                      return true;
                    },
                  })}
                  type="text"
                  id="email"
                  autoComplete="username"
                  aria-required="true"
                  aria-invalid={errors.email_or_username ? 'true' : 'false'}
                  aria-describedby={errors.email_or_username ? 'email-error' : undefined}
                  className={fieldClass}
                />
                {errors.email_or_username && (
                  <p id="email-error" className="mt-1.5 text-sm text-red-600" role="alert" aria-live="polite">
                    {errors.email_or_username.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
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
                  className={fieldClass}
                />
                {errors.password && (
                  <p id="password-error" className="mt-1.5 text-sm text-red-600" role="alert" aria-live="polite">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    {...register('remember_me')}
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
                  />
                  <span className="text-sm text-muted">{t('rememberMe')}</span>
                </label>
                <Link
                  href={ROUTES.FORGOT_PASSWORD}
                  className="text-sm font-semibold text-accent hover:text-accent-hover"
                >
                  {t('forgotPassword')}
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {t('submitting', { defaultValue: 'Logging in...' })}
                  </span>
                ) : (
                  t('submit')
                )}
              </button>
            </form>

            {googleClientId ? (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden>
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-elevated/95 px-2 text-muted">{t('orContinueWith', { defaultValue: 'Or continue with' })}</span>
                  </div>
                </div>
                <div ref={buttonRef} className="flex min-h-[44px] w-full justify-center" />
              </>
            ) : null}
          </div>
        </main>
      </div>
    </>
  );
};

export default Login;
