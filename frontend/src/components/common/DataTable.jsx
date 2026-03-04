import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function DataTable({ columns, data, onRowClick, loading, emptyMessage }) {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = sortField ? [...(data || [])].sort((a, b) => {
    const aVal = a[sortField], bVal = b[sortField];
    const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? cmp : -cmp;
  }) : data;

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" /></div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map(col => (
              <th key={col.key} onClick={() => col.sortable !== false && handleSort(col.key)}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                <span className="flex items-center gap-1">
                  {col.label}
                  {sortField === col.key && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {(!sorted || sorted.length === 0) ? (
            <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
              {emptyMessage || t('common.no_data')}
            </td></tr>
          ) : sorted.map((row, i) => (
            <tr key={row.id || i} onClick={() => onRowClick?.(row)}
              className="hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors">
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
