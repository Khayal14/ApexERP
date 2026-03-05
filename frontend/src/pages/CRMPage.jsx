import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import api from '../api/client';

const emptyContact = { first_name: '', last_name: '', email: '', phone: '', company_name: '', contact_type: 'lead', source: '', notes: '' };
const emptyDeal = { name: '', contact: '', value: '', stage: 'qualification', expected_close_date: '', notes: '' };

export default function CRMPage() {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('contacts');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyContact);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/crm/contacts/').catch(() => ({ data: { results: [] } })),
      api.get('/crm/deals/').catch(() => ({ data: { results: [] } })),
    ]).then(([c, d]) => {
      setContacts(c.data.results || []);
      setDeals(d.data.results || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm(tab === 'contacts' ? { ...emptyContact } : { ...emptyDeal });
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    if (tab === 'contacts') {
      setForm({ first_name: item.first_name || '', last_name: item.last_name || '', email: item.email || '', phone: item.phone || '', company_name: item.company_name || '', contact_type: item.contact_type || 'lead', source: item.source || '', notes: item.notes || '' });
    } else {
      setForm({ name: item.name || '', contact: item.contact || '', value: item.value || '', stage: item.stage || 'qualification', expected_close_date: item.expected_close_date || '', notes: item.notes || '' });
    }
    setError('');
    setShowModal(true);
  };

  const handleChange = (name, value) => setForm(f => ({ ...f, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const endpoint = tab === 'contacts' ? '/crm/contacts/' : '/crm/deals/';
      if (editItem) {
        await api.put(`${endpoint}${editItem.id}/`, form);
      } else {
        await api.post(endpoint, form);
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
    if (!editItem || !confirm('Are you sure you want to delete this?')) return;
    try {
      const endpoint = tab === 'contacts' ? '/crm/contacts/' : '/crm/deals/';
      await api.delete(`${endpoint}${editItem.id}/`);
      setShowModal(false);
      fetchData();
    } catch { setError('Failed to delete'); }
  };

  const contactCols = [
    { key: 'full_name', label: t('common.name') },
    { key: 'email', label: t('common.email') },
    { key: 'company_name', label: 'Company' },
    { key: 'contact_type', label: 'Type', render: v => <StatusBadge status={v} /> },
    { key: 'ai_lead_score', label: 'Score', render: v => v ? `${v}/100` : '-' },
  ];

  const dealCols = [
    { key: 'name', label: 'Deal Name' },
    { key: 'value', label: 'Value', render: v => `$${Number(v || 0).toLocaleString()}` },
    { key: 'stage', label: 'Stage', render: v => <StatusBadge status={v} /> },
    { key: 'expected_close_date', label: 'Close Date' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('crm.title')}</h1>
        <Button onClick={openCreate}>{t('common.create')} {tab === 'contacts' ? 'Contact' : 'Deal'}</Button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['contacts', 'deals'].map(t2 => (
          <button key={t2} onClick={() => setTab(t2)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t2 ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t2.charAt(0).toUpperCase() + t2.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'contacts' && (
        <Card title={t('crm.contacts')}>
          <DataTable columns={contactCols} data={contacts} loading={loading} onRowClick={openEdit} />
        </Card>
      )}
      {tab === 'deals' && (
        <Card title="Deals">
          <DataTable columns={dealCols} data={deals} loading={loading} onRowClick={openEdit} />
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? 'Edit' : 'New'} ${tab === 'contacts' ? 'Contact' : 'Deal'}`} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg whitespace-pre-line">{error}</div>}

          {tab === 'contacts' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="First Name" name="first_name" value={form.first_name} onChange={handleChange} required />
                <FormField label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
                <FormField label="Phone" name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Company" name="company_name" value={form.company_name} onChange={handleChange} />
                <FormField label="Type" name="contact_type" type="select" value={form.contact_type} onChange={handleChange} options={['lead', 'prospect', 'customer', 'partner', 'vendor']} />
              </div>
              <FormField label="Source" name="source" value={form.source} onChange={handleChange} placeholder="e.g. Website, Referral" />
              <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
            </>
          ) : (
            <>
              <FormField label="Deal Name" name="name" value={form.name} onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Value ($)" name="value" type="number" value={form.value} onChange={handleChange} />
                <FormField label="Stage" name="stage" type="select" value={form.stage} onChange={handleChange} options={['qualification', 'proposal', 'negotiation', 'won', 'lost']} />
              </div>
              <FormField label="Expected Close Date" name="expected_close_date" type="date" value={form.expected_close_date} onChange={handleChange} />
              <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
            </>
          )}

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
