import { createRouter, createWebHistory } from "vue-router";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth";
import Layout from "@/components/Layout.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: Layout,
      children: [
        { path: "", name: "Landing", component: () => import("@/views/Landing.vue") },
        { path: "login", name: "Login", component: () => import("@/views/Login.vue") },
        { path: "register", name: "Register", component: () => import("@/views/Register.vue") },
        { path: "forgot-password", name: "ForgotPassword", component: () => import("@/views/ForgotPassword.vue") },
        { path: "reset-password", name: "ResetPassword", component: () => import("@/views/ResetPassword.vue") },
        { path: "verify-email", name: "VerifyEmail", component: () => import("@/views/VerifyEmail.vue") },
        { path: "verify-2fa", name: "Verify2FA", component: () => import("@/views/Verify2FA.vue") },
        { path: "recovery-login", name: "RecoveryLogin", component: () => import("@/views/RecoveryLogin.vue") },
        {
          path: "dashboard",
          name: "Dashboard",
          component: () => import("@/views/Dashboard.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "profile",
          name: "Profile",
          component: () => import("@/views/Profile.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "setup-2fa",
          name: "Setup2FA",
          component: () => import("@/views/Setup2FA.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "admin",
          name: "Admin",
          component: () => import("@/views/Admin/AdminLayout.vue"),
          meta: { requiresAuth: true, requiresAdmin: true },
          children: [
            { path: "", name: "AdminDashboard", component: () => import("@/views/Admin/AnalyticsDashboard.vue") },
            { path: "users", name: "UserList", component: () => import("@/views/Admin/UserList.vue") },
            { path: "users/create", name: "UserCreate", component: () => import("@/views/Admin/UserCreate.vue") },
            { path: "users/:id/edit", name: "UserEdit", component: () => import("@/views/Admin/UserEdit.vue") },
            { path: "actions", name: "ActionList", component: () => import("@/views/Admin/ActionList.vue") },
            { path: "blocked-ips", name: "BlockedIPList", component: () => import("@/views/Admin/BlockedIPList.vue") },
            { path: "settings", name: "SettingsList", component: () => import("@/views/Admin/SettingsList.vue") },
          ],
        },
      ],
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ name: "Login", query: { redirect: to.fullPath } });
    return;
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    next({ name: "Dashboard" });
    return;
  }
  next();
});

export default router;
