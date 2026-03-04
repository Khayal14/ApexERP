import React from 'react';
import clsx from 'clsx';

const colors = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  open: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  won: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
};

export default function StatusBadge({ status }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      colors[status] || colors.draft
    )}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}
