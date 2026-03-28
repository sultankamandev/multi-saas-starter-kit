'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/routes';
import { GoogleLoginResponse } from '@/types/auth';

// Extend Window interface for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement | null,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              width?: string | number;
              locale?: string;
            }
          ) => void;
          prompt: (callback?: (notification: { isNotDisplayed?: boolean; isSkippedMoment?: boolean; isDismissedMoment?: boolean }) => void) => void;
        };
      };
    };
  }
}

interface UseGoogleSignInOptions {
  onSuccess?: () => void;
  rememberMe?: boolean;
}

export const useGoogleSignIn = (options: UseGoogleSignInOptions = {}) => {
  const router = useRouter();
  const { login } = useAuth();
  const t = useTranslations('login');
  const buttonRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    try {
      const googleResponse = await api.post<GoogleLoginResponse>('/auth/google', {
        token: response.credential,
        remember_me: options.rememberMe || false,
      });

      const { token, access_token, refresh_token, user_id, requires_2fa, two_fa_type, user: userData, message } = googleResponse.data;

      // Check if 2FA is required - handle both requires_2fa flag and two_fa_type
      const needs2FA = requires_2fa || two_fa_type;
      
      if (needs2FA && user_id) {
        // Show message if provided (e.g., "Code sent to email")
        if (message) {
          toast.success(message);
        }
        
        // Redirect to 2FA verification page with type information
        const twoFAType = two_fa_type || (requires_2fa ? 'totp' : 'email');
        router.push(`${ROUTES.VERIFY_2FA}?user_id=${user_id}&remember_me=${options.rememberMe || false}&two_fa_type=${twoFAType}`);
        return;
      }

      const finalToken = token || access_token;
      if (!finalToken) {
        throw new Error('No token received from server');
      }

      const normalizedUser = userData ? { ...userData, id: String(userData.id) } : undefined;
      await login(finalToken, normalizedUser, refresh_token, options.rememberMe);

      // Show success message
      const userName = userData ? `${userData.first_name} ${userData.last_name}`.trim() : '';
      if (userName) {
        toast.success(t('googleLoginSuccess', { name: userName }));
      } else {
        toast.success(t('googleLoginSuccessGeneric'));
      }

      // Call optional success callback
      if (options.onSuccess) {
        options.onSuccess();
      } else {
        // Default redirect to dashboard
        router.push(ROUTES.DASHBOARD);
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error) || t('googleLoginFailed');
      toast.error(errorMessage);
    }
  }, [login, router, options.rememberMe, options.onSuccess, t]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work.');
      return;
    }

    // Wait for Google script to load
    const initGoogleSignIn = () => {
      if (isInitialized.current || !window.google || !buttonRef.current) {
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCallback,
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: '100%',
        });

        isInitialized.current = true;
      } catch (error) {
        console.error('Failed to initialize Google Sign-In:', error);
      }
    };

    // Check if Google script is already loaded
    if (window.google) {
      initGoogleSignIn();
    } else {
      // Wait for script to load
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle);
          initGoogleSignIn();
        }
      }, 100);

      // Cleanup after 10 seconds if script doesn't load
      setTimeout(() => {
        clearInterval(checkGoogle);
      }, 10000);
    }
  }, [handleGoogleCallback]);

  return { buttonRef };
};

