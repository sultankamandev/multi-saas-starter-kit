import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { tokenCookie, refreshTokenCookie, getCookie, setCookie } from "@/lib/cookies";
import { api, setGlobalUnauthorizedHandler } from "@/lib/api";
import { login as loginApi, logout as logoutApi, type LoginResult } from "@/services/authService";
import type { User, LoginFormData, UserResponse } from "@/types/auth";
import { ROUTES } from "@/lib/routes";
import { isValidLocale } from "@/i18n";

function applyUserLanguage(userData: { language?: string }) {
  const cur = getCookie("vue-i18n-locale") || getCookie("i18next");
  if (!cur && userData.language && isValidLocale(userData.language)) {
    setCookie("vue-i18n-locale", userData.language, { expires: 365 });
  }
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(tokenCookie.get());
  const loading = ref(true);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === "admin");

  async function fetchUser() {
    if (!token.value) return;
    try {
      const { data } = await api.get<UserResponse>("/auth/me");
      const ud = "user" in data ? data.user : (data as User);
      user.value = { ...ud, id: String(ud.id) };
      applyUserLanguage(ud);
    } catch {
      token.value = null;
      user.value = null;
      tokenCookie.remove();
      refreshTokenCookie.remove();
    } finally {
      loading.value = false;
    }
  }

  async function login(credentials: LoginFormData): Promise<LoginResult> {
    const result = await loginApi(credentials);
    if (result.requires2FA) return result;
    if (result.token) {
      token.value = result.token;
      tokenCookie.set(result.token, 7);
      if (result.refreshToken) refreshTokenCookie.set(result.refreshToken, 7);
      if (result.user) user.value = result.user;
    }
    return result;
  }

  function completeLogin(newToken: string, userData?: User, refreshToken?: string, rememberMe = false) {
    token.value = newToken;
    tokenCookie.set(newToken, rememberMe ? 7 : 1);
    if (refreshToken) refreshTokenCookie.set(refreshToken, rememberMe ? 7 : 1);
    if (userData) {
      user.value = userData;
      applyUserLanguage(userData);
    } else {
      fetchUser();
    }
  }

  function setUser(u: User | null) {
    user.value = u;
  }

  function setToken(t: string | null) {
    token.value = t;
    if (t) tokenCookie.set(t, 7);
    else tokenCookie.remove();
  }

  async function logout() {
    const rt = refreshTokenCookie.get();
    if (rt) {
      try {
        await logoutApi(rt);
      } catch {
        /* ignore */
      }
      refreshTokenCookie.remove();
    }
    tokenCookie.remove();
    token.value = null;
    user.value = null;
  }

  function handleUnauthorized() {
    token.value = null;
    user.value = null;
    tokenCookie.remove();
    refreshTokenCookie.remove();
    window.location.href = ROUTES.LOGIN;
  }

  setGlobalUnauthorizedHandler(handleUnauthorized);

  return {
    user,
    token,
    loading,
    isAuthenticated,
    isAdmin,
    login,
    completeLogin,
    logout,
    setUser,
    setToken,
    fetchUser,
  };
});
