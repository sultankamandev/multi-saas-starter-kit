'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <main className="p-8 flex justify-center items-center min-h-screen">
        <div className="text-lg">{tc('loading')}</div>
      </main>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    toast.success(tc('logoutSuccess', { defaultValue: 'Logged out successfully' }));
    router.push('/login');
  };

  return (
    <>
      <Navigation />
      <main className="p-8 flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          {t('logout')}
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">{t('welcomeBack')}</h2>
        
        <div className="space-y-3">
          <div>
            <span className="font-medium text-gray-700">{t('name')}:</span>
            <span className="ml-2 text-gray-900">{user?.first_name} {user?.last_name}</span>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">{t('email')}:</span>
            <span className="ml-2 text-gray-900">{user?.email}</span>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">{t('role')}:</span>
            <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">{t('features.title')}</h3>
        <p className="text-blue-800">
          {t('features.description')}
        </p>
      </div>
      </main>
    </>
  );
};

export default Dashboard;

