import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

export default function EcommercePage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.ecommerce')}</h1>
        <Button>Manage Store</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Store"><p className="text-gray-500">Store management</p></Card>
        <Card title="Orders"><p className="text-gray-500">Order management</p></Card>
        <Card title="Products"><p className="text-gray-500">Product listings</p></Card>
      </div>
    </div>
  );
}
