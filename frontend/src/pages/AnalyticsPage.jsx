import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';

export default function AnalyticsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.analytics')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Revenue Trends"><div className="h-64 flex items-center justify-center text-gray-400">Chart placeholder</div></Card>
        <Card title="Sales Pipeline"><div className="h-64 flex items-center justify-center text-gray-400">Chart placeholder</div></Card>
        <Card title="Inventory Levels"><div className="h-64 flex items-center justify-center text-gray-400">Chart placeholder</div></Card>
        <Card title="HR Overview"><div className="h-64 flex items-center justify-center text-gray-400">Chart placeholder</div></Card>
      </div>
    </div>
  );
}
