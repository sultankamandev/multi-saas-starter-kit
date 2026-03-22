import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/routes";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { Verify2FAResponse } from "@/types/auth";

const CODE_LENGTH = 6;

export default function Verify2FA() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();

  const userId = params.get("user_id") ?? "";
  const rememberMe = params.get("remember_me") === "true";
  const twoFAType = (params.get("two_fa_type") ?? "email") as "email" | "totp";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const setDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  const code = digits.join("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== CODE_LENGTH) return;
    setLoading(true);
    try {
      const endpoint = twoFAType === "totp" ? "/auth/verify-totp-login" : "/auth/verify-2fa";
      const body =
        twoFAType === "totp"
          ? { user_id: userId, code, remember_me: rememberMe }
          : { user_id: userId, code };

      const { data } = await api.post<Verify2FAResponse>(endpoint, body);
      const token = data.token ?? data.access_token ?? "";
      await login(token, data.user, data.refresh_token, rememberMe);
      toast.success(t("verify2FA.success"));
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-2fa", { user_id: userId });
      toast.success(t("verify2FA.resendSuccess"));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t("verify2FA.title")}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {twoFAType === "totp" ? t("verify2FA.totpDescription") : t("verify2FA.emailDescription")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-14 w-12 rounded-lg border border-gray-300 text-center text-2xl font-semibold
                  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none
                  dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== CODE_LENGTH}
            className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm
              font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50
              disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <LoadingSpinner className="h-5 w-5 border-white" /> : t("verify2FA.verify")}
          </button>
        </form>

        <div className="flex flex-col items-center gap-3 text-sm">
          {twoFAType === "email" && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-indigo-600 hover:text-indigo-500 disabled:opacity-50 font-medium"
            >
              {resending ? t("verify2FA.resending") : t("verify2FA.resendCode")}
            </button>
          )}

          <Link
            to={`${ROUTES.RECOVERY_LOGIN}?user_id=${userId}&remember_me=${rememberMe}`}
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            {t("verify2FA.useRecoveryCode")}
          </Link>
        </div>
      </div>
    </div>
  );
}
