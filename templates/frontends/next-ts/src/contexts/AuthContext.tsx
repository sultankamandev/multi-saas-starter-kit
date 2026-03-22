'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, CancelTokenSource } from '@/lib/api';
import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { tokenCookie, refreshTokenCookie } from '@/lib/cookies';
import { User, AuthContextType, UserResponse } from '@/types/auth';
import { COOKIE_NAME, isValidLocale, type Locale } from '@/i18n/constants';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

function applyUserLanguageIfNeeded(userData: { language?: string }): void {
  const currentLocaleCookie = Cookies.get(COOKIE_NAME);
  if (!currentLocaleCookie && userData.language && isValidLocale(userData.language)) {
    Cookies.set(COOKIE_NAME, userData.language as Locale, {
      expires: 365,
      path: '/',
      sameSite: 'lax',
    });
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  const fetchUser = useCallback(async () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('New request initiated');
    }
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    cancelTokenRef.current = source;

    try {
      const response = await api.get<UserResponse>('/auth/me', {
        cancelToken: source.token,
      });
      const userData = 'user' in response.data ? response.data.user : response.data;
      const transformedUser: User = {
        ...userData,
        id: String(userData.id),
      };
      setUser(transformedUser);
      applyUserLanguageIfNeeded(userData);
    } catch (error) {
      if (axios.isCancel(error)) {
        return;
      }
      const status = (error as AxiosError<{ message?: string }>)?.response?.status;
      if (status === 401) {
        setToken(null);
        setUser(null);
        tokenCookie.remove();
        setLoading(false);
        cancelTokenRef.current = null;
        return;
      }
      console.error('Failed to fetch user:', error);
      setToken(null);
      setUser(null);
      tokenCookie.remove();
    } finally {
      setLoading(false);
      cancelTokenRef.current = null;
    }
  }, []);

  useEffect(() => {
    const savedToken = tokenCookie.get();
    if (savedToken) {
      setToken(savedToken);
      fetchUser();
    } else {
      setLoading(false);
    }
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, [fetchUser]);

  const login = useCallback(async (newToken: string, userData?: User, refreshToken?: string, rememberMe?: boolean) => {
    setToken(newToken);
    const tokenExpiration = rememberMe ? 7 : 1;
    tokenCookie.set(newToken, tokenExpiration);
    if (refreshToken) {
      const refreshTokenExpiration = rememberMe ? 7 : 1;
      refreshTokenCookie.set(refreshToken, refreshTokenExpiration);
    }
    if (userData) {
      setUser(userData);
      setLoading(false);
      applyUserLanguageIfNeeded(userData);
    } else {
      await fetchUser();
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    const refreshToken = refreshTokenCookie.get();
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch {
        // Ignore; clear client state regardless
      }
    }
    setUser(null);
    setToken(null);
    tokenCookie.remove();
    refreshTokenCookie.remove();
  }, []);

  const isAuthenticated = !!token && !!user;

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      isAuthenticated,
    }),
    [user, token, loading, login, logout, isAuthenticated]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

