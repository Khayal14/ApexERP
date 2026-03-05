import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import api from '../api/client';

const emptyProduct = { name: '', sku: '', description: '', product_type: 'physical', selling_price: '', cost_price: '', unit: 'piece', reorder_level: '', is_active: true };
const emptyWarehouse = { name: '', code: '', address: '', city: '', country: '', capacity: '', is_active: true };

export default function InventoryPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('products');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/inventory/products/').catch(() => ({ data: { results: [] } })),
      api.get('/inventory/warehouses/').catch(() => ({ data: { results: [] } })),
    ]).then(([p, w]) => {
      setProducts(p.data.results || []);
      setWarehouses(w.data.results || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm(tab === 'products' ? { ...emptyProduct } : { ...emptyWarehouse });
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    if (tab === 'products') {
      setForm({ name: item.name || '', sku: item.sku || '', description: item.description || '', product_type: item.product_type || 'physical', selling_price: item.selling_price || '', cost_price: item.cost_price || '', unit: item.unit || 'piece', reorder_level: item.reorder_level || '', is_active: item.is_active ?? true });
    } else {
      setForm({ name: item.name || '', code: item.code || '', address: item.address || '', city: item.city || '', country: item.country || '', capacity: item.capacity || '', is_active: item.is_active ?? true });
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
      const endpoint = tab === 'products' ? '/inventory/products/' : '/inventory/warehouses/';
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
      const endpoint = tab === 'products' ? '/inventory/products/' : '/inventory/warehouses/';
      await api.delete(`${endpoint}${editItem.id}/`);
      setShowModal(false);
      fetchData();
    } catch { setError('Failed to delete'); }
  };

  const productCols = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: t('common.name') },
    { key: 'category_name', label: 'Category' },
    { key: 'selling_price', label: 'Price', render: v => `$${v}` },
    { key: 'total_stock', label: 'Stock' },
  ];

  const warehouseCols = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'city', label: 'City' },
    { key: 'country', label: 'Country' },
    { key: 'capacity', label: 'Capacity' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.inventory')}</h1>
        <Button onClick={openCreate}>{t('common.create')} {tab === 'products' ? 'Product' : 'Warehouse'}</Button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['products', 'warehouses'].map(t2 => (
          <button key={t2} onClick={() => setTab(t2)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t2 ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t2.charAt(0).toUpperCase() + t2.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'products' && <Card title="Products"><DataTable columns={productCols} data={products} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'warehouses' && <Card title="Warehouses"><DataTable columns={warehouseCols} data={warehouses} loading={loading} onRowClick={openEdit} /></Card>}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? 'Edit' : 'New'} ${tab === 'products' ? 'Product' : 'Warehouse'}`} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg whitespace-pre-line">{error}</div>}

          {tab === 'products' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Product Name" name="name" value={form.name} onChange={handleChange} required />
                <FormField label="SKU" name="sku" value={form.sku} onChange={handleChange} required />
              </div>
              <FormField label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} />
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Type" name="product_type" type="select" value={form.product_type} onChange={handleChange} options={['physical', 'digital', 'service']} />
                <FormField label="Selling Price" name="selling_price" type="number" value={form.selling_price} onChange={handleChange} required />
                <FormField label="Cost Price" name="cost_price" type="number" value={form.cost_price} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Unit" name="unit" type="select" value={form.unit} onChange={handleChange} options={['piece', 'kg', 'liter', 'meter', 'box', 'pack']} />
                <FormField label="Reorder Level" name="reorder_level" type="number" value={form.reorder_level} onChange={handleChange} />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Name" name="name" value={form.name} onChange={handleChange} required />
                <FormField label="Code" name="code" value={form.code} onChange={handleChange} required />
              </div>
              <FormField label="Address" name="address" value={form.address} onChange={handleChange} />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="City" name="city" value={form.city} onChange={handleChange} />
                <FormField label="Country" name="country" value={form.country} onChange={handleChange} />
              </div>
              <FormField label="Capacity" name="capacity" type="number" value={form.capacity} onChange={handleChange} />
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
