import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/routes";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
        {t("dashboard.welcomeBack")}, {user?.first_name}!
      </h1>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("dashboard.userInfo")}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">{t("dashboard.firstName")}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{user?.first_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">{t("dashboard.lastName")}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{user?.last_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">{t("dashboard.email")}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">{t("dashboard.role")}</dt>
              <dd className="font-medium text-gray-900 dark:text-white capitalize">{user?.role}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4">
          <Link
            to={ROUTES.PROFILE}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6
              shadow-sm hover:border-indigo-300 hover:shadow-md transition-all
              dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-600"
          >
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{t("dashboard.profile")}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.profileDescription")}</p>
            </div>
            <span className="text-gray-400 dark:text-gray-500">&rarr;</span>
          </Link>

          <Link
            to={ROUTES.SETUP_2FA}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6
              shadow-sm hover:border-indigo-300 hover:shadow-md transition-all
              dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-600"
          >
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{t("dashboard.setup2FA")}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.setup2FADescription")}</p>
            </div>
            <span className="text-gray-400 dark:text-gray-500">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
