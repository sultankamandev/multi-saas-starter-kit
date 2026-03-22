import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Navigation() {
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
            {t("nav.appName")}
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                <span className="hidden sm:inline text-sm text-gray-700">
                  {t("nav.welcome", { name: user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "" })}
                </span>
                <Link to="/dashboard" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  {t("nav.dashboard")}
                </Link>
                {user?.role === "admin" && (
                  <Link to="/admin" className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">Admin</Link>
                )}
                <button onClick={() => { logout(); toast.success(t("common.logoutSuccess")); }} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors">
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">{t("nav.login")}</Link>
                <Link to="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">{t("nav.register")}</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
