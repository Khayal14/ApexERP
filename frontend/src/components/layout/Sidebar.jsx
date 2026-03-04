import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

const navItems = [
  { path: '/', icon: '📊', key: 'dashboard', exact: true },
  { path: '/finance', icon: '💰', key: 'finance' },
  { path: '/hr', icon: '👥', key: 'hr' },
  { path: '/crm', icon: '🤝', key: 'crm' },
  { path: '/inventory', icon: '📦', key: 'inventory' },
  { path: '/sales', icon: '🛒', key: 'sales' },
  { path: '/projects', icon: '📋', key: 'projects' },
  { path: '/manufacturing', icon: '🏭', key: 'manufacturing' },
  { path: '/marketing', icon: '📣', key: 'marketing' },
  { path: '/analytics', icon: '📈', key: 'analytics' },
  { path: '/ecommerce', icon: '🌐', key: 'ecommerce' },
  { path: '/settings', icon: '⚙️', key: 'settings' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation();

  return (
    <aside className={clsx(
      'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform lg:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full',
      '[dir=rtl] &:left-auto [dir=rtl] &:right-0'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">A</div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">ApexERP</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">v1.0.0</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map(item => (
            <li key={item.key}>
              <NavLink
                to={item.path}
                end={item.exact}
                onClick={onClose}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{t(`nav.${item.key}`)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Open Source ERP</p>
      </div>
    </aside>
  );
}
