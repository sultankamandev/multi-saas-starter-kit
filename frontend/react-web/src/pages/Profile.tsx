import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/api";
import { getProfile, updateProfile, mapProfileToFormData } from "@/services/userService";
import { COUNTRIES } from "@/constants/countries";
import { SUPPORTED_LOCALES, LOCALE_DISPLAY_CONFIG } from "@/i18n/config";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { ProfileUpdatePayload } from "@/types/auth";

type FormValues = ProfileUpdatePayload & { two_fa_enabled: boolean };

export default function Profile() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>();

  const twoFaEnabled = watch("two_fa_enabled");

  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfile();
        reset(mapProfileToFormData(profile));
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [reset]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload: ProfileUpdatePayload = {
        username: values.username,
        first_name: values.first_name,
        last_name: values.last_name,
        language: values.language,
        country: values.country,
        address: values.address,
        phone: values.phone,
        two_fa_enabled: values.two_fa_enabled,
      };
      const updated = await updateProfile(payload);
      reset(mapProfileToFormData(updated));
      toast.success(t("profile.saved"));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
        {t("profile.title")}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("profile.username")}
            </label>
            <input
              id="username"
              {...register("username", { required: t("profile.required") })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none
                dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("profile.firstName")}
            </label>
            <input
              id="first_name"
              {...register("first_name", { required: t("profile.required") })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none
                dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            {errors.first_name && (
              <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("profile.lastName")}
            </label>
            <input
              id="last_name"
              {...register("last_name", { required: t("profile.required") })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none
                dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            {errors.last_name && (
              <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("profile.language")}
            </label>
            <select
              id="language"
              {...register("language")}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none
                dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <option key={loc} value={loc}>
                  {LOCALE_DISPLAY_CONFIG[loc].flag} {LOCALE_DISPLAY_CONFIG[loc].name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("profile.country")}
            </label>
            <select
              id="country"
              {...register("country")}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none
                dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name || t("profile.selectCountry")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("profile.phone")}
            </label>
            <input
              id="phone"
              type="tel"
              {...register("phone")}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none
                dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("profile.address")}
          </label>
          <textarea
            id="address"
            rows={3}
            {...register("address")}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm
              focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none
              dark:border-gray-600 dark:bg-gray-800 dark:text-white resize-none"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t("profile.twoFactorAuth")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("profile.twoFactorDescription")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={twoFaEnabled}
            onClick={() => setValue("two_fa_enabled", !twoFaEnabled, { shouldDirty: true })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2
              border-transparent transition-colors duration-200 ease-in-out focus:outline-none
              focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
              ${twoFaEnabled ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-600"}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
                ring-0 transition-transform duration-200 ease-in-out
                ${twoFaEnabled ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>

        <button
          type="submit"
          disabled={saving || !isDirty}
          className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3
            text-sm font-semibold text-white shadow-sm hover:bg-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <LoadingSpinner className="h-5 w-5 border-white" /> : t("profile.save")}
        </button>
      </form>
    </div>
  );
}
