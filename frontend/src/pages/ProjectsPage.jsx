import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import api from '../api/client';

export default function ProjectsPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects/projects/').then(r => setProjects(r.data.results || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: t('common.name') },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> },
    { key: 'priority', label: 'Priority' },
    { key: 'progress', label: 'Progress', render: v => `${v}%` },
    { key: 'manager_name', label: 'Manager' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.projects')}</h1>
        <Button>{t('common.create')} Project</Button>
      </div>
      <Card title="Projects"><DataTable columns={columns} data={projects} loading={loading} /></Card>
    </div>
  );
}
