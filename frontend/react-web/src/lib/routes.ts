export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  PROFILE: "/profile",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",
  VERIFY_2FA: "/verify-2fa",
  SETUP_2FA: "/setup-2fa",
  RECOVERY_LOGIN: "/recovery-login",
  ADMIN: "/admin",
} as const;

export function isPublicRoute(pathname: string): boolean {
  return [ROUTES.HOME, ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.FORGOT_PASSWORD, ROUTES.RESET_PASSWORD, ROUTES.VERIFY_EMAIL, ROUTES.VERIFY_2FA, ROUTES.RECOVERY_LOGIN].some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
}

export function isProtectedRoute(pathname: string): boolean {
  return [ROUTES.DASHBOARD, ROUTES.PROFILE, ROUTES.ADMIN, ROUTES.SETUP_2FA].some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
}
