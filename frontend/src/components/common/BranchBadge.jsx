/**
 * BranchBadge
 * -----------
 * A small, reusable indicator showing which branch/company context is
 * currently active.  Drop it anywhere you want to remind the user which
 * branch's data they're looking at (page headers, card titles, etc.).
 *
 * Usage:
 *   import BranchBadge from '../components/common/BranchBadge';
 *   <BranchBadge />
 *
 * Props:
 *   className  – extra Tailwind classes (optional)
 *   size       – 'sm' | 'md' (default 'sm')
 */
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

export default function BranchBadge({ className = '', size = 'sm' }) {
  const { activeBranchId, activeBranch } = useAuth();

  const isAll = activeBranchId === 'all';
  const label = isAll ? 'All Branches' : (activeBranch?.name || 'Branch');
  const city  = !isAll && activeBranch?.city ? activeBranch.city : null;

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium border',
        isAll
          ? 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-800'
          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        sizes[size] || sizes.sm,
        className,
      )}
      title={city ? `${label} — ${city}` : label}
    >
      {/* Icon */}
      {isAll ? (
        <svg className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ) : (
        <svg className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )}
      <span className="truncate max-w-[10rem]">{label}</span>
    </span>
  );
}
