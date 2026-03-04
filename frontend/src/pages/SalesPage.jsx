import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import api from '../api/client';

export default function SalesPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sales/orders/').then(r => setOrders(r.data.results || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'order_number', label: 'Order #' },
    { key: 'customer_name', label: t('common.name') },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> },
    { key: 'total', label: t('common.total'), render: v => `$${v}` },
    { key: 'order_date', label: t('common.date') },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.sales')}</h1>
        <Button>{t('common.create')} Order</Button>
      </div>
      <Card title="Sales Orders"><DataTable columns={columns} data={orders} loading={loading} /></Card>
    </div>
  );
}
