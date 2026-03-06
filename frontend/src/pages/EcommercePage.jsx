import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import api from '../api/client';

const emptyStore = { name: '', domain: '', description: '', currency: 'USD', is_active: true };
const emptyListing = { title: '', price: '', compare_price: '', status: 'draft', description: '', sku: '' };

export default function EcommercePage() {
  const { t } = useTranslation();
  const [stores, setStores] = useState([]);
  const [listings, setListings] = useState([]);
  const [eOrders, setEOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('stores');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyStore);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/ecommerce/stores/').catch(() => ({ data: { results: [] } })),
      api.get('/ecommerce/listings/').catch(() => ({ data: { results: [] } })),
      api.get('/ecommerce/orders/').catch(() => ({ data: { results: [] } })),
    ]).then(([s, l, o]) => {
      setStores(s.data.results || []);
      setListings(l.data.results || []);
      setEOrders(o.data.results || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const getEmpty = () => {
    if (tab === 'stores') return { ...emptyStore };
    if (tab === 'listings') return { ...emptyListing };
    return {};
  };

  const openCreate = () => {
    setEditItem(null);
    setForm(getEmpty());
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    if (tab === 'stores') {
      setForm({ name: item.name || '', domain: item.domain || '', description: item.description || '', currency: item.currency || 'USD', is_active: item.is_active ?? true });
    } else if (tab === 'listings') {
      setForm({ title: item.title || '', price: item.price || '', compare_price: item.compare_price || '', status: item.status || 'draft', description: item.description || '', sku: item.sku || '' });
    }
    setError('');
    setShowModal(true);
  };

  const handleChange = (name, value) => setForm(f => ({ ...f, [name]: value }));

  const getEndpoint = () => {
    if (tab === 'stores') return '/ecommerce/stores/';
    if (tab === 'listings') return '/ecommerce/listings/';
    return '/ecommerce/orders/';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const endpoint = getEndpoint();
      const payload = { ...form };
      // Convert empty numeric fields to 0
      ['price', 'compare_price'].forEach(k => {
        if (k in payload && (payload[k] === '' || payload[k] === null || payload[k] === undefined)) {
          payload[k] = 0;
        }
      });
      if (editItem) {
        await api.put(`${endpoint}${editItem.id}/`, payload);
      } else {
        await api.post(endpoint, payload);
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
      await api.delete(`${getEndpoint()}${editItem.id}/`);
      setShowModal(false);
      fetchData();
    } catch { setError('Failed to delete'); }
  };

  const storeCols = [
    { key: 'name', label: 'Store Name' },
    { key: 'domain', label: 'Domain' },
    { key: 'currency', label: 'Currency' },
    { key: 'is_active', label: 'Active', render: v => v ? 'Yes' : 'No' },
  ];

  const listingCols = [
    { key: 'title', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'price', label: 'Price', render: v => `$${v}` },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
  ];

  const orderCols = [
    { key: 'order_number', label: 'Order #' },
    { key: 'customer_email', label: 'Customer' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'total', label: 'Total', render: v => `$${v || 0}` },
    { key: 'created_at', label: 'Date' },
  ];

  const canCreate = tab !== 'orders';

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.ecommerce')}</h1>
        {canCreate && <Button onClick={openCreate}>{t('common.create')} {tab === 'stores' ? 'Store' : 'Listing'}</Button>}
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['stores', 'listings', 'orders'].map(t2 => (
          <button key={t2} onClick={() => setTab(t2)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t2 ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t2.charAt(0).toUpperCase() + t2.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'stores' && <Card title="Stores"><DataTable columns={storeCols} data={stores} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'listings' && <Card title="Product Listings"><DataTable columns={listingCols} data={listings} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'orders' && <Card title="E-commerce Orders"><DataTable columns={orderCols} data={eOrders} loading={loading} onRowClick={openEdit} /></Card>}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? 'Edit' : 'New'} ${tab === 'stores' ? 'Store' : 'Product Listing'}`} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg whitespace-pre-line">{error}</div>}

          {tab === 'stores' ? (
            <>
              <FormField label="Store Name" name="name" value={form.name} onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Domain" name="domain" value={form.domain} onChange={handleChange} placeholder="store.example.com" />
                <FormField label="Currency" name="currency" type="select" value={form.currency} onChange={handleChange} options={['USD', 'EUR', 'GBP', 'AED', 'SAR']} />
              </div>
              <FormField label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} />
            </>
          ) : (
            <>
              <FormField label="Product Title" name="title" value={form.title} onChange={handleChange} required />
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Price" name="price" type="number" value={form.price} onChange={handleChange} required />
                <FormField label="Compare Price" name="compare_price" type="number" value={form.compare_price} onChange={handleChange} />
                <FormField label="SKU" name="sku" value={form.sku} onChange={handleChange} />
              </div>
              <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={['draft', 'active', 'archived']} />
              <FormField label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} />
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
