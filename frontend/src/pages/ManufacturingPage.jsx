import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

export default function ManufacturingPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.manufacturing')}</h1>
        <Button>New Production Order</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Production Orders"><p className="text-gray-500">Production order list</p></Card>
        <Card title="Work Centers"><p className="text-gray-500">Work center utilization</p></Card>
        <Card title="Quality Checks"><p className="text-gray-500">Quality dashboard</p></Card>
      </div>
    </div>
  );
}
