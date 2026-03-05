import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import api from '../api/client';

const emptyOrder = { product_name: '', quantity: '', status: 'planned', priority: 'medium', planned_start: '', planned_end: '', work_center: '', notes: '' };
const emptyWorkCenter = { name: '', code: '', capacity: '', efficiency: '', hourly_cost: '', is_active: true };

export default function ManufacturingPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
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
      api.get('/manufacturing/production-orders/').catch(() => ({ data: { results: [] } })),
      api.get('/manufacturing/work-centers/').catch(() => ({ data: { results: [] } })),
    ]).then(([o, w]) => {
      setOrders(o.data.results || []);
      setWorkCenters(w.data.results || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm(tab === 'orders' ? { ...emptyOrder } : { ...emptyWorkCenter });
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    if (tab === 'orders') {
      setForm({ product_name: item.product_name || '', quantity: item.quantity || '', status: item.status || 'planned', priority: item.priority || 'medium', planned_start: item.planned_start || '', planned_end: item.planned_end || '', work_center: item.work_center || '', notes: item.notes || '' });
    } else {
      setForm({ name: item.name || '', code: item.code || '', capacity: item.capacity || '', efficiency: item.efficiency || '', hourly_cost: item.hourly_cost || '', is_active: item.is_active ?? true });
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
      const endpoint = tab === 'orders' ? '/manufacturing/production-orders/' : '/manufacturing/work-centers/';
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
      const endpoint = tab === 'orders' ? '/manufacturing/production-orders/' : '/manufacturing/work-centers/';
      await api.delete(`${endpoint}${editItem.id}/`);
      setShowModal(false);
      fetchData();
    } catch { setError('Failed to delete'); }
  };

  const orderCols = [
    { key: 'order_number', label: 'Order #' },
    { key: 'product_name', label: 'Product' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'priority', label: 'Priority' },
    { key: 'planned_start', label: 'Start Date' },
  ];

  const wcCols = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'efficiency', label: 'Efficiency', render: v => v ? `${v}%` : '-' },
    { key: 'hourly_cost', label: 'Cost/Hr', render: v => v ? `$${v}` : '-' },
  ];

  const wcOptions = workCenters.map(w => ({ value: w.id, label: w.name }));

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.manufacturing')}</h1>
        <Button onClick={openCreate}>{t('common.create')} {tab === 'orders' ? 'Production Order' : 'Work Center'}</Button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['orders', 'work_centers'].map(t2 => (
          <button key={t2} onClick={() => setTab(t2)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t2 ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t2 === 'work_centers' ? 'Work Centers' : 'Production Orders'}
          </button>
        ))}
      </div>

      {tab === 'orders' && <Card title="Production Orders"><DataTable columns={orderCols} data={orders} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'work_centers' && <Card title="Work Centers"><DataTable columns={wcCols} data={workCenters} loading={loading} onRowClick={openEdit} /></Card>}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? 'Edit' : 'New'} ${tab === 'orders' ? 'Production Order' : 'Work Center'}`} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg whitespace-pre-line">{error}</div>}

          {tab === 'orders' ? (
            <>
              <FormField label="Product Name" name="product_name" value={form.product_name} onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Quantity" name="quantity" type="number" value={form.quantity} onChange={handleChange} required />
                <FormField label="Work Center" name="work_center" type="select" value={form.work_center} onChange={handleChange} options={wcOptions} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={['planned', 'in_progress', 'completed', 'cancelled']} />
                <FormField label="Priority" name="priority" type="select" value={form.priority} onChange={handleChange} options={['low', 'medium', 'high', 'critical']} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Planned Start" name="planned_start" type="date" value={form.planned_start} onChange={handleChange} />
                <FormField label="Planned End" name="planned_end" type="date" value={form.planned_end} onChange={handleChange} />
              </div>
              <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Name" name="name" value={form.name} onChange={handleChange} required />
                <FormField label="Code" name="code" value={form.code} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Capacity" name="capacity" type="number" value={form.capacity} onChange={handleChange} />
                <FormField label="Efficiency (%)" name="efficiency" type="number" value={form.efficiency} onChange={handleChange} />
                <FormField label="Hourly Cost ($)" name="hourly_cost" type="number" value={form.hourly_cost} onChange={handleChange} />
              </div>
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
