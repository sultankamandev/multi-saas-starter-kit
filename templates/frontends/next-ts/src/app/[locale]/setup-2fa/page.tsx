'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { UserRoute } from '@/components/UserRoute';
import Navigation from '@/components/Navigation';
import { ROUTES } from '@/lib/routes';
import { Verify2FAFormData, Verify2FASetupResponse } from '@/types/auth';

interface Setup2FAResponse {
  otpauth_url: string;
  secret: string;
  message: string;
}

const Setup2FA: React.FC = () => {
  const router = useRouter();
  const t = useTranslations('setup2FA');
  const tv = useTranslations('setup2FA.validation');
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<Verify2FAFormData>({
    mode: 'onChange',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  const codeValue = watch('code');

  const { ref, onBlur, name } = register('code', {
    required: tv('codeRequired'),
    minLength: { value: 6, message: tv('codeLength') },
    maxLength: { value: 6, message: tv('codeLength') },
    pattern: { value: /^\d{6}$/, message: tv('codeInvalid') },
  });

  const handleGenerateQR = async () => {
    setIsGenerating(true);
    try {
      const response = await api.post<Setup2FAResponse>('/auth/setup-2fa');
      setQrCodeUrl(response.data.otpauth_url);
      setSecret(response.data.secret);
      toast.success(t('qrGenerated'));
    } catch (error) {
      const errorMessage = getErrorMessage(error) || t('generateFailed');
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (data: Verify2FAFormData) => {
    if (!secret) {
      toast.error(t('noSecret'));
      return;
    }

    setIsVerifying(true);
    try {
      const response = await api.post<Verify2FASetupResponse>('/auth/verify-2fa-setup', {
        code: data.code,
      });

      if (response.data.recovery_codes) {
        setRecoveryCodes(response.data.recovery_codes);
      }
      setIsEnabled(true);
      toast.success(t('success'));
    } catch (error) {
      const errorMessage = getErrorMessage(error) || t('verifyFailed');
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setValue('code', value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const handleCopyCodes = () => {
    if (recoveryCodes) {
      navigator.clipboard.writeText(recoveryCodes.join('\n'));
      toast.success(t('codesCopied'));
    }
  };

  if (isEnabled && recoveryCodes) {
    return (
      <>
        <Navigation />
        <main className="p-8 flex flex-col items-center justify-center min-h-screen">
          <div className="max-w-md w-full">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('enabledSuccess')}</h1>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-yellow-800 mb-2">{t('recoveryCodesTitle')}</h2>
              <p className="text-sm text-yellow-700 mb-3">{t('recoveryCodesDescription')}</p>
              <div className="bg-white rounded p-3 font-mono text-sm space-y-1">
                {recoveryCodes.map((code, i) => (
                  <div key={i} className="text-gray-800">{code}</div>
                ))}
              </div>
              <p className="text-sm text-yellow-700 mt-3 font-medium">{t('recoveryCodesWarning')}</p>
              <button
                onClick={handleCopyCodes}
                className="mt-3 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
              >
                {t('copyCodes')}
              </button>
            </div>

            <button
              onClick={() => router.push(ROUTES.DASHBOARD)}
              className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {t('continueToDashboard')}
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <UserRoute>
      <Navigation />
      <main className="p-8 flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
            <p className="text-gray-600">{t('description')}</p>
          </div>

          {!qrCodeUrl ? (
            <button
              onClick={handleGenerateQR}
              disabled={isGenerating}
              className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isGenerating ? t('generating') : t('generateQR')}
            </button>
          ) : (
            <div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 text-center">
                <p className="text-sm text-gray-600 mb-4">{t('scanInstructions')}</p>
                <div className="flex justify-center mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                    alt="QR Code"
                    width={200}
                    height={200}
                  />
                </div>
                <div className="bg-gray-50 rounded p-3 mt-4">
                  <p className="text-xs text-gray-500 mb-1">{t('backupCode')}</p>
                  <code className="text-sm font-mono text-gray-800 break-all">{secret}</code>
                  <p className="text-xs text-gray-500 mt-1">{t('backupCodeNote')}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                    placeholder="000000"
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl tracking-widest font-mono"
                    autoFocus
                  />
                  {errors.code && (
                    <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || !codeValue || codeValue.length !== 6}
                  className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? t('verifying') : t('verifyAndEnable')}
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push(ROUTES.PROFILE)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              ← {t('loading')}
            </button>
          </div>
        </div>
      </main>
    </UserRoute>
  );
};

export default Setup2FA;
