import React from 'react';
import clsx from 'clsx';

const baseInput = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors';

export default function FormField({ label, name, type = 'text', value, onChange, error, required, options, placeholder, rows, className }) {
  const id = `field-${name}`;
  const handleChange = (e) => onChange(name, type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value);

  return (
    <div className={clsx('space-y-1', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {type === 'select' ? (
        <select id={id} name={name} value={value || ''} onChange={handleChange} className={baseInput} required={required}>
          <option value="">{placeholder || 'Select...'}</option>
          {(options || []).map(o => typeof o === 'string'
            ? <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1).replace(/_/g, ' ')}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
          )}
        </select>
      ) : type === 'textarea' ? (
        <textarea id={id} name={name} value={value || ''} onChange={handleChange} rows={rows || 3} placeholder={placeholder} className={baseInput} required={required} />
      ) : (
        <input id={id} name={name} type={type} value={value || ''} onChange={handleChange} placeholder={placeholder} className={baseInput} required={required} step={type === 'number' ? 'any' : undefined} />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
