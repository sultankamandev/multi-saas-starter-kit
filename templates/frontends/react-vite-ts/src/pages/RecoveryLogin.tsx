import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/routes";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { RecoveryLoginResponse } from "@/types/auth";

export default function RecoveryLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();

  const userId = params.get("user_id") ?? "";
  const rememberMe = params.get("remember_me") === "true";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post<RecoveryLoginResponse>("/auth/verify-recovery-code", {
        user_id: userId,
        code: code.trim(),
        remember_me: rememberMe,
      });
      const token = data.token ?? data.access_token ?? "";
      await login(token, data.user, data.refresh_token, rememberMe);
      toast.success(t("recoveryLogin.success"));
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t("recoveryLogin.title")}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("recoveryLogin.description")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="recovery-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("recoveryLogin.codeLabel")}
            </label>
            <input
              id="recovery-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("recoveryLogin.codePlaceholder")}
              autoFocus
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none
                dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3
              text-sm font-semibold text-white shadow-sm hover:bg-indigo-500
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <LoadingSpinner className="h-5 w-5 border-white" /> : t("recoveryLogin.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
