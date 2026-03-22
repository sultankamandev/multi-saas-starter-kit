'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const Navigation: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const t = useTranslations('nav');
  const tc = useTranslations('common');

  return (
    <nav 
      className="bg-white shadow-sm border-b sticky top-0 z-40"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
              aria-label={`${t('appName')} - Home`}
            >
              {t('appName')}
            </Link>
          </div>
          
          <div className="flex items-center gap-4" role="menubar">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {isAuthenticated ? (
              <>
                <span className="hidden sm:inline text-sm text-gray-700" aria-live="polite">
                  {t('welcome', { 
                    name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '' 
                  })}
                </span>
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  role="menuitem"
                  aria-label={t('dashboard')}
                >
                  {t('dashboard')}
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    role="menuitem"
                    aria-label="Admin Panel"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => {
                    logout();
                    toast.success(tc('logoutSuccess', { defaultValue: 'Logged out successfully' }));
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label={t('logout')}
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  role="menuitem"
                  aria-label={t('login')}
                >
                  {t('login')}
                </Link>
                <Link
                  href="/register"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  role="menuitem"
                  aria-label={t('register')}
                >
                  {t('register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

