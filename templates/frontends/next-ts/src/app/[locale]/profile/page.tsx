'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Navigation from '@/components/Navigation';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

// Common countries list with ISO codes (same as registration)
const COUNTRIES = [
  { code: '', name: '' }, // Empty option for placeholder
  { code: 'TR', name: 'Turkey' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'GR', name: 'Greece' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IE', name: 'Ireland' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
];

interface ProfileFormData {
  username: string;
  first_name: string;
  last_name: string;
  language: string;
  country: string;
  address: string;
  phone: string;
  two_fa_enabled: boolean;
}

const Profile: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const t = useTranslations('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    username: '',
    first_name: '',
    last_name: '',
    language: '',
    country: '',
    address: '',
    phone: '',
    two_fa_enabled: false,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      const response = await api.get<{ user: any }>('/api/user/profile');
      const userData = response.data.user;
      
      setFormData({
        username: userData.username || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        language: userData.language || 'en',
        country: userData.country || '',
        address: userData.address || '',
        phone: userData.phone || '',
        two_fa_enabled: userData.two_fa_enabled || false,
      });
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      toast.error(t('failedToLoadProfile'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Build payload - ensure two_fa_enabled is always included
      const payload: any = {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        language: formData.language,
        country: formData.country,
        address: formData.address,
        phone: formData.phone,
      };

      // Always include two_fa_enabled (even if false) so backend knows to update it
      payload.two_fa_enabled = formData.two_fa_enabled;

      await api.put('/api/user/profile', payload);
      
      // Refresh profile data
      await fetchProfile();
      
      toast.success(t('profileUpdatedSuccessfully'));
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      const errorMessage = error.response?.data?.error || t('failedToUpdateProfile');
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Don't render anything if not authenticated (will redirect)
  if (!authLoading && !isAuthenticated) {
    return null;
  }

  // Show loading while checking authentication or fetching profile
  if (authLoading || loading) {
    return (
      <>
        <Navigation />
        <main className="p-8 flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('loadingProfile')}</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('title')}</h1>
            <p className="text-gray-600">Manage your personal information and security settings</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Card */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-white">{t('personalInfo')}</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('firstName')}
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-400"
                      placeholder={t('firstName')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('lastName')}
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-400"
                      placeholder={t('lastName')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('language')}
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%234f46e5' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.75rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.25em 1.25em',
                        paddingRight: '2.75rem'
                      }}
                    >
                      <option value="en">English</option>
                      <option value="tr">Türkçe</option>
                      <option value="de">Deutsch</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('phone')}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('country')}
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%234f46e5' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.75rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.25em 1.25em',
                        paddingRight: '2.75rem'
                      }}
                    >
                      <option value="" className="text-gray-400">{t('selectCountry') || 'Select a country...'}</option>
                      {COUNTRIES.filter(c => c.code).map((country) => (
                        <option key={country.code} value={country.code} className="text-gray-900">
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('address')}
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 resize-none"
                      placeholder="Street address, City, State, ZIP"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Settings Card */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-white">{t('securitySettings')}</h2>
              </div>
              <div className="p-6">
                {/* Enable/Disable 2FA */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      id="two-fa-enabled"
                      checked={formData.two_fa_enabled}
                      onChange={(e) => setFormData({ ...formData, two_fa_enabled: e.target.checked })}
                      className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer transition-all"
                    />
                    <div className="flex-1">
                      <label htmlFor="two-fa-enabled" className="block text-sm font-semibold text-gray-900 cursor-pointer mb-1">
                        {t('enable2FA')}
                      </label>
                      <p className="text-sm text-gray-600">
                        {formData.two_fa_enabled 
                          ? t('twoFAEnabledDescription')
                          : t('twoFADisabledDescription')
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
              <Link
                href="/dashboard"
                className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center transition-all duration-200"
              >
                {t('cancel')}
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {saving ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('saving')}
                  </span>
                ) : (
                  t('saveChanges')
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
};

export default Profile;
