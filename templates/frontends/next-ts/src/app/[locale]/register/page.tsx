'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import { useTranslations, useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage, getValidationErrors } from '@/lib/api';
import Navigation from '@/components/Navigation';
import { RegisterFormData, RegisterResponse } from '@/types/auth';

const Register: React.FC = () => {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('register');
  const tv = useTranslations('register.validation');
  const { register, handleSubmit, formState: { errors }, watch, setError } = useForm<RegisterFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      // Remove confirmPassword from the data before sending
      const { confirmPassword, ...restData } = data;
      const registerData = {
        ...restData,
        language: locale
      };
      
      await api.post<RegisterResponse>('/auth/register', registerData);
      
      toast.success(t('success'));
      router.push(ROUTES.LOGIN);
    } catch (error) {
      // Check for validation errors and set them on the form fields
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        // Handle both string and string[] formats
        Object.keys(validationErrors).forEach((field) => {
          const errorValue = validationErrors[field];
          const errorMessage = Array.isArray(errorValue) ? errorValue[0] : errorValue;
          
          // Map API field names to form field names
          const formFieldName = field === 'password' ? 'password' :
                                field === 'email' ? 'email' :
                                field === 'first_name' ? 'first_name' :
                                field === 'last_name' ? 'last_name' :
                                field;
          
          setError(formFieldName as keyof RegisterFormData, {
            type: 'server',
            message: errorMessage
          });
        });
        
        // Show the first validation error in toast, or a general message
        const firstErrorField = Object.keys(validationErrors)[0];
        const firstErrorValue = validationErrors[firstErrorField];
        const firstErrorMessage = Array.isArray(firstErrorValue) ? firstErrorValue[0] : firstErrorValue;
        toast.error(firstErrorMessage);
      } else {
        // Show general error message
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
      <main className="p-8 flex flex-col gap-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-4">{t('title')}</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
              {t('firstName')}
            </label>
            <input
              {...register('first_name', { required: tv('firstNameRequired') })}
              type="text"
              id="first_name"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
              {t('lastName')}
            </label>
            <input
              {...register('last_name', { required: tv('lastNameRequired') })}
              type="text"
              id="last_name"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
            )}
          </div>
        </div>

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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            {t('password')}
          </label>
          <input
            {...register('password', { 
              required: tv('passwordRequired'),
              minLength: {
                value: 8,
                message: tv('passwordMinLength')
              }
            })}
            type="password"
            id="password"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            {t('confirmPassword')}
          </label>
          <input
            {...register('confirmPassword', { 
              required: tv('confirmPasswordRequired'),
              validate: value => value === password || tv('passwordsNotMatch')
            })}
            type="password"
            id="confirmPassword"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
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
              {t('submitting', { defaultValue: 'Registering...' })}
            </span>
          ) : (
            t('submit')
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600">
        {t('hasAccount')}{' '}
        <a href={ROUTES.LOGIN} className="font-medium text-indigo-600 hover:text-indigo-500">
          {t('loginLink')}
        </a>
      </p>
      </main>
    </>
  );
};

export default Register;

