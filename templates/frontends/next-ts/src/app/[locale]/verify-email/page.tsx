'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import Navigation from '@/components/Navigation';
import { ROUTES } from '@/lib/routes';

const VerifyEmail: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('verifyEmail');
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      toast.error(t('missingToken'));
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setVerified(true);
        toast.success(t('success'));
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push(ROUTES.LOGIN);
        }, 3000);
      } catch (error) {
        const errorMessage = getErrorMessage(error) || t('failed');
        toast.error(errorMessage);
        setVerified(false);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [searchParams, router, t]);

  return (
    <>
      <Navigation />
      <main className="p-8 flex flex-col items-center justify-center min-h-screen">
        {loading ? (
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-lg text-gray-700">{t('verifying')}</p>
          </div>
        ) : verified ? (
          <div className="text-center max-w-md">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('successTitle')}</h1>
            <p className="text-gray-600 mb-8">{t('successMessage')}</p>
            <Link
              href={ROUTES.LOGIN}
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {t('goToLogin')}
            </Link>
          </div>
        ) : (
          <div className="text-center max-w-md">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('failedTitle')}</h1>
            <p className="text-gray-600 mb-8">{t('failedMessage')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={ROUTES.REGISTER}
                className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {t('registerAgain')}
              </Link>
              <Link
                href={ROUTES.LOGIN}
                className="inline-block bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                {t('goToLogin')}
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default VerifyEmail;

