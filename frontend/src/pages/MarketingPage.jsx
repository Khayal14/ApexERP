import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import api from '../api/client';

const emptyCampaign = { name: '', campaign_type: 'email', status: 'draft', start_date: '', end_date: '', budget: '', target_audience: '', description: '' };

export default function MarketingPage() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyCampaign);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    api.get('/marketing/campaigns/').then(r => setCampaigns(r.data.results || []))
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...emptyCampaign });
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name || '', campaign_type: item.campaign_type || 'email', status: item.status || 'draft', start_date: item.start_date || '', end_date: item.end_date || '', budget: item.budget || '', target_audience: item.target_audience || '', description: item.description || '' });
    setError('');
    setShowModal(true);
  };

  const handleChange = (name, value) => setForm(f => ({ ...f, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editItem) {
        await api.put(`/marketing/campaigns/${editItem.id}/`, form);
      } else {
        await api.post('/marketing/campaigns/', form);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n') : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editItem || !confirm('Are you sure?')) return;
    try {
      await api.delete(`/marketing/campaigns/${editItem.id}/`);
      setShowModal(false);
      fetchData();
    } catch { setError('Failed to delete'); }
  };

  const columns = [
    { key: 'name', label: 'Campaign' },
    { key: 'campaign_type', label: 'Type' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'budget', label: 'Budget', render: v => v ? `$${Number(v).toLocaleString()}` : '-' },
    { key: 'start_date', label: 'Start' },
    { key: 'end_date', label: 'End' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.marketing')}</h1>
        <Button onClick={openCreate}>{t('common.create')} Campaign</Button>
      </div>

      <Card title="Campaigns">
        <DataTable columns={columns} data={campaigns} loading={loading} onRowClick={openEdit} />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? 'Edit' : 'New'} Campaign`} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg whitespace-pre-line">{error}</div>}

          <FormField label="Campaign Name" name="name" value={form.name} onChange={handleChange} required />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" name="campaign_type" type="select" value={form.campaign_type} onChange={handleChange} options={['email', 'social', 'paid_ads', 'seo', 'content', 'event']} />
            <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={['draft', 'active', 'paused', 'completed', 'cancelled']} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" name="start_date" type="date" value={form.start_date} onChange={handleChange} />
            <FormField label="End Date" name="end_date" type="date" value={form.end_date} onChange={handleChange} />
          </div>
          <FormField label="Budget ($)" name="budget" type="number" value={form.budget} onChange={handleChange} />
          <FormField label="Target Audience" name="target_audience" value={form.target_audience} onChange={handleChange} placeholder="e.g. Small business owners" />
          <FormField label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} />

          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>{editItem && <Button type="button" variant="danger" onClick={handleDelete}>Delete</Button>}</div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>{editItem ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
