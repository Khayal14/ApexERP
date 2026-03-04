import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, language, setLanguage } = useTheme();
  const { user } = useAuth();

  return (
    <div className="space-y-6 fade-in max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.settings')}</h1>

      <Card title={t('common.profile')}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.full_name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Appearance">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-gray-900 dark:text-white">Theme</p><p className="text-sm text-gray-500">Choose your preferred theme</p></div>
            <select value={theme} onChange={e => setTheme(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-gray-900 dark:text-white">{t('common.language')}</p><p className="text-sm text-gray-500">Choose display language</p></div>
            <select value={language} onChange={e => { setLanguage(e.target.value); i18n.changeLanguage(e.target.value); }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}
