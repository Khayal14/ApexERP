import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import api from '../api/client';

export default function InventoryPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/inventory/products/').then(r => setProducts(r.data.results || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: t('common.name') },
    { key: 'category_name', label: 'Category' },
    { key: 'selling_price', label: 'Price', render: v => `$${v}` },
    { key: 'total_stock', label: 'Stock' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.inventory')}</h1>
        <Button>{t('common.create')} Product</Button>
      </div>
      <Card title="Products"><DataTable columns={columns} data={products} loading={loading} /></Card>
    </div>
  );
}
