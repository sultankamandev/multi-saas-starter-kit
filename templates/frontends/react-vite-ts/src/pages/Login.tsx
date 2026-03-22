import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import * as authService from "@/services/authService";
import { getErrorMessage } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import type { LoginFormData } from "@/types/auth";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { email_or_username: "", password: "", remember_me: false },
  });

  const rememberMe = watch("remember_me");
  const { buttonRef } = useGoogleSignIn({ rememberMe });

  const onSubmit = async (data: LoginFormData) => {
    setSubmitting(true);
    try {
      const result = await authService.login(data);

      if (result.requires2FA) {
        if (result.message) toast.success(result.message);
        const type = result.twoFAType || "totp";
        navigate(
          `${ROUTES.VERIFY_2FA}?user_id=${result.userId}&remember_me=${data.remember_me ?? false}&two_fa_type=${type}`
        );
        return;
      }

      await login(result.token, result.user, result.refreshToken, data.remember_me);
      toast.success(t("login.success"));
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      toast.error(getErrorMessage(error) || t("login.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t("login.title")}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="email_or_username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("login.emailOrUsername")}
            </label>
            <input
              id="email_or_username"
              type="text"
              autoComplete="username"
              {...register("email_or_username", {
                required: t("login.validation.emailRequired"),
              })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
              placeholder={t("login.emailOrUsernameHelper")}
            />
            {errors.email_or_username && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email_or_username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("login.password")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password", {
                required: t("login.validation.passwordRequired"),
              })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                {...register("remember_me")}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
              />
              {t("login.rememberMe")}
            </label>
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {t("login.forgotPassword")}
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            {submitting ? t("login.submitting") : t("login.submit")}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              {t("login.orContinueWith")}
            </span>
          </div>
        </div>

        <div ref={buttonRef} className="flex justify-center" />

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {t("login.noAccount")}{" "}
          <Link
            to={ROUTES.REGISTER}
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {t("login.registerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
