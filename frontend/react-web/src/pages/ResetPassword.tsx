import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { ROUTES } from "@/lib/routes";

interface ResetPasswordForm {
  new_password: string;
  confirmPassword: string;
}

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    defaultValues: { new_password: "", confirmPassword: "" },
  });

  const newPassword = watch("new_password");

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      toast.error(t("resetPassword.invalidToken"));
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: data.new_password,
      });
      toast.success(t("resetPassword.success"));
      navigate(ROUTES.LOGIN);
    } catch (error) {
      toast.error(getErrorMessage(error) || t("resetPassword.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-300">
              {t("resetPassword.invalidToken")}
            </p>
          </div>
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {t("resetPassword.requestNewLink")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t("resetPassword.title")}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("resetPassword.description")}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("resetPassword.newPassword")}
            </label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              {...register("new_password", {
                required: t("resetPassword.validation.passwordRequired"),
                minLength: { value: 8, message: t("resetPassword.validation.passwordMin") },
              })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
            />
            {errors.new_password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.new_password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("resetPassword.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword", {
                required: t("resetPassword.validation.confirmPasswordRequired"),
                validate: (value) =>
                  value === newPassword || t("resetPassword.validation.passwordsMismatch"),
              })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            {submitting ? t("resetPassword.submitting") : t("resetPassword.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
