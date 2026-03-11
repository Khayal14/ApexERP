import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

/* ─── Navigation items ─── */
const navItems = [
  { path: '/',               icon: '📊', key: 'dashboard',     exact: true },
  { path: '/finance',        icon: '💰', key: 'finance' },
  { path: '/hr',             icon: '👥', key: 'hr' },
  { path: '/crm',            icon: '🤝', key: 'crm' },
  { path: '/inventory',      icon: '📦', key: 'inventory' },
  { path: '/sales',          icon: '🛒', key: 'sales' },
  { path: '/projects',       icon: '📋', key: 'projects' },
  { path: '/manufacturing',  icon: '🏭', key: 'manufacturing' },
  { path: '/marketing',      icon: '📣', key: 'marketing' },
  { path: '/analytics',      icon: '📈', key: 'analytics' },
  { path: '/ecommerce',      icon: '🌐', key: 'ecommerce' },
  { path: '/workflow',       icon: '🔄', key: 'workflow' },
  { path: '/pdf-editor',     icon: '📄', key: 'pdfEditor' },
  { path: '/settings',       icon: '⚙️', key: 'settings' },
];

/* ─── Branch colours (consistent per branch) ─── */
function branchColor(id) {
  if (!id || id === 'all') return 'bg-primary-600';
  // Simple deterministic colour from the UUID's last char
  const colours = [
    'bg-blue-600', 'bg-green-600', 'bg-purple-600',
    'bg-rose-600',  'bg-amber-600', 'bg-teal-600',
  ];
  const idx = id.charCodeAt(id.length - 1) % colours.length;
  return colours[idx];
}

/* ─── BranchSwitcher ─── */
function BranchSwitcher() {
  const { branches, activeBranchId, activeBranch, switchBranch } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayName = activeBranchId === 'all'
    ? 'All Branches'
    : (activeBranch?.name || 'Gamma International');

  const displayCity = activeBranchId === 'all'
    ? 'Consolidated View'
    : (activeBranch?.city ? `${activeBranch.city}, ${activeBranch.country || ''}`.trim().replace(/,$/, '') : 'Select branch');

  const initial = displayName.charAt(0).toUpperCase();
  const colorClass = branchColor(activeBranchId === 'all' ? null : activeBranchId);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* Branch avatar */}
        <div className={`w-9 h-9 ${colorClass} rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0`}>
          {initial}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
            {displayName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {displayCity}
          </p>
        </div>

        {/* Caret */}
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-xl shadow-lg overflow-hidden">

          {/* "All Branches" option */}
          <button
            type="button"
            onClick={() => { switchBranch('all'); setOpen(false); }}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
              activeBranchId === 'all'
                ? 'bg-primary-50 dark:bg-primary-900/30'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700',
            )}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={clsx('text-sm font-semibold truncate',
                activeBranchId === 'all' ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'
              )}>
                All Branches
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Consolidated view</p>
            </div>
            {activeBranchId === 'all' && (
              <svg className="w-4 h-4 text-primary-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Divider */}
          {branches.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 mx-3" />
          )}

          {/* Individual branch options */}
          {branches.map(branch => {
            const isActive = activeBranchId === branch.id;
            const color = branchColor(branch.id);
            const location = [branch.city, branch.country].filter(Boolean).join(', ');
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => { switchBranch(branch.id); setOpen(false); }}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700',
                )}
              >
                <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                  {branch.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={clsx('text-sm font-semibold truncate',
                    isActive ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'
                  )}>
                    {branch.name}
                  </p>
                  {location && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{location}</p>
                  )}
                </div>
                {isActive && (
                  <svg className="w-4 h-4 text-primary-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}

          {/* Empty state (no branches assigned yet) */}
          {branches.length === 0 && (
            <div className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">
              No branches configured yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/* ─── Main Sidebar ─── */
export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation();

  return (
    <aside className={clsx(
      'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform lg:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full',
      '[dir=rtl] &:left-auto [dir=rtl] &:right-0'
    )}>

      {/* ── Branch Switcher (replaces old company branding) ── */}
      <BranchSwitcher />

      {/* ── Navigation ── */}
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

      {/* ── Footer ── */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Powered by ApexERP v1.0</p>
      </div>
    </aside>
  );
}
