import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import api from '../api/client';

const emptyInvoice = { invoice_number: '', invoice_type: 'sales', customer_name: '', customer_email: '', issue_date: '', due_date: '', status: 'draft', subtotal: '', tax_amount: '', discount_amount: '', notes: '' };
const emptyExpense = { description: '', amount: '', category: 'general', date: '', vendor: '', receipt_number: '', notes: '' };

export default function FinancePage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('invoices');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyInvoice);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/finance/invoices/').catch(() => ({ data: { results: [] } })),
      api.get('/finance/expenses/').catch(() => ({ data: { results: [] } })),
      api.get('/finance/invoices/summary/').catch(() => ({ data: {} })),
    ]).then(([inv, exp, sum]) => {
      setInvoices(inv.data.results || []);
      setExpenses(exp.data.results || []);
      setSummary(sum.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  const openCreate = () => {
    setEditItem(null);
    setForm(tab === 'invoices' ? { ...emptyInvoice } : { ...emptyExpense });
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    if (tab === 'invoices') {
      setForm({ invoice_number: item.invoice_number || '', invoice_type: item.invoice_type || 'sales', customer_name: item.customer_name || '', customer_email: item.customer_email || '', issue_date: item.issue_date || '', due_date: item.due_date || '', status: item.status || 'draft', subtotal: item.subtotal || '', tax_amount: item.tax_amount || '', discount_amount: item.discount_amount || '', notes: item.notes || '' });
    } else {
      setForm({ description: item.description || '', amount: item.amount || '', category: item.category || 'general', date: item.date || '', vendor: item.vendor || '', receipt_number: item.receipt_number || '', notes: item.notes || '' });
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
      const endpoint = tab === 'invoices' ? '/finance/invoices/' : '/finance/expenses/';
      const payload = { ...form };
      // Convert empty numeric fields to 0
      ['subtotal', 'tax_amount', 'discount_amount', 'amount'].forEach(k => {
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
      const endpoint = tab === 'invoices' ? '/finance/invoices/' : '/finance/expenses/';
      await api.delete(`${endpoint}${editItem.id}/`);
      setShowModal(false);
      fetchData();
    } catch { setError('Failed to delete'); }
  };

  const invoiceCols = [
    { key: 'invoice_number', label: '#' },
    { key: 'customer_name', label: t('common.name') },
    { key: 'invoice_type', label: 'Type' },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> },
    { key: 'total', label: t('common.total'), render: v => fmt(v) },
    { key: 'due_date', label: 'Due Date' },
  ];

  const expenseCols = [
    { key: 'description', label: 'Description' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', render: v => fmt(v) },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'pending'} /> },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finance.title')}</h1>
        <Button onClick={openCreate}>{t('common.create')} {tab === 'invoices' ? 'Invoice' : 'Expense'}</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="text-center"><p className="text-sm text-gray-500">{t('finance.total_revenue')}</p><p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{fmt(summary.total_invoiced)}</p></div></Card>
        <Card><div className="text-center"><p className="text-sm text-gray-500">{t('finance.outstanding')}</p><p className="text-xl font-bold text-yellow-600 mt-1">{fmt(summary.total_outstanding)}</p></div></Card>
        <Card><div className="text-center"><p className="text-sm text-gray-500">{t('finance.overdue')}</p><p className="text-xl font-bold text-red-600 mt-1">{summary.overdue_count || 0}</p></div></Card>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['invoices', 'expenses'].map(t2 => (
          <button key={t2} onClick={() => setTab(t2)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t2 ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t2.charAt(0).toUpperCase() + t2.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'invoices' && <Card title={t('finance.invoices')}><DataTable columns={invoiceCols} data={invoices} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'expenses' && <Card title="Expenses"><DataTable columns={expenseCols} data={expenses} loading={loading} onRowClick={openEdit} /></Card>}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? 'Edit' : 'New'} ${tab === 'invoices' ? 'Invoice' : 'Expense'}`} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg whitespace-pre-line">{error}</div>}

          {tab === 'invoices' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Invoice Number" name="invoice_number" value={form.invoice_number} onChange={handleChange} required placeholder="e.g. INV-001" />
                <FormField label="Invoice Type" name="invoice_type" type="select" value={form.invoice_type} onChange={handleChange} options={[{ value: 'sales', label: 'Sales Invoice' }, { value: 'purchase', label: 'Purchase Invoice' }, { value: 'credit_note', label: 'Credit Note' }, { value: 'debit_note', label: 'Debit Note' }]} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Customer Name" name="customer_name" value={form.customer_name} onChange={handleChange} required />
                <FormField label="Customer Email" name="customer_email" type="email" value={form.customer_email} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={[{ value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' }, { value: 'partial', label: 'Partially Paid' }, { value: 'paid', label: 'Paid' }, { value: 'overdue', label: 'Overdue' }, { value: 'cancelled', label: 'Cancelled' }]} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Subtotal" name="subtotal" type="number" value={form.subtotal} onChange={handleChange} />
                <FormField label="Tax Amount" name="tax_amount" type="number" value={form.tax_amount} onChange={handleChange} />
                <FormField label="Discount" name="discount_amount" type="number" value={form.discount_amount} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Issue Date" name="issue_date" type="date" value={form.issue_date} onChange={handleChange} required />
                <FormField label="Due Date" name="due_date" type="date" value={form.due_date} onChange={handleChange} required />
              </div>
              <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
            </>
          ) : (
            <>
              <FormField label="Description" name="description" value={form.description} onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Amount" name="amount" type="number" value={form.amount} onChange={handleChange} required />
                <FormField label="Category" name="category" type="select" value={form.category} onChange={handleChange} options={['general', 'travel', 'office', 'utilities', 'marketing', 'payroll', 'rent', 'equipment']} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Date" name="date" type="date" value={form.date} onChange={handleChange} required />
                <FormField label="Vendor" name="vendor" value={form.vendor} onChange={handleChange} />
              </div>
              <FormField label="Receipt Number" name="receipt_number" value={form.receipt_number} onChange={handleChange} />
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
