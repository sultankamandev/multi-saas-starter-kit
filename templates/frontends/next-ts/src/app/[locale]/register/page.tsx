'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';
import { useTranslations, useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import { api, getErrorMessage, getValidationErrors } from '@/lib/api';
import Navigation from '@/components/Navigation';
import { RegisterFormData, RegisterResponse } from '@/types/auth';

const fieldClass =
  'mt-1.5 block min-h-11 w-full rounded-xl border border-border bg-elevated px-3.5 py-2.5 text-foreground shadow-sm outline-none transition placeholder:text-muted ring-0 focus:border-accent focus:ring-2 focus:ring-accent/20';

const labelClass = 'text-sm font-medium text-foreground';

const Register: React.FC = () => {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('register');
  const tv = useTranslations('register.validation');
  const { register, handleSubmit, formState: { errors }, watch, setError } = useForm<RegisterFormData>({
    defaultValues: {
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      const registerData = {
        username: data.username.trim(),
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        language: locale,
      };

      const { data: res } = await api.post<RegisterResponse>('/auth/register', registerData);

      toast.success(res?.message || t('success'));
      router.push(ROUTES.LOGIN);
    } catch (error) {
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        Object.keys(validationErrors).forEach((apiField) => {
          const errorValue = validationErrors[apiField];
          const errorMessage = Array.isArray(errorValue) ? errorValue[0] : errorValue;

          const formFieldName =
            apiField === 'password'
              ? 'password'
              : apiField === 'email'
                ? 'email'
                : apiField === 'first_name'
                  ? 'first_name'
                  : apiField === 'last_name'
                    ? 'last_name'
                    : apiField === 'username'
                      ? 'username'
                      : apiField;

          setError(formFieldName as keyof RegisterFormData, {
            type: 'server',
            message: errorMessage,
          });
        });

        const firstErrorField = Object.keys(validationErrors)[0];
        const firstErr = validationErrors[firstErrorField];
        const firstMsg = Array.isArray(firstErr) ? firstErr[0] : firstErr;
        toast.error(firstMsg);
      } else {
        const errorMessage = getErrorMessage(error) || t('failed');
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-[calc(100dvh-4.25rem)] bg-app-mesh bg-noise">
        <main className="mx-auto flex max-w-lg flex-col px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-3xl border border-border bg-elevated/95 p-6 shadow-[0_24px_80px_-28px_oklch(0.35_0.06_265_/_0.35)] backdrop-blur-md sm:p-8">
            <div className="mb-8 text-center">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t('title')}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {t('hasAccount')}{' '}
                <Link href={ROUTES.LOGIN} className="font-semibold text-accent hover:text-accent-hover">
                  {t('loginLink')}
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label htmlFor="username" className={labelClass}>
                  {t('username')}
                </label>
                <p className="mt-0.5 text-xs text-muted">{t('usernameHelper')}</p>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder={t('usernamePlaceholder')}
                  {...register('username', {
                    required: tv('usernameRequired'),
                    minLength: { value: 3, message: tv('usernameMinLength') },
                  })}
                  className={fieldClass}
                />
                {errors.username && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.username.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label htmlFor="first_name" className={labelClass}>
                    {t('firstName')}
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    autoComplete="given-name"
                    {...register('first_name', { required: tv('firstNameRequired') })}
                    className={fieldClass}
                  />
                  {errors.first_name && (
                    <p className="mt-1.5 text-sm text-red-600 ">{errors.first_name.message}</p>
                  )}
                </div>

                <div className="sm:col-span-1">
                  <label htmlFor="last_name" className={labelClass}>
                    {t('lastName')}
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    autoComplete="family-name"
                    {...register('last_name', { required: tv('lastNameRequired') })}
                    className={fieldClass}
                  />
                  {errors.last_name && (
                    <p className="mt-1.5 text-sm text-red-600 ">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>
                  {t('email')}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email', {
                    required: tv('emailRequired'),
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: tv('emailInvalid'),
                    },
                  })}
                  className={fieldClass}
                />
                {errors.email && (
                  <p className="mt-1.5 text-sm text-red-600 ">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
                  {t('password')}
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password', {
                    required: tv('passwordRequired'),
                    minLength: {
                      value: 8,
                      message: tv('passwordMinLength'),
                    },
                  })}
                  className={fieldClass}
                />
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-600 ">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className={labelClass}>
                  {t('confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword', {
                    required: tv('confirmPasswordRequired'),
                    validate: (value) => value === password || tv('passwordsNotMatch'),
                  })}
                  className={fieldClass}
                />
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-sm text-red-600 ">{errors.confirmPassword.message}</p>
                )}
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
                    {t('submitting')}
                  </span>
                ) : (
                  t('submit')
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
};

export default Register;
