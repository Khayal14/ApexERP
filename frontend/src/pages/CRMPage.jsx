import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import api from '../api/client';

export default function CRMPage() {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/crm/contacts/').then(r => setContacts(r.data.results || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'full_name', label: t('common.name') },
    { key: 'email', label: t('common.email') },
    { key: 'company_name', label: 'Company' },
    { key: 'contact_type', label: 'Type', render: v => <StatusBadge status={v} /> },
    { key: 'ai_lead_score', label: 'Score', render: v => v ? `${v}/100` : '-' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('crm.title')}</h1>
        <Button>{t('common.create')} Contact</Button>
      </div>
      <Card title={t('crm.contacts')}><DataTable columns={columns} data={contacts} loading={loading} /></Card>
    </div>
  );
}
