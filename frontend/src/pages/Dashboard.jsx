import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import api from '../api/client';

function KPICard({ title, value, change, icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change !== undefined && (
            <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${color || 'bg-primary-100 dark:bg-primary-900/30'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const { data: result } = await api.get('/analytics/dashboards/executive/');
        setData(result);
      } catch (err) {
        console.error('Dashboard fetch failed:', err);
        setData({
          revenue_this_month: 0, active_employees: 0,
          open_deals: 0, pipeline_value: 0, orders_this_month: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('auth.welcome')}, {user?.first_name || 'User'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.title')} - {new Date().toLocaleDateString()}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title={t('dashboard.revenue')} value={fmt(data?.revenue_this_month)} change={12} icon="💰" />
          <KPICard title={t('dashboard.orders')} value={data?.orders_this_month || 0} change={8} icon="🛒" />
          <KPICard title={t('dashboard.employees')} value={data?.active_employees || 0} icon="👥" />
          <KPICard title={t('dashboard.pipeline')} value={fmt(data?.pipeline_value)} change={-3} icon="📊" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={t('dashboard.revenue') + ' ' + t('dashboard.this_month')}>
          <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <p>Revenue chart will render here with Recharts</p>
          </div>
        </Card>
        <Card title={t('dashboard.deals')}>
          <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <p>Pipeline chart will render here with Recharts</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
