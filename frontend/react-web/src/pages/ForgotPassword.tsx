import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { ROUTES } from "@/lib/routes";

interface ForgotPasswordForm {
  email: string;
}

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email: data.email });
    } catch {
      // Always show success to prevent email enumeration
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      toast.success(t("forgotPassword.success"));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t("forgotPassword.title")}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("forgotPassword.description")}
          </p>
        </div>

        {submitted ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm text-green-700 dark:text-green-300">
              {t("forgotPassword.success")}
            </p>
            <Link
              to={ROUTES.LOGIN}
              className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {t("forgotPassword.backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("forgotPassword.email")}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email", {
                  required: t("forgotPassword.validation.emailRequired"),
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: t("forgotPassword.validation.emailInvalid"),
                  },
                })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
            >
              {submitting ? t("forgotPassword.submitting") : t("forgotPassword.submit")}
            </button>

            <div className="text-center">
              <Link
                to={ROUTES.LOGIN}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t("forgotPassword.backToLogin")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
