import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import api from '../api/client';

export default function HRPage() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hr/employees/').then(r => setEmployees(r.data.results || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'employee_id', label: 'ID' },
    { key: 'full_name', label: t('common.name') },
    { key: 'department_name', label: 'Department' },
    { key: 'position_title', label: 'Position' },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> },
    { key: 'hire_date', label: 'Hire Date' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('hr.title')}</h1>
        <Button>{t('common.create')} Employee</Button>
      </div>
      <Card title={t('hr.employees')}><DataTable columns={columns} data={employees} loading={loading} /></Card>
    </div>
  );
}
