'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES, isPublicRoute } from '@/lib/routes';

interface AuthErrorContextType {
  handleUnauthorized: () => void;
}

const AuthErrorContext = createContext<AuthErrorContextType | undefined>(undefined);

export const useAuthError = () => {
  const context = useContext(AuthErrorContext);
  if (context === undefined) {
    throw new Error('useAuthError must be used within an AuthErrorProvider');
  }
  return context;
};

interface AuthErrorProviderProps {
  children: React.ReactNode;
}

/**
 * Provides error handling context for authentication errors
 * Allows API interceptors to trigger navigation without full page reload
 */
export const AuthErrorProvider: React.FC<AuthErrorProviderProps> = ({ children }) => {
  const router = useRouter();

  const handleUnauthorized = useCallback(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      // Only redirect if not already on a public route
      if (!isPublicRoute(currentPath)) {
        router.push(ROUTES.LOGIN);
      }
    }
  }, [router]);

  // Set the global handler so API interceptors can use it
  useEffect(() => {
    setGlobalUnauthorizedHandler(handleUnauthorized);
    return () => {
      setGlobalUnauthorizedHandler(() => {});
    };
  }, [handleUnauthorized]);

  return (
    <AuthErrorContext.Provider value={{ handleUnauthorized }}>
      {children}
    </AuthErrorContext.Provider>
  );
};

/**
 * Hook to get the error handler - can be used to set it in API interceptor
 * Note: This is a workaround since interceptors can't use React hooks directly
 */
let globalUnauthorizedHandler: (() => void) | null = null;

export function setGlobalUnauthorizedHandler(handler: () => void) {
  globalUnauthorizedHandler = handler;
}

export function getGlobalUnauthorizedHandler(): (() => void) | null {
  return globalUnauthorizedHandler;
}

