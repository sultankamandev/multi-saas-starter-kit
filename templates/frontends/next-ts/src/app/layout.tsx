import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthErrorProvider } from '@/contexts/AuthErrorContext';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/i18n/constants';
import { routing } from '@/i18n/routing';
import './globals.css';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(COOKIE_NAME)?.value;
  const locale = localeCookie || routing.defaultLocale;

  return (
    <html lang={locale}>
      <body>
        <ErrorBoundary>
          <AuthErrorProvider>
            <AuthProvider>
              {children}
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#4ade80',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </AuthProvider>
          </AuthErrorProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}