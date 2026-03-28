import React from 'react';
import { Plus_Jakarta_Sans, Outfit } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthErrorProvider } from '@/contexts/AuthErrorContext';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/i18n/constants';
import { routing } from '@/i18n/routing';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(COOKIE_NAME)?.value;
  const locale = localeCookie || routing.defaultLocale;

  return (
    <html lang={locale} className={`${plusJakartaSans.variable} ${outfit.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <ErrorBoundary>
          <AuthErrorProvider>
            <AuthProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  className:
                    '!rounded-xl !border !border-border !bg-elevated/95 !text-foreground !shadow-lg !backdrop-blur-md',
                  style: {
                    boxShadow: '0 12px 40px -12px oklch(0.3 0.05 265 / 0.25)',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: 'oklch(0.55 0.16 155)',
                      secondary: 'oklch(0.99 0.01 95)',
                    },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: {
                      primary: 'oklch(0.55 0.2 25)',
                      secondary: 'oklch(0.99 0.01 95)',
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
