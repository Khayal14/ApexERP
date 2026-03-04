import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import api from '../api/client';

export default function FinancePage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/finance/invoices/').catch(() => ({ data: { results: [] } })),
      api.get('/finance/invoices/summary/').catch(() => ({ data: {} })),
    ]).then(([inv, sum]) => {
      setInvoices(inv.data.results || []);
      setSummary(sum.data);
    }).finally(() => setLoading(false));
  }, []);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  const columns = [
    { key: 'invoice_number', label: '#' },
    { key: 'customer_name', label: t('common.name') },
    { key: 'invoice_type', label: 'Type' },
    { key: 'status', label: t('common.status'), render: (v) => <StatusBadge status={v} /> },
    { key: 'total', label: t('common.total'), render: (v) => fmt(v) },
    { key: 'due_date', label: 'Due Date' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finance.title')}</h1>
        <Button>{t('common.create')} Invoice</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="text-center"><p className="text-sm text-gray-500">{t('finance.total_revenue')}</p><p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{fmt(summary.total_invoiced)}</p></div></Card>
        <Card><div className="text-center"><p className="text-sm text-gray-500">{t('finance.outstanding')}</p><p className="text-xl font-bold text-yellow-600 mt-1">{fmt(summary.total_outstanding)}</p></div></Card>
        <Card><div className="text-center"><p className="text-sm text-gray-500">{t('finance.overdue')}</p><p className="text-xl font-bold text-red-600 mt-1">{summary.overdue_count || 0}</p></div></Card>
      </div>

      <Card title={t('finance.invoices')}>
        <DataTable columns={columns} data={invoices} loading={loading} />
      </Card>
    </div>
  );
}
