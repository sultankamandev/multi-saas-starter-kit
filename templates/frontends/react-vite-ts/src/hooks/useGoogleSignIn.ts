import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/routes";
import type { GoogleLoginResponse } from "@/types/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement | null, options: Record<string, unknown>) => void;
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
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    try {
      const { data } = await api.post<GoogleLoginResponse>("/auth/google-login", {
        token: response.credential,
        remember_me: options.rememberMe || false,
      });
      if ((data.requires_2fa || data.two_fa_type) && data.user_id) {
        if (data.message) toast.success(data.message);
        const type = data.two_fa_type || "totp";
        navigate(`${ROUTES.VERIFY_2FA}?user_id=${data.user_id}&remember_me=${options.rememberMe || false}&two_fa_type=${type}`);
        return;
      }
      const finalToken = data.token || data.access_token;
      if (!finalToken) throw new Error("No token received");
      await login(finalToken, data.user || undefined, data.refresh_token, options.rememberMe);
      toast.success(t("login.googleLoginSuccessGeneric"));
      options.onSuccess ? options.onSuccess() : navigate(ROUTES.DASHBOARD);
    } catch (error) {
      toast.error(getErrorMessage(error) || t("login.googleLoginFailed"));
    }
  }, [login, navigate, options.rememberMe, options.onSuccess, t]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    const init = () => {
      if (isInitialized.current || !window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCallback });
      window.google.accounts.id.renderButton(buttonRef.current, { theme: "outline", size: "large", text: "signin_with", width: "100%" });
      isInitialized.current = true;
    };
    if (window.google) { init(); } else {
      const iv = setInterval(() => { if (window.google) { clearInterval(iv); init(); } }, 100);
      setTimeout(() => clearInterval(iv), 10000);
    }
  }, [handleGoogleCallback]);

  return { buttonRef };
};
