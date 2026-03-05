import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import api from '../api/client';

const emptyOrder = { customer_name: '', status: 'draft', order_date: '', delivery_date: '', shipping_address: '', notes: '' };
const emptyQuotation = { customer_name: '', status: 'draft', valid_until: '', notes: '' };

export default function SalesPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('orders');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyOrder);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/sales/orders/').catch(() => ({ data: { results: [] } })),
      api.get('/sales/quotations/').catch(() => ({ data: { results: [] } })),
    ]).then(([o, q]) => {
      setOrders(o.data.results || []);
      setQuotations(q.data.results || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm(tab === 'orders' ? { ...emptyOrder } : { ...emptyQuotation });
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    if (tab === 'orders') {
      setForm({ customer_name: item.customer_name || '', status: item.status || 'draft', order_date: item.order_date || '', delivery_date: item.delivery_date || '', shipping_address: item.shipping_address || '', notes: item.notes || '' });
    } else {
      setForm({ customer_name: item.customer_name || '', status: item.status || 'draft', valid_until: item.valid_until || '', notes: item.notes || '' });
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
      const endpoint = tab === 'orders' ? '/sales/orders/' : '/sales/quotations/';
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
    if (!editItem || !confirm('Are you sure?')) return;
    try {
      const endpoint = tab === 'orders' ? '/sales/orders/' : '/sales/quotations/';
      await api.delete(`${endpoint}${editItem.id}/`);
      setShowModal(false);
      fetchData();
    } catch { setError('Failed to delete'); }
  };

  const orderCols = [
    { key: 'order_number', label: 'Order #' },
    { key: 'customer_name', label: t('common.name') },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> },
    { key: 'total', label: t('common.total'), render: v => `$${v}` },
    { key: 'order_date', label: t('common.date') },
  ];

  const quoteCols = [
    { key: 'quotation_number', label: 'Quote #' },
    { key: 'customer_name', label: t('common.name') },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> },
    { key: 'total', label: 'Total', render: v => `$${v || 0}` },
    { key: 'valid_until', label: 'Valid Until' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.sales')}</h1>
        <Button onClick={openCreate}>{t('common.create')} {tab === 'orders' ? 'Order' : 'Quotation'}</Button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['orders', 'quotations'].map(t2 => (
          <button key={t2} onClick={() => setTab(t2)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t2 ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t2.charAt(0).toUpperCase() + t2.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'orders' && <Card title="Sales Orders"><DataTable columns={orderCols} data={orders} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'quotations' && <Card title="Quotations"><DataTable columns={quoteCols} data={quotations} loading={loading} onRowClick={openEdit} /></Card>}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? 'Edit' : 'New'} ${tab === 'orders' ? 'Sales Order' : 'Quotation'}`} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg whitespace-pre-line">{error}</div>}

          {tab === 'orders' ? (
            <>
              <FormField label="Customer Name" name="customer_name" value={form.customer_name} onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']} />
                <FormField label="Order Date" name="order_date" type="date" value={form.order_date} onChange={handleChange} required />
              </div>
              <FormField label="Delivery Date" name="delivery_date" type="date" value={form.delivery_date} onChange={handleChange} />
              <FormField label="Shipping Address" name="shipping_address" type="textarea" value={form.shipping_address} onChange={handleChange} />
              <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
            </>
          ) : (
            <>
              <FormField label="Customer Name" name="customer_name" value={form.customer_name} onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={['draft', 'sent', 'accepted', 'rejected', 'expired']} />
                <FormField label="Valid Until" name="valid_until" type="date" value={form.valid_until} onChange={handleChange} />
              </div>
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
