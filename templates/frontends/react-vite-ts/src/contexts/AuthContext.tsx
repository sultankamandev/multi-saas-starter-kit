import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios, { AxiosError, CancelTokenSource } from "axios";
import { api } from "@/lib/api";
import { tokenCookie, refreshTokenCookie, getCookie, setCookie } from "@/lib/cookies";
import type { User, AuthContextType, UserResponse } from "@/types/auth";
import { isValidLocale } from "@/i18n/config";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

function applyUserLanguage(userData: { language?: string }) {
  const cur = getCookie("i18next");
  if (!cur && userData.language && isValidLocale(userData.language)) {
    setCookie("i18next", userData.language, { expires: 365 });
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelRef = useRef<CancelTokenSource | null>(null);

  const fetchUser = useCallback(async () => {
    cancelRef.current?.cancel("New request");
    const source = axios.CancelToken.source();
    cancelRef.current = source;
    try {
      const { data } = await api.get<UserResponse>("/auth/me", { cancelToken: source.token });
      const ud = "user" in data ? data.user : data;
      setUser({ ...ud, id: String(ud.id) });
      applyUserLanguage(ud);
    } catch (error) {
      if (axios.isCancel(error)) return;
      setToken(null);
      setUser(null);
      tokenCookie.remove();
    } finally {
      setLoading(false);
      cancelRef.current = null;
    }
  }, []);

  useEffect(() => {
    const saved = tokenCookie.get();
    if (saved) { setToken(saved); fetchUser(); } else { setLoading(false); }
    return () => { cancelRef.current?.cancel("Unmounted"); };
  }, [fetchUser]);

  const login = useCallback(async (newToken: string, userData?: User, refreshToken?: string, rememberMe?: boolean) => {
    setToken(newToken);
    tokenCookie.set(newToken, rememberMe ? 7 : 1);
    if (refreshToken) refreshTokenCookie.set(refreshToken, rememberMe ? 7 : 1);
    if (userData) { setUser(userData); setLoading(false); applyUserLanguage(userData); }
    else await fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    const rt = refreshTokenCookie.get();
    if (rt) { try { await api.post("/auth/logout", { refresh_token: rt }); } catch {} }
    setUser(null);
    setToken(null);
    tokenCookie.remove();
    refreshTokenCookie.remove();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({ user, token, loading, login, logout, isAuthenticated: !!token && !!user }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
