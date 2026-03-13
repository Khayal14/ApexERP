import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import api from '../api/client';
import toast from 'react-hot-toast';

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = ['products', 'bom', 'stock', 'receipts', 'movements', 'alerts', 'costs', 'transfers', 'warehouses'];

const TAB_LABELS = {
  products: 'Products',
  bom: 'BOM Setup',
  stock: 'Stock Levels',
  receipts: 'Goods Receipt',
  movements: 'Movements',
  alerts: 'Alerts',
  costs: 'Cost & Margins',
  transfers: 'Transfers',
  warehouses: 'Warehouses',
};

const PRODUCT_ROLES = [
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'semi_finished', label: 'Semi-Finished' },
  { value: 'finished_good', label: 'Finished Good' },
];

const BUSINESS_FIELDS = [
  { value: 'led_lights', label: 'LED Lights' },
  { value: 'heater_thermocouple', label: 'Heater & Thermocouple' },
  { value: 'solar_ac', label: 'Solar AC' },
  { value: 'trade', label: 'Trade' },
];

const MOVEMENT_TYPES = [
  { value: 'in', label: 'Stock In' },
  { value: 'out', label: 'Stock Out' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return', label: 'Return' },
];

const PRODUCT_TYPES = [
  { value: 'physical', label: 'Physical' },
  { value: 'service', label: 'Service' },
  { value: 'digital', label: 'Digital' },
];

const UOM_OPTIONS = [
  { value: 'piece', label: 'Piece' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'g', label: 'Gram' },
  { value: 'liter', label: 'Liter' },
  { value: 'meter', label: 'Meter' },
  { value: 'box', label: 'Box' },
  { value: 'roll', label: 'Roll' },
  { value: 'set', label: 'Set' },
];

const RECEIPT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TRANSFER_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (v) =>
  `EGP ${Number(v || 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtNum = (v) =>
  Number(v || 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function CurrencyDisplay({ amount }) {
  return <span className="font-mono text-sm">{fmt(amount)}</span>;
}

function RoleBadge({ role }) {
  const map = {
    raw_material: { label: 'Raw Material', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    semi_finished: { label: 'Semi-Finished', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    finished_good: { label: 'Finished Good', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  };
  const m = map[role] || { label: role || '—', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

function BusinessFieldBadge({ field }) {
  const map = {
    led_lights: { label: 'LED Lights', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    heater_thermocouple: { label: 'Heater & TC', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
    solar_ac: { label: 'Solar AC', cls: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
    trade: { label: 'Trade', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  };
  const m = map[field] || { label: field || '—', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

function StatusBadge({ status, type }) {
  const receiptMap = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  const movementMap = {
    in: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    out: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    transfer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    adjustment: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    return: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };
  const transferMap = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    dispatched: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    in_transit: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    received: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  const alertMap = {
    out_of_stock: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    low_stock: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    low_raw_material: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    incoming_delayed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  };
  const map = type === 'movement' ? movementMap : type === 'transfer' ? transferMap : type === 'alert' ? alertMap : receiptMap;
  const cls = map[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  const label = (status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

function MarginBadge({ margin }) {
  const n = Number(margin || 0);
  let cls = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  if (n < 0) cls = 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200';
  else if (n < 15) cls = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  else if (n < 30) cls = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{fmtNum(n)}%</span>;
}

function SummaryCard({ title, value, sub, color }) {
  const colors = {
    blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/10',
    red: 'border-red-500 bg-red-50 dark:bg-red-900/10',
    amber: 'border-amber-500 bg-amber-50 dark:bg-amber-900/10',
    green: 'border-green-500 bg-green-50 dark:bg-green-900/10',
    orange: 'border-orange-500 bg-orange-50 dark:bg-orange-900/10',
    gray: 'border-gray-300 bg-white dark:bg-gray-800',
  };
  return (
    <div className={`border-l-4 rounded-lg p-4 ${colors[color] || colors.gray}`}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, loading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>Confirm</Button>
      </div>
    </Modal>
  );
}

function EmptyState({ message, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
      <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icon || <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />}
      </svg>
      <p className="text-sm">{message || 'No data available'}</p>
    </div>
  );
}

// ── Products Tab ───────────────────────────────────────────────────────────────

const emptyProduct = {
  name: '', sku: '', barcode: '', product_type: 'physical', product_role: 'finished_good',
  business_field: 'led_lights', category: '', description: '', unit_of_measure: 'piece',
  cost_price: '', selling_price: '', min_stock_level: 0, reorder_point: 0,
  weight: '', tax_rate: 0, is_sellable: true, is_purchasable: true,
};

function ProductsTab() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.product_role = roleFilter;
      if (fieldFilter) params.business_field = fieldFilter;
      const res = await api.get('/inventory/products/', { params });
      setProducts(res.data.results || res.data || []);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, fieldFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyProduct);
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name || '', sku: product.sku || '', barcode: product.barcode || '',
      product_type: product.product_type || 'physical', product_role: product.product_role || 'finished_good',
      business_field: product.business_field || 'led_lights', category: product.category || '',
      description: product.description || '', unit_of_measure: product.unit_of_measure || 'piece',
      cost_price: product.cost_price || '', selling_price: product.selling_price || '',
      min_stock_level: product.min_stock_level || 0, reorder_point: product.reorder_point || 0,
      weight: product.weight || '', tax_rate: product.tax_rate || 0,
      is_sellable: product.is_sellable !== false, is_purchasable: product.is_purchasable !== false,
    });
    setImageFile(null);
    setImagePreview(product.image || null);
    setShowModal(true);
  };

  const handleChange = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name || !form.sku) {
      toast.error('Name and SKU are required');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);
      if (editing) {
        await api.patch(`/inventory/products/${editing.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product updated');
      } else {
        await api.post('/inventory/products/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product created');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (product) => { setDeleteTarget(product); setShowConfirm(true); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/inventory/products/${deleteTarget.id}/`);
      toast.success('Product deleted');
      setShowConfirm(false);
      load();
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Name' },
    { key: 'product_role', label: 'Role', render: (v) => <RoleBadge role={v} /> },
    { key: 'business_field', label: 'Business Field', render: (v) => <BusinessFieldBadge field={v} /> },
    { key: 'cost_price', label: 'Cost Price', render: (v) => <CurrencyDisplay amount={v} /> },
    { key: 'selling_price', label: 'Selling Price', render: (v) => <CurrencyDisplay amount={v} /> },
    { key: 'stock_quantity', label: 'Stock Qty', render: (v) => <span className="font-medium">{v || 0}</span> },
    { key: 'incoming_quantity', label: 'Incoming', render: (v) => <span className="text-blue-600 dark:text-blue-400">{v || 0}</span> },
    {
      key: 'id', label: 'Actions', sortable: false, render: (_, row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); confirmDelete(row); }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-3 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Roles</option>
            {PRODUCT_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Business Fields</option>
            {BUSINESS_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <Button onClick={openCreate}>+ Add Product</Button>
      </div>

      <Card>
        <DataTable columns={columns} data={products} loading={loading} emptyMessage="No products found" />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : 'Create Product'} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Product Name" name="name" value={form.name} onChange={handleChange} required />
          <FormField label="SKU" name="sku" value={form.sku} onChange={handleChange} required />
          <FormField label="Barcode" name="barcode" value={form.barcode} onChange={handleChange} />
          <FormField label="Product Type" name="product_type" type="select" value={form.product_type} onChange={handleChange} options={PRODUCT_TYPES} />
          <FormField label="Product Role" name="product_role" type="select" value={form.product_role} onChange={handleChange} options={PRODUCT_ROLES} required />
          <FormField label="Business Field" name="business_field" type="select" value={form.business_field} onChange={handleChange} options={BUSINESS_FIELDS} required />
          <FormField label="Category" name="category" value={form.category} onChange={handleChange} />
          <FormField label="Unit of Measure" name="unit_of_measure" type="select" value={form.unit_of_measure} onChange={handleChange} options={UOM_OPTIONS} />
          <FormField label="Cost Price (EGP)" name="cost_price" type="number" value={form.cost_price} onChange={handleChange} />
          <FormField label="Selling Price (EGP)" name="selling_price" type="number" value={form.selling_price} onChange={handleChange} />
          <FormField label="Min Stock Level" name="min_stock_level" type="number" value={form.min_stock_level} onChange={handleChange} />
          <FormField label="Reorder Point" name="reorder_point" type="number" value={form.reorder_point} onChange={handleChange} />
          <FormField label="Weight (kg)" name="weight" type="number" value={form.weight} onChange={handleChange} />
          <FormField label="Tax Rate (%)" name="tax_rate" type="number" value={form.tax_rate} onChange={handleChange} />
          <div className="md:col-span-2">
            <FormField label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_sellable} onChange={(e) => setForm((f) => ({ ...f, is_sellable: e.target.checked }))} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Sellable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_purchasable} onChange={(e) => setForm((f) => ({ ...f, is_purchasable: e.target.checked }))} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Purchasable</span>
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Image</label>
            <div className="flex items-center gap-4">
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {imagePreview ? 'Change Image' : 'Upload Image'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save</Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}

// ── BOM Tab ────────────────────────────────────────────────────────────────────

const emptyBOM = { product: '', version: '1.0', notes: '' };
const emptyBOMLine = { component: '', quantity: '', unit_of_measure: 'piece', notes: '' };

function BOMTab() {
  const [boms, setBoms] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyBOM);
  const [saving, setSaving] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState(null);
  const [bomLines, setBomLines] = useState([]);
  const [bomLoading, setBomLoading] = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);
  const [lineForm, setLineForm] = useState(emptyBOMLine);
  const [addingLine, setAddingLine] = useState(false);
  const [removingLine, setRemovingLine] = useState(null);
  const [orderQty, setOrderQty] = useState('');
  const [requirements, setRequirements] = useState([]);
  const [calcLoading, setCalcLoading] = useState(false);

  const loadBOMs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory/bom/');
      setBoms(res.data.results || res.data || []);
    } catch { toast.error('Failed to load BOMs'); }
    finally { setLoading(false); }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await api.get('/inventory/products/');
      setProducts(res.data.results || res.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadBOMs(); loadProducts(); }, [loadBOMs, loadProducts]);

  const openBOMDetail = async (bom) => {
    setSelectedBOM(bom);
    setBomLoading(true);
    setRequirements([]);
    setOrderQty('');
    try {
      const res = await api.get(`/inventory/bom/${bom.id}/`);
      setBomLines(res.data.lines || []);
    } catch { toast.error('Failed to load BOM details'); }
    finally { setBomLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.product) { toast.error('Please select a product'); return; }
    setSaving(true);
    try {
      await api.post('/inventory/bom/', form);
      toast.success('BOM created');
      setShowCreate(false);
      setForm(emptyBOM);
      loadBOMs();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create BOM');
    } finally { setSaving(false); }
  };

  const handleAddLine = async () => {
    if (!lineForm.component || !lineForm.quantity) { toast.error('Component and quantity required'); return; }
    setAddingLine(true);
    try {
      await api.post(`/inventory/bom/${selectedBOM.id}/add_line/`, lineForm);
      toast.success('Line added');
      setShowAddLine(false);
      setLineForm(emptyBOMLine);
      openBOMDetail(selectedBOM);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to add line');
    } finally { setAddingLine(false); }
  };

  const handleRemoveLine = async (lineId) => {
    setRemovingLine(lineId);
    try {
      await api.delete(`/inventory/bom/${selectedBOM.id}/remove_line/${lineId}/`);
      toast.success('Line removed');
      setBomLines((prev) => prev.filter((l) => l.id !== lineId));
    } catch { toast.error('Failed to remove line'); }
    finally { setRemovingLine(null); }
  };

  const handleCalculate = async () => {
    if (!orderQty || Number(orderQty) <= 0) { toast.error('Enter a valid order quantity'); return; }
    setCalcLoading(true);
    try {
      const res = await api.post(`/inventory/products/${selectedBOM.product}/calculate_bom_requirements/`, { quantity: Number(orderQty) });
      setRequirements(res.data.requirements || []);
    } catch { toast.error('Failed to calculate requirements'); }
    finally { setCalcLoading(false); }
  };

  const finishedProducts = products.filter((p) => ['finished_good', 'semi_finished'].includes(p.product_role));

  const bomColumns = [
    { key: 'product_name', label: 'Product' },
    { key: 'version', label: 'Version' },
    { key: 'total_material_cost', label: 'Material Cost', render: (v) => <CurrencyDisplay amount={v} /> },
    { key: 'line_count', label: 'Lines', render: (v) => <span className="font-medium">{v || 0}</span> },
    {
      key: 'id', label: 'Actions', sortable: false, render: (_, row) => (
        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openBOMDetail(row); }}>View</Button>
      ),
    },
  ];

  const lineColumns = [
    { key: 'component_name', label: 'Component Name' },
    { key: 'component_sku', label: 'SKU' },
    { key: 'component_role', label: 'Role', render: (v) => <RoleBadge role={v} /> },
    { key: 'quantity', label: 'Quantity' },
    { key: 'unit_of_measure', label: 'UoM' },
    { key: 'unit_cost', label: 'Unit Cost', render: (v) => <CurrencyDisplay amount={v} /> },
    { key: 'line_cost', label: 'Line Cost', render: (v) => <CurrencyDisplay amount={v} /> },
    {
      key: 'id', label: 'Remove', sortable: false, render: (id) => (
        <Button size="sm" variant="danger" loading={removingLine === id} onClick={() => handleRemoveLine(id)}>Remove</Button>
      ),
    },
  ];

  const reqColumns = [
    { key: 'component_name', label: 'Component' },
    { key: 'sku', label: 'SKU' },
    { key: 'required_quantity', label: 'Required' },
    { key: 'on_hand', label: 'On Hand' },
    { key: 'shortfall', label: 'Shortfall', render: (v) => (
      <span className={Number(v) > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400'}>{v || 0}</span>
    ) },
  ];

  if (selectedBOM) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setSelectedBOM(null)}>← Back to BOMs</Button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedBOM.product_name} — BOM v{selectedBOM.version}</h2>
        </div>

        {selectedBOM.notes && (
          <Card>
            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedBOM.notes}</p>
          </Card>
        )}

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Components</h3>
            <Button size="sm" onClick={() => setShowAddLine(true)}>+ Add Component</Button>
          </div>
          {bomLoading ? (
            <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" /></div>
          ) : (
            <DataTable columns={lineColumns} data={bomLines} emptyMessage="No components yet" />
          )}
        </Card>

        <Card>
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">Calculate for Order</h3>
          <div className="flex items-end gap-3 mb-4">
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order Quantity</label>
              <input
                type="number"
                value={orderQty}
                onChange={(e) => setOrderQty(e.target.value)}
                placeholder="e.g. 100"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Button onClick={handleCalculate} loading={calcLoading}>Calculate</Button>
          </div>
          {requirements.length > 0 && (
            <DataTable columns={reqColumns} data={requirements} emptyMessage="No requirements" />
          )}
        </Card>

        <Modal isOpen={showAddLine} onClose={() => setShowAddLine(false)} title="Add BOM Component" size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Component Product <span className="text-red-500">*</span></label>
              <select
                value={lineForm.component}
                onChange={(e) => setLineForm((f) => ({ ...f, component: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select component...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <FormField label="Quantity" name="quantity" type="number" value={lineForm.quantity} onChange={(n, v) => setLineForm((f) => ({ ...f, [n]: v }))} required />
            <FormField label="Unit of Measure" name="unit_of_measure" type="select" value={lineForm.unit_of_measure} onChange={(n, v) => setLineForm((f) => ({ ...f, [n]: v }))} options={UOM_OPTIONS} />
            <FormField label="Notes" name="notes" type="textarea" value={lineForm.notes} onChange={(n, v) => setLineForm((f) => ({ ...f, [n]: v }))} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setShowAddLine(false)}>Cancel</Button>
            <Button onClick={handleAddLine} loading={addingLine}>Add</Button>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>+ Create BOM</Button>
      </div>
      <Card>
        <DataTable columns={bomColumns} data={boms} loading={loading} emptyMessage="No BOMs found" />
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Bill of Materials" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product <span className="text-red-500">*</span></label>
            <select
              value={form.product}
              onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select finished/semi-finished product...</option>
              {finishedProducts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <FormField label="Version" name="version" value={form.version} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} />
          <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} loading={saving}>Create</Button>
        </div>
      </Modal>
    </div>
  );
}

// ── Stock Levels Tab ───────────────────────────────────────────────────────────

function StockLevelsTab() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (warehouseFilter) params.warehouse = warehouseFilter;
      if (roleFilter) params.product_role = roleFilter;
      const [levelsRes, whRes] = await Promise.all([
        api.get('/inventory/stock-levels/', { params }),
        api.get('/inventory/warehouses/'),
      ]);
      setLevels(levelsRes.data.results || levelsRes.data || []);
      setWarehouses(whRes.data.results || whRes.data || []);
    } catch { toast.error('Failed to load stock levels'); }
    finally { setLoading(false); }
  }, [warehouseFilter, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const getRowClass = (row) => {
    const onHand = Number(row.on_hand || 0);
    const minStock = Number(row.min_stock_level || 0);
    const reorderPoint = Number(row.reorder_point || 0);
    if (onHand <= minStock) return 'bg-red-50 dark:bg-red-900/10';
    if (onHand <= reorderPoint) return 'bg-amber-50 dark:bg-amber-900/10';
    return '';
  };

  const columns = [
    { key: 'product_name', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'product_role', label: 'Role', render: (v) => <RoleBadge role={v} /> },
    { key: 'warehouse_name', label: 'Warehouse' },
    { key: 'on_hand', label: 'On Hand', render: (v, row) => {
      const onHand = Number(v || 0);
      const minStock = Number(row.min_stock_level || 0);
      const reorderPoint = Number(row.reorder_point || 0);
      let cls = 'text-gray-900 dark:text-white';
      if (onHand <= minStock) cls = 'text-red-600 dark:text-red-400 font-bold';
      else if (onHand <= reorderPoint) cls = 'text-amber-600 dark:text-amber-400 font-semibold';
      return <span className={cls}>{onHand}</span>;
    }},
    { key: 'incoming_quantity', label: 'Incoming', render: (v) => <span className="text-blue-600 dark:text-blue-400">{v || 0}</span> },
    { key: 'reserved_quantity', label: 'Reserved', render: (v) => <span className="text-purple-600 dark:text-purple-400">{v || 0}</span> },
    { key: 'available_quantity', label: 'Available', render: (v) => <span className="font-medium text-green-600 dark:text-green-400">{v || 0}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Warehouses</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Roles</option>
          {PRODUCT_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/30 inline-block" /> Below min stock</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-900/30 inline-block" /> Below reorder point</span>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" /></div>
        ) : levels.length === 0 ? (
          <EmptyState message="No stock levels found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {levels.map((row, i) => (
                  <tr key={row.id || i} className={`${getRowClass(row)} transition-colors`}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Goods Receipt Tab ──────────────────────────────────────────────────────────

const emptyReceipt = {
  purchase_order: '', warehouse: '', received_date: new Date().toISOString().slice(0, 10), notes: '',
};
const emptyReceiptLine = { product: '', expected_qty: '', received_qty: '', unit_cost: '' };

function GoodsReceiptTab() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyReceipt);
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, wRes, poRes, pRes] = await Promise.all([
        api.get('/inventory/goods-receipts/'),
        api.get('/inventory/warehouses/'),
        api.get('/supply_chain/purchase-orders/?status=confirmed'),
        api.get('/inventory/products/'),
      ]);
      setReceipts(rRes.data.results || rRes.data || []);
      setWarehouses(wRes.data.results || wRes.data || []);
      setPurchaseOrders(poRes.data.results || poRes.data || []);
      setProducts(pRes.data.results || pRes.data || []);
    } catch { toast.error('Failed to load goods receipts'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addLine = () => setLines((l) => [...l, { ...emptyReceiptLine, _id: Date.now() }]);
  const removeLine = (idx) => setLines((l) => l.filter((_, i) => i !== idx));
  const updateLine = (idx, field, value) => setLines((l) => l.map((line, i) => i === idx ? { ...line, [field]: value } : line));

  const handleCreate = async () => {
    if (!form.warehouse || !form.received_date) { toast.error('Warehouse and received date are required'); return; }
    setSaving(true);
    try {
      await api.post('/inventory/goods-receipts/', { ...form, lines });
      toast.success('Goods receipt created');
      setShowCreate(false);
      setForm(emptyReceipt);
      setLines([]);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create receipt');
    } finally { setSaving(false); }
  };

  const openActionConfirm = (receipt, action) => {
    setConfirmTarget(receipt);
    setConfirmAction(action);
    setShowConfirm(true);
  };

  const handleAction = async () => {
    setActioning(confirmTarget.id);
    try {
      if (confirmAction === 'confirm') {
        await api.post(`/inventory/goods-receipts/${confirmTarget.id}/confirm/`);
        toast.success('Receipt confirmed');
      } else if (confirmAction === 'cancel') {
        await api.post(`/inventory/goods-receipts/${confirmTarget.id}/cancel/`);
        toast.success('Receipt cancelled');
      }
      setShowConfirm(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Action failed');
    } finally { setActioning(null); }
  };

  const columns = [
    { key: 'receipt_number', label: 'Receipt #' },
    { key: 'po_number', label: 'PO #' },
    { key: 'warehouse_name', label: 'Warehouse' },
    { key: 'received_date', label: 'Received Date' },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'line_count', label: 'Lines' },
    {
      key: 'id', label: 'Actions', sortable: false, render: (id, row) => (
        <div className="flex gap-2">
          {row.status === 'draft' && (
            <>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); openActionConfirm(row, 'confirm'); }} loading={actioning === id}>Confirm</Button>
              <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); openActionConfirm(row, 'cancel'); }}>Cancel</Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>+ Create Receipt</Button>
      </div>
      <Card>
        <DataTable columns={columns} data={receipts} loading={loading} emptyMessage="No goods receipts found" />
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Goods Receipt" size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Order</label>
            <select
              value={form.purchase_order}
              onChange={(e) => setForm((f) => ({ ...f, purchase_order: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select PO (optional)...</option>
              {purchaseOrders.map((po) => <option key={po.id} value={po.id}>{po.po_number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warehouse <span className="text-red-500">*</span></label>
            <select
              value={form.warehouse}
              onChange={(e) => setForm((f) => ({ ...f, warehouse: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select warehouse...</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <FormField label="Received Date" name="received_date" type="date" value={form.received_date} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} required />
          <div className="md:col-span-2">
            <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Receipt Lines</h4>
            <Button size="sm" variant="secondary" onClick={addLine}>+ Add Line</Button>
          </div>
          {lines.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">No lines added yet</p>
          )}
          {lines.map((line, idx) => (
            <div key={line._id || idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Product</label>
                <select
                  value={line.product}
                  onChange={(e) => updateLine(idx, 'product', e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Qty</label>
                <input type="number" value={line.expected_qty} onChange={(e) => updateLine(idx, 'expected_qty', e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Received Qty</label>
                <input type="number" value={line.received_qty} onChange={(e) => updateLine(idx, 'received_qty', e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit Cost (EGP)</label>
                <input type="number" value={line.unit_cost} onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div className="flex items-end">
                <Button size="sm" variant="danger" onClick={() => removeLine(idx)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} loading={saving}>Create Receipt</Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleAction}
        title={confirmAction === 'confirm' ? 'Confirm Receipt' : 'Cancel Receipt'}
        message={confirmAction === 'confirm'
          ? `Are you sure you want to confirm receipt ${confirmTarget?.receipt_number}? This will update stock levels.`
          : `Are you sure you want to cancel receipt ${confirmTarget?.receipt_number}?`}
        loading={!!actioning}
      />
    </div>
  );
}

// ── Movements Tab ──────────────────────────────────────────────────────────────

const emptyMovement = {
  product: '', movement_type: 'in', source_warehouse: '', destination_warehouse: '',
  quantity: '', reference: '', reason: '', cost: '',
  date: new Date().toISOString().slice(0, 16),
};

function MovementsTab() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyMovement);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.movement_type = typeFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const [mRes, pRes, wRes] = await Promise.all([
        api.get('/inventory/movements/', { params }),
        api.get('/inventory/products/'),
        api.get('/inventory/warehouses/'),
      ]);
      setMovements(mRes.data.results || mRes.data || []);
      setProducts(pRes.data.results || pRes.data || []);
      setWarehouses(wRes.data.results || wRes.data || []);
    } catch { toast.error('Failed to load movements'); }
    finally { setLoading(false); }
  }, [typeFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.product || !form.quantity) { toast.error('Product and quantity are required'); return; }
    setSaving(true);
    try {
      await api.post('/inventory/movements/', form);
      toast.success('Movement created');
      setShowCreate(false);
      setForm(emptyMovement);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create movement');
    } finally { setSaving(false); }
  };

  const columns = [
    { key: 'date', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString('en-EG') : '—' },
    { key: 'product_name', label: 'Product' },
    { key: 'movement_type', label: 'Type', render: (v) => <StatusBadge status={v} type="movement" /> },
    { key: 'source_warehouse_name', label: 'From', render: (v) => v || '—' },
    { key: 'destination_warehouse_name', label: 'To', render: (v) => v || '—' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'reference', label: 'Reference', render: (v) => v || '—' },
    { key: 'cost', label: 'Cost', render: (v) => v ? <CurrencyDisplay amount={v} /> : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Movement Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              {MOVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Record Movement</Button>
      </div>

      <Card>
        <DataTable columns={columns} data={movements} loading={loading} emptyMessage="No movements found" />
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Record Stock Movement" size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product <span className="text-red-500">*</span></label>
            <select
              value={form.product}
              onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select product...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <FormField label="Movement Type" name="movement_type" type="select" value={form.movement_type} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} options={MOVEMENT_TYPES} />
          <FormField label="Quantity" name="quantity" type="number" value={form.quantity} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source Warehouse</label>
            <select
              value={form.source_warehouse}
              onChange={(e) => setForm((f) => ({ ...f, source_warehouse: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">None</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination Warehouse</label>
            <select
              value={form.destination_warehouse}
              onChange={(e) => setForm((f) => ({ ...f, destination_warehouse: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">None</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <FormField label="Date & Time" name="date" type="datetime-local" value={form.date} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} />
          <FormField label="Unit Cost (EGP)" name="cost" type="number" value={form.cost} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} />
          <FormField label="Reference" name="reference" value={form.reference} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} />
          <div className="md:col-span-2">
            <FormField label="Reason / Notes" name="reason" type="textarea" value={form.reason} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} loading={saving}>Record</Button>
        </div>
      </Modal>
    </div>
  );
}

// ── Alerts Tab ─────────────────────────────────────────────────────────────────

function AlertsTab() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(null);
  const [acknowledgeAll, setAcknowledgeAll] = useState(false);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/inventory/alerts/?unacknowledged=true');
      setAlerts(res.data.results || res.data || []);
    } catch { /* silent on auto-refresh */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 60000);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  const handleAcknowledge = async (alert) => {
    setAcknowledging(alert.id);
    try {
      await api.post(`/inventory/alerts/${alert.id}/acknowledge/`);
      toast.success('Alert acknowledged');
      load();
    } catch { toast.error('Failed to acknowledge alert'); }
    finally { setAcknowledging(null); }
  };

  const handleAcknowledgeAll = async () => {
    setAcknowledgeAll(true);
    try {
      await api.post('/inventory/alerts/acknowledge_all/');
      toast.success('All alerts acknowledged');
      load();
    } catch { toast.error('Failed to acknowledge all alerts'); }
    finally { setAcknowledgeAll(false); }
  };

  const outOfStock = alerts.filter((a) => a.alert_type === 'out_of_stock').length;
  const lowStock = alerts.filter((a) => a.alert_type === 'low_stock').length;
  const lowRawMaterial = alerts.filter((a) => a.alert_type === 'low_raw_material').length;

  const columns = [
    { key: 'product_name', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'product_role', label: 'Role', render: (v) => <RoleBadge role={v} /> },
    { key: 'alert_type', label: 'Alert Type', render: (v) => <StatusBadge status={v} type="alert" /> },
    { key: 'threshold_quantity', label: 'Threshold Qty' },
    { key: 'current_quantity', label: 'Current Qty', render: (v, row) => (
      <span className={Number(v) === 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>{v}</span>
    ) },
    { key: 'warehouse_name', label: 'Warehouse', render: (v) => v || '—' },
    { key: 'created_at', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString('en-EG') : '—' },
    { key: 'is_acknowledged', label: 'Status', render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
        {v ? 'Acknowledged' : 'Active'}
      </span>
    ) },
    {
      key: 'id', label: 'Action', sortable: false, render: (id, row) => (
        !row.is_acknowledged && (
          <Button size="sm" variant="secondary" loading={acknowledging === id} onClick={() => handleAcknowledge(row)}>
            Acknowledge
          </Button>
        )
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard title="Total Alerts" value={alerts.length} color="blue" />
        <SummaryCard title="Out of Stock" value={outOfStock} color="red" />
        <SummaryCard title="Low Stock" value={lowStock} color="amber" />
        <SummaryCard title="Low Raw Material" value={lowRawMaterial} color="orange" />
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">Auto-refreshes every 60 seconds</p>
        <Button variant="secondary" onClick={handleAcknowledgeAll} loading={acknowledgeAll} disabled={alerts.filter((a) => !a.is_acknowledged).length === 0}>
          Acknowledge All
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" /></div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">No active alerts</p>
            <p className="text-xs mt-1">All stock levels are within thresholds</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {alerts.map((row, i) => (
                  <tr key={row.id || i} className={`transition-colors ${!row.is_acknowledged ? 'bg-amber-50/50 dark:bg-amber-900/5' : ''}`}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Costs Tab ──────────────────────────────────────────────────────────────────

function CostsTab() {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalcAll, setRecalcAll] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ labour_percentage: '', overhead_percentage: '' });
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ default_labour_percentage: '', default_overhead_percentage: '' });
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [costsRes, settingsRes] = await Promise.all([
        api.get('/inventory/product-costs/'),
        api.get('/inventory/cost-settings/'),
      ]);
      setCosts(costsRes.data.results || costsRes.data || []);
      const s = settingsRes.data;
      setSettings({
        default_labour_percentage: s.default_labour_percentage || '',
        default_overhead_percentage: s.default_overhead_percentage || '',
      });
    } catch { toast.error('Failed to load cost data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRecalcAll = async () => {
    setRecalcAll(true);
    try {
      await api.post('/inventory/product-costs/recalculate_all/');
      toast.success('All costs recalculated');
      load();
    } catch { toast.error('Recalculation failed'); }
    finally { setRecalcAll(false); }
  };

  const openEdit = (row) => {
    setEditTarget(row);
    setEditForm({
      labour_percentage: row.labour_percentage || '',
      overhead_percentage: row.overhead_percentage || '',
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await api.post(`/inventory/product-costs/${editTarget.id}/recalculate/`, editForm);
      toast.success('Cost settings updated');
      setShowEdit(false);
      load();
    } catch { toast.error('Failed to update cost settings'); }
    finally { setSaving(false); }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.patch('/inventory/cost-settings/', settings);
      toast.success('Company cost settings saved');
      setShowSettings(false);
    } catch { toast.error('Failed to save settings'); }
    finally { setSavingSettings(false); }
  };

  const avgMargin = costs.length
    ? (costs.reduce((sum, c) => sum + Number(c.margin_percentage || 0), 0) / costs.length).toFixed(1)
    : '0.0';
  const negativeMargin = costs.filter((c) => Number(c.margin_percentage || 0) < 0).length;
  const highestMargin = costs.length ? costs.reduce((best, c) => Number(c.margin_percentage || 0) > Number(best.margin_percentage || 0) ? c : best, costs[0]) : null;

  const columns = [
    { key: 'product_name', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'business_field', label: 'Business Field', render: (v) => <BusinessFieldBadge field={v} /> },
    { key: 'material_cost', label: 'Material Cost', render: (v) => <CurrencyDisplay amount={v} /> },
    { key: 'labour_percentage', label: 'Labour %', render: (v) => `${v || 0}%` },
    { key: 'labour_cost', label: 'Labour Cost', render: (v) => <CurrencyDisplay amount={v} /> },
    { key: 'overhead_percentage', label: 'Overhead %', render: (v) => `${v || 0}%` },
    { key: 'overhead_cost', label: 'Overhead Cost', render: (v) => <CurrencyDisplay amount={v} /> },
    { key: 'total_cost', label: 'Total Cost', render: (v) => <CurrencyDisplay amount={v} /> },
    { key: 'selling_price', label: 'Selling Price', render: (v) => <CurrencyDisplay amount={v} /> },
    { key: 'gross_profit', label: 'Gross Profit', render: (v) => (
      <span className={Number(v) < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
        <CurrencyDisplay amount={v} />
      </span>
    ) },
    { key: 'margin_percentage', label: 'Margin %', render: (v) => <MarginBadge margin={v} /> },
    {
      key: 'id', label: 'Edit', sortable: false, render: (_, row) => (
        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit Costs</Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="Avg Gross Margin" value={`${avgMargin}%`} color="blue" />
        <SummaryCard title="Products with Negative Margin" value={negativeMargin} color="red" sub="Selling below cost" />
        <SummaryCard title="Highest Margin Product" value={highestMargin ? `${fmtNum(highestMargin.margin_percentage)}%` : '—'} color="green" sub={highestMargin?.product_name || ''} />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => setShowSettings(true)}>Company Cost Settings</Button>
        <Button onClick={handleRecalcAll} loading={recalcAll}>Recalculate All</Button>
      </div>

      <Card>
        <DataTable columns={columns} data={costs} loading={loading} emptyMessage="No cost data found" />
      </Card>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Edit Cost Settings — ${editTarget?.product_name}`} size="sm">
        <div className="space-y-4">
          <FormField label="Labour Percentage (%)" name="labour_percentage" type="number" value={editForm.labour_percentage} onChange={(n, v) => setEditForm((f) => ({ ...f, [n]: v }))} />
          <FormField label="Overhead Percentage (%)" name="overhead_percentage" type="number" value={editForm.overhead_percentage} onChange={(n, v) => setEditForm((f) => ({ ...f, [n]: v }))} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} loading={saving}>Save & Recalculate</Button>
        </div>
      </Modal>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Company Default Cost Settings" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">These defaults apply to new products without custom cost settings.</p>
          <FormField label="Default Labour Percentage (%)" name="default_labour_percentage" type="number" value={settings.default_labour_percentage} onChange={(n, v) => setSettings((s) => ({ ...s, [n]: v }))} />
          <FormField label="Default Overhead Percentage (%)" name="default_overhead_percentage" type="number" value={settings.default_overhead_percentage} onChange={(n, v) => setSettings((s) => ({ ...s, [n]: v }))} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowSettings(false)}>Cancel</Button>
          <Button onClick={handleSaveSettings} loading={savingSettings}>Save Settings</Button>
        </div>
      </Modal>
    </div>
  );
}

// ── Transfers Tab ──────────────────────────────────────────────────────────────

const emptyTransfer = {
  from_company: '', from_warehouse: '', to_company: '', to_warehouse: '',
  transfer_date: new Date().toISOString().slice(0, 10), notes: '',
};
const emptyTransferLine = { product: '', quantity: '', unit_cost: '' };

function TransfersTab() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyTransfer);
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, cRes, wRes, pRes] = await Promise.all([
        api.get('/inventory/transfers/'),
        api.get('/core/companies/'),
        api.get('/inventory/warehouses/'),
        api.get('/inventory/products/'),
      ]);
      setTransfers(tRes.data.results || tRes.data || []);
      setCompanies(cRes.data.results || cRes.data || []);
      setWarehouses(wRes.data.results || wRes.data || []);
      setProducts(pRes.data.results || pRes.data || []);
    } catch { toast.error('Failed to load transfers'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addLine = () => setLines((l) => [...l, { ...emptyTransferLine, _id: Date.now() }]);
  const removeLine = (idx) => setLines((l) => l.filter((_, i) => i !== idx));
  const updateLine = (idx, field, value) => setLines((l) => l.map((line, i) => i === idx ? { ...line, [field]: value } : line));

  const handleCreate = async () => {
    if (!form.from_warehouse || !form.to_warehouse) { toast.error('Both warehouses are required'); return; }
    setSaving(true);
    try {
      await api.post('/inventory/transfers/', { ...form, lines });
      toast.success('Transfer created');
      setShowCreate(false);
      setForm(emptyTransfer);
      setLines([]);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create transfer');
    } finally { setSaving(false); }
  };

  const openAction = (transfer, action) => {
    setConfirmTarget(transfer);
    setConfirmAction(action);
    setShowConfirm(true);
  };

  const handleAction = async () => {
    setActioning(confirmTarget.id);
    const endpoints = {
      dispatch: `/inventory/transfers/${confirmTarget.id}/dispatch/`,
      mark_in_transit: `/inventory/transfers/${confirmTarget.id}/mark_in_transit/`,
      receive: `/inventory/transfers/${confirmTarget.id}/receive/`,
    };
    const labels = { dispatch: 'dispatched', mark_in_transit: 'marked in transit', receive: 'received' };
    try {
      await api.post(endpoints[confirmAction]);
      toast.success(`Transfer ${labels[confirmAction]}`);
      setShowConfirm(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Action failed');
    } finally { setActioning(null); }
  };

  const columns = [
    { key: 'transfer_number', label: 'Transfer #' },
    { key: 'from_company_name', label: 'From Company' },
    { key: 'to_company_name', label: 'To Company' },
    { key: 'from_warehouse_name', label: 'From Warehouse' },
    { key: 'to_warehouse_name', label: 'To Warehouse' },
    { key: 'transfer_date', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString('en-EG') : '—' },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} type="transfer" /> },
    { key: 'line_count', label: 'Lines' },
    {
      key: 'id', label: 'Actions', sortable: false, render: (id, row) => (
        <div className="flex gap-1 flex-wrap">
          {row.status === 'draft' && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); openAction(row, 'dispatch'); }} loading={actioning === id}>Dispatch</Button>
          )}
          {row.status === 'dispatched' && (
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openAction(row, 'mark_in_transit'); }} loading={actioning === id}>In Transit</Button>
          )}
          {(row.status === 'dispatched' || row.status === 'in_transit') && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); openAction(row, 'receive'); }} loading={actioning === id}>Receive</Button>
          )}
        </div>
      ),
    },
  ];

  const actionLabels = {
    dispatch: 'Dispatch Transfer',
    mark_in_transit: 'Mark In Transit',
    receive: 'Receive Transfer',
  };
  const actionMessages = {
    dispatch: `Dispatch transfer ${confirmTarget?.transfer_number}?`,
    mark_in_transit: `Mark transfer ${confirmTarget?.transfer_number} as in transit?`,
    receive: `Mark transfer ${confirmTarget?.transfer_number} as received? This will update stock levels.`,
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>+ Create Transfer</Button>
      </div>
      <Card>
        <DataTable columns={columns} data={transfers} loading={loading} emptyMessage="No transfers found" />
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Internal Transfer" size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Company</label>
            <select value={form.from_company} onChange={(e) => setForm((f) => ({ ...f, from_company: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select company...</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Warehouse <span className="text-red-500">*</span></label>
            <select value={form.from_warehouse} onChange={(e) => setForm((f) => ({ ...f, from_warehouse: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select warehouse...</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Company</label>
            <select value={form.to_company} onChange={(e) => setForm((f) => ({ ...f, to_company: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select company...</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Warehouse <span className="text-red-500">*</span></label>
            <select value={form.to_warehouse} onChange={(e) => setForm((f) => ({ ...f, to_warehouse: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select warehouse...</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <FormField label="Transfer Date" name="transfer_date" type="date" value={form.transfer_date} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} required />
          <div className="md:col-span-2">
            <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))} />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Transfer Lines</h4>
            <Button size="sm" variant="secondary" onClick={addLine}>+ Add Line</Button>
          </div>
          {lines.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">No lines added yet</p>
          )}
          {lines.map((line, idx) => (
            <div key={line._id || idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Product</label>
                <select value={line.product} onChange={(e) => updateLine(idx, 'product', e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500">
                  <option value="">Select...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
                <input type="number" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit Cost (EGP)</label>
                <input type="number" value={line.unit_cost} onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div className="flex items-end">
                <Button size="sm" variant="danger" onClick={() => removeLine(idx)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} loading={saving}>Create Transfer</Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleAction}
        title={actionLabels[confirmAction] || 'Confirm Action'}
        message={actionMessages[confirmAction] || 'Are you sure?'}
        loading={!!actioning}
      />
    </div>
  );
}

// ── Warehouses Tab ─────────────────────────────────────────────────────────────

const emptyWarehouse = {
  name: '', code: '', address: '', city: '', country: '', capacity: '', is_primary: false,
};

function WarehousesTab() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyWarehouse);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory/warehouses/');
      setWarehouses(res.data.results || res.data || []);
    } catch { toast.error('Failed to load warehouses'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyWarehouse);
    setShowModal(true);
  };

  const openEdit = (wh) => {
    setEditing(wh);
    setForm({
      name: wh.name || '', code: wh.code || '', address: wh.address || '',
      city: wh.city || '', country: wh.country || '', capacity: wh.capacity || '',
      is_primary: wh.is_primary || false,
    });
    setShowModal(true);
  };

  const handleChange = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Name and Code are required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/inventory/warehouses/${editing.id}/`, form);
        toast.success('Warehouse updated');
      } else {
        await api.post('/inventory/warehouses/', form);
        toast.success('Warehouse created');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save warehouse');
    } finally { setSaving(false); }
  };

  const confirmDelete = (wh) => { setDeleteTarget(wh); setShowConfirm(true); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/inventory/warehouses/${deleteTarget.id}/`);
      toast.success('Warehouse deleted');
      setShowConfirm(false);
      load();
    } catch { toast.error('Failed to delete warehouse'); }
    finally { setDeleting(false); }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'city', label: 'City', render: (v) => v || '—' },
    { key: 'country', label: 'Country', render: (v) => v || '—' },
    { key: 'is_primary', label: 'Primary', render: (v) => (
      v ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Primary</span>
        : <span className="text-gray-400 dark:text-gray-500">—</span>
    ) },
    { key: 'capacity', label: 'Capacity', render: (v) => v ? Number(v).toLocaleString('en-EG') : '—' },
    {
      key: 'id', label: 'Actions', sortable: false, render: (_, row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); confirmDelete(row); }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>+ Add Warehouse</Button>
      </div>
      <Card>
        <DataTable columns={columns} data={warehouses} loading={loading} emptyMessage="No warehouses found" />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Warehouse' : 'Create Warehouse'} size="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Warehouse Name" name="name" value={form.name} onChange={handleChange} required />
          <FormField label="Code" name="code" value={form.code} onChange={handleChange} required />
          <div className="md:col-span-2">
            <FormField label="Address" name="address" type="textarea" rows={2} value={form.address} onChange={handleChange} />
          </div>
          <FormField label="City" name="city" value={form.city} onChange={handleChange} />
          <FormField label="Country" name="country" value={form.country} onChange={handleChange} />
          <FormField label="Capacity (units)" name="capacity" type="number" value={form.capacity} onChange={handleChange} />
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="is_primary"
              checked={form.is_primary}
              onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_primary" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">Primary Warehouse</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save</Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Warehouse"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All associated stock data may be affected.`}
        loading={deleting}
      />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('products');

  const renderTab = () => {
    switch (activeTab) {
      case 'products': return <ProductsTab />;
      case 'bom': return <BOMTab />;
      case 'stock': return <StockLevelsTab />;
      case 'receipts': return <GoodsReceiptTab />;
      case 'movements': return <MovementsTab />;
      case 'alerts': return <AlertsTab />;
      case 'costs': return <CostsTab />;
      case 'transfers': return <TransfersTab />;
      case 'warehouses': return <WarehousesTab />;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage products, stock levels, warehouses and more</p>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-0 overflow-x-auto" aria-label="Inventory Tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>

      <div>{renderTab()}</div>
    </div>
  );
}
