import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { ROUTES } from "@/lib/routes";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmail() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMessage(t("verifyEmail.invalidToken"));
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        if (cancelled) return;
        setState("success");
        toast.success(t("verifyEmail.success"));
      } catch (error) {
        if (cancelled) return;
        setState("error");
        setErrorMessage(getErrorMessage(error) || t("verifyEmail.failed"));
        toast.error(getErrorMessage(error) || t("verifyEmail.failed"));
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [token, t]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("verifyEmail.title")}
        </h1>

        {state === "loading" && (
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("verifyEmail.verifying")}
            </p>
          </div>
        )}

        {state === "success" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
              <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">
                {t("verifyEmail.successTitle")}
              </h2>
              <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                {t("verifyEmail.successMessage")}
              </p>
            </div>
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              {t("verifyEmail.goToLogin")}
            </Link>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-300">
                {errorMessage}
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Link
                to={ROUTES.LOGIN}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t("verifyEmail.goToLogin")}
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="text-sm font-medium text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {t("verifyEmail.registerAgain")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
