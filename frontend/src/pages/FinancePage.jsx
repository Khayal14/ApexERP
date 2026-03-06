import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import api from '../api/client';

/* ── empty form templates ─────────────────────────────────────── */
const emptyInvoice = { invoice_number: '', invoice_type: 'sales', customer_name: '', customer_email: '', customer_address: '', issue_date: '', due_date: '', status: 'draft', subtotal: '', tax_amount: '', discount_amount: '', notes: '', terms: '' };
const emptyPayment = { payment_number: '', invoice: '', amount: '', payment_method: 'bank_transfer', status: 'pending', payment_date: '', reference: '', notes: '' };
const emptyExpense = { description: '', amount: '', category: '', date: '', is_reimbursable: false, status: 'pending', notes: '' };
const emptyExpenseCategory = { name: '', parent: '' };
const emptyBudget = { name: '', fiscal_year: '', department: '', total_budget: '', status: 'active' };
const emptyTaxRate = { name: '', rate: '', tax_type: 'vat', is_default: false };
const emptyAccount = { code: '', name: '', account_type: 'asset', parent: '', description: '', is_reconcilable: false };
const emptyJournalEntry = { entry_number: '', date: '', fiscal_year: '', description: '', status: 'draft', reference: '' };

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Payments' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'budgets', label: 'Budgets' },
  { key: 'accounts', label: 'Chart of Accounts' },
  { key: 'journal', label: 'Journal Entries' },
  { key: 'tax_rates', label: 'Tax Rates' },
];

export default function FinancePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('dashboard');

  /* ── data state ─────────────────────────────────────────────── */
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [summary, setSummary] = useState({});
  const [expenseDash, setExpenseDash] = useState({});
  const [budgetVariance, setBudgetVariance] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── modal state ────────────────────────────────────────────── */
  const [showModal, setShowModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* ── invoice detail sub-state ───────────────────────────────── */
  const [invoiceLines, setInvoiceLines] = useState([]);
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [detailTab, setDetailTab] = useState('lines');
  const [lineForm, setLineForm] = useState({ description: '', quantity: '1', unit_price: '', tax_rate: '0', discount_percent: '0' });
  const [addingLine, setAddingLine] = useState(false);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  /* ── fetch data ─────────────────────────────────────────────── */
  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/finance/invoices/').catch(() => ({ data: { results: [] } })),
      api.get('/finance/payments/').catch(() => ({ data: { results: [] } })),
      api.get('/finance/expenses/').catch(() => ({ data: { results: [] } })),
      api.get('/finance/expense-categories/').catch(() => ({ data: { results: [] } })),
      api.get('/finance/budgets/').catch(() => ({ data: { results: [] } })),
      api.get('/finance/accounts/').catch(() => ({ data: { results: [] } })),
      api.get('/finance/journal-entries/').catch(() => ({ data: { results: [] } })),
      api.get('/finance/tax-rates/').catch(() => ({ data: { results: [] } })),
      api.get('/finance/fiscal-years/').catch(() => ({ data: { results: [] } })),
      api.get('/finance/invoices/summary/').catch(() => ({ data: {} })),
      api.get('/finance/expenses/dashboard/').catch(() => ({ data: {} })),
      api.get('/finance/budgets/variance-report/').catch(() => ({ data: [] })),
    ]).then(([inv, pay, exp, expCat, bud, acc, je, tax, fy, sum, expD, budV]) => {
      setInvoices(inv.data.results || []);
      setPayments(pay.data.results || []);
      setExpenses(exp.data.results || []);
      setExpenseCategories(expCat.data.results || []);
      setBudgets(bud.data.results || []);
      setAccounts(acc.data.results || []);
      setJournalEntries(je.data.results || []);
      setTaxRates(tax.data.results || []);
      setFiscalYears(fy.data.results || []);
      setSummary(sum.data || {});
      setExpenseDash(expD.data || {});
      setBudgetVariance(Array.isArray(budV.data) ? budV.data : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── helpers ────────────────────────────────────────────────── */
  const getEmpty = () => {
    switch (tab) {
      case 'invoices': return { ...emptyInvoice };
      case 'payments': return { ...emptyPayment };
      case 'expenses': return { ...emptyExpense };
      case 'budgets': return { ...emptyBudget };
      case 'accounts': return { ...emptyAccount };
      case 'journal': return { ...emptyJournalEntry };
      case 'tax_rates': return { ...emptyTaxRate };
      default: return {};
    }
  };

  const getEndpoint = () => {
    switch (tab) {
      case 'invoices': return '/finance/invoices/';
      case 'payments': return '/finance/payments/';
      case 'expenses': return '/finance/expenses/';
      case 'budgets': return '/finance/budgets/';
      case 'accounts': return '/finance/accounts/';
      case 'journal': return '/finance/journal-entries/';
      case 'tax_rates': return '/finance/tax-rates/';
      default: return '';
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm(getEmpty());
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    if (tab === 'invoices') { openInvoiceDetail(item); return; }
    setEditItem(item);
    const f = {};
    const empty = getEmpty();
    Object.keys(empty).forEach(k => { f[k] = item[k] ?? empty[k]; });
    setForm(f);
    setError('');
    setShowModal(true);
  };

  const openInvoiceDetail = (inv) => {
    setDetailItem(inv);
    setInvoiceLines(inv.lines || []);
    setInvoicePayments([]);
    setDetailTab('lines');
    setDetailModal(true);
    // fetch payments for this invoice
    api.get(`/finance/payments/?invoice=${inv.id}`).then(r => setInvoicePayments(r.data.results || [])).catch(() => {});
  };

  const handleChange = (name, value) => setForm(f => ({ ...f, [name]: value }));

  /* ── submit ─────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const endpoint = getEndpoint();
      const payload = { ...form };

      // Convert empty numeric fields to 0
      ['subtotal', 'tax_amount', 'discount_amount', 'amount', 'total_budget', 'spent', 'rate', 'balance'].forEach(k => {
        if (k in payload && (payload[k] === '' || payload[k] === null || payload[k] === undefined)) {
          payload[k] = 0;
        }
      });

      // Convert empty FK fields to null
      ['invoice', 'category', 'parent', 'fiscal_year', 'employee'].forEach(k => {
        if (k in payload && payload[k] === '') payload[k] = null;
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
    if (!editItem || !confirm('Are you sure you want to delete this?')) return;
    try {
      await api.delete(`${getEndpoint()}${editItem.id}/`);
      setShowModal(false);
      fetchData();
    } catch { setError('Failed to delete'); }
  };

  /* ── invoice actions ────────────────────────────────────────── */
  const sendInvoice = async (inv) => {
    try {
      await api.post(`/finance/invoices/${inv.id}/send-invoice/`);
      fetchData();
      setDetailModal(false);
    } catch { alert('Failed to send invoice'); }
  };

  const addInvoiceLine = async () => {
    if (!detailItem) return;
    setAddingLine(true);
    try {
      const payload = { ...lineForm };
      ['quantity', 'unit_price', 'tax_rate', 'discount_percent'].forEach(k => {
        if (payload[k] === '' || payload[k] === null) payload[k] = 0;
      });
      const res = await api.post(`/finance/invoices/${detailItem.id}/add-line/`, payload);
      setDetailItem(res.data);
      setInvoiceLines(res.data.lines || []);
      setLineForm({ description: '', quantity: '1', unit_price: '', tax_rate: '0', discount_percent: '0' });
      fetchData();
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to add line');
    } finally { setAddingLine(false); }
  };

  /* ── expense actions ────────────────────────────────────────── */
  const approveExpense = async (exp) => {
    try {
      await api.post(`/finance/expenses/${exp.id}/approve/`);
      fetchData();
    } catch { alert('Failed to approve'); }
  };

  const rejectExpense = async (exp) => {
    try {
      await api.post(`/finance/expenses/${exp.id}/reject/`);
      fetchData();
    } catch { alert('Failed to reject'); }
  };

  /* ── journal actions ────────────────────────────────────────── */
  const postJournalEntry = async (entry) => {
    try {
      await api.post(`/finance/journal-entries/${entry.id}/post-entry/`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to post entry');
    }
  };

  /* ── dropdown options ───────────────────────────────────────── */
  const invoiceOptions = invoices.map(i => ({ value: i.id, label: `${i.invoice_number} - ${i.customer_name}` }));
  const categoryOptions = expenseCategories.map(c => ({ value: c.id, label: c.name }));
  const accountOptions = accounts.map(a => ({ value: a.id, label: `${a.code} - ${a.name}` }));
  const fyOptions = fiscalYears.map(f => ({ value: f.id, label: f.name }));
  const parentAccountOptions = [{ value: '', label: '— None (Top Level) —' }, ...accountOptions];
  const parentCategoryOptions = [{ value: '', label: '— None (Top Level) —' }, ...categoryOptions];

  /* ── column definitions ─────────────────────────────────────── */
  const invoiceCols = [
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'invoice_type', label: 'Type', render: v => ({ sales: 'Sales', purchase: 'Purchase', credit_note: 'Credit Note', debit_note: 'Debit Note' }[v] || v) },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'total', label: 'Total', render: v => fmt(v) },
    { key: 'balance_due', label: 'Balance Due', render: v => <span className={Number(v) > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>{fmt(v)}</span> },
    { key: 'issue_date', label: 'Issue Date' },
    { key: 'due_date', label: 'Due Date' },
  ];

  const paymentCols = [
    { key: 'payment_number', label: 'Payment #' },
    { key: 'amount', label: 'Amount', render: v => fmt(v) },
    { key: 'payment_method', label: 'Method', render: v => ({ cash: 'Cash', bank_transfer: 'Bank Transfer', credit_card: 'Credit Card', check: 'Check', stripe: 'Stripe', paypal: 'PayPal' }[v] || v) },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'payment_date', label: 'Date' },
    { key: 'reference', label: 'Reference' },
  ];

  const expenseCols = [
    { key: 'description', label: 'Description', render: v => v?.length > 50 ? v.slice(0, 50) + '...' : v },
    { key: 'category_name', label: 'Category' },
    { key: 'amount', label: 'Amount', render: v => fmt(v) },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'pending'} /> },
    { key: 'is_reimbursable', label: 'Reimbursable', render: v => v ? 'Yes' : 'No' },
    { key: '_actions', label: 'Actions', render: (_, row) => row.status === 'pending' ? (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); approveExpense(row); }} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Approve</button>
        <button onClick={(e) => { e.stopPropagation(); rejectExpense(row); }} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Reject</button>
      </div>
    ) : null },
  ];

  const budgetCols = [
    { key: 'name', label: 'Budget Name' },
    { key: 'department', label: 'Department' },
    { key: 'total_budget', label: 'Total', render: v => fmt(v) },
    { key: 'spent', label: 'Spent', render: v => fmt(v) },
    { key: 'remaining', label: 'Remaining', render: v => <span className={Number(v) < 0 ? 'text-red-600 font-semibold' : ''}>{fmt(v)}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
  ];

  const accountCols = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Account Name' },
    { key: 'account_type', label: 'Type', render: v => v?.charAt(0).toUpperCase() + v?.slice(1) },
    { key: 'balance', label: 'Balance', render: v => fmt(v) },
    { key: 'is_reconcilable', label: 'Reconcilable', render: v => v ? 'Yes' : 'No' },
  ];

  const journalCols = [
    { key: 'entry_number', label: 'Entry #' },
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description', render: v => v?.length > 40 ? v.slice(0, 40) + '...' : v },
    { key: 'total_debit', label: 'Debit', render: v => fmt(v) },
    { key: 'total_credit', label: 'Credit', render: v => fmt(v) },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: '_actions', label: 'Actions', render: (_, row) => row.status === 'draft' ? (
      <button onClick={(e) => { e.stopPropagation(); postJournalEntry(row); }} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Post</button>
    ) : null },
  ];

  const taxCols = [
    { key: 'name', label: 'Tax Name' },
    { key: 'rate', label: 'Rate', render: v => `${v}%` },
    { key: 'tax_type', label: 'Type', render: v => ({ sales: 'Sales Tax', vat: 'VAT', gst: 'GST', withholding: 'Withholding' }[v] || v) },
    { key: 'is_default', label: 'Default', render: v => v ? 'Yes' : 'No' },
  ];

  /* ── dashboard KPIs ─────────────────────────────────────────── */
  const kpis = [
    { label: 'Total Invoiced', value: fmt(summary.total_invoiced), color: 'text-blue-600' },
    { label: 'Total Paid', value: fmt(summary.total_paid), color: 'text-green-600' },
    { label: 'Outstanding', value: fmt(summary.total_outstanding), color: 'text-yellow-600' },
    { label: 'Overdue Invoices', value: summary.overdue_count || 0, color: 'text-red-600' },
    { label: 'Total Expenses (Approved)', value: fmt(expenseDash.total_expenses), color: 'text-purple-600' },
    { label: 'Expenses This Month', value: fmt(expenseDash.this_month), color: 'text-indigo-600' },
    { label: 'Pending Expenses', value: expenseDash.pending_count || 0, color: 'text-orange-600' },
    { label: 'Active Budgets', value: budgets.filter(b => b.status === 'active').length, color: 'text-teal-600' },
  ];

  const tabLabel = () => {
    switch (tab) {
      case 'invoices': return 'Invoice';
      case 'payments': return 'Payment';
      case 'expenses': return 'Expense';
      case 'budgets': return 'Budget';
      case 'accounts': return 'Account';
      case 'journal': return 'Journal Entry';
      case 'tax_rates': return 'Tax Rate';
      default: return '';
    }
  };

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finance.title')}</h1>
        {tab !== 'dashboard' && <Button onClick={openCreate}>+ New {tabLabel()}</Button>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {TABS.map(t2 => (
          <button key={t2.key} onClick={() => setTab(t2.key)} className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t2.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t2.label}
          </button>
        ))}
      </div>

      {/* ── Dashboard Tab ─────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {kpis.map((kpi, i) => (
              <Card key={i}>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Invoice by Status */}
          {summary.by_status && summary.by_status.length > 0 && (
            <Card title="Invoices by Status">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {summary.by_status.map((s, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <StatusBadge status={s.status} />
                    <p className="text-lg font-bold mt-1">{s.count}</p>
                    <p className="text-xs text-gray-500">{fmt(s.total)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Budget Variance */}
          {budgetVariance.length > 0 && (
            <Card title="Budget Variance Report">
              <div className="space-y-3">
                {budgetVariance.map((b, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-40 text-sm font-medium truncate">{b.name}</div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div className={`h-4 rounded-full ${b.utilization > 100 ? 'bg-red-500' : b.utilization > 80 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(b.utilization, 100)}%` }} />
                      </div>
                    </div>
                    <div className="w-20 text-right text-sm font-semibold">{b.utilization?.toFixed(1)}%</div>
                    <div className="w-28 text-right text-xs text-gray-500">{fmt(b.spent)} / {fmt(b.total)}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Expenses by Category */}
          {expenseDash.by_category && expenseDash.by_category.length > 0 && (
            <Card title="Expenses by Category">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {expenseDash.by_category.map((c, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium">{c.category__name || 'Uncategorized'}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(c.total)}</p>
                    <p className="text-xs text-gray-500">{c.count} expense{c.count !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Invoices Tab ──────────────────────────────────────── */}
      {tab === 'invoices' && <Card title="Invoices"><DataTable columns={invoiceCols} data={invoices} loading={loading} onRowClick={openEdit} /></Card>}

      {/* ── Payments Tab ──────────────────────────────────────── */}
      {tab === 'payments' && <Card title="Payments"><DataTable columns={paymentCols} data={payments} loading={loading} onRowClick={openEdit} /></Card>}

      {/* ── Expenses Tab ──────────────────────────────────────── */}
      {tab === 'expenses' && <Card title="Expenses"><DataTable columns={expenseCols} data={expenses} loading={loading} onRowClick={openEdit} /></Card>}

      {/* ── Budgets Tab ───────────────────────────────────────── */}
      {tab === 'budgets' && <Card title="Budgets"><DataTable columns={budgetCols} data={budgets} loading={loading} onRowClick={openEdit} /></Card>}

      {/* ── Chart of Accounts Tab ─────────────────────────────── */}
      {tab === 'accounts' && <Card title="Chart of Accounts"><DataTable columns={accountCols} data={accounts} loading={loading} onRowClick={openEdit} /></Card>}

      {/* ── Journal Entries Tab ───────────────────────────────── */}
      {tab === 'journal' && <Card title="Journal Entries"><DataTable columns={journalCols} data={journalEntries} loading={loading} onRowClick={openEdit} /></Card>}

      {/* ── Tax Rates Tab ─────────────────────────────────────── */}
      {tab === 'tax_rates' && <Card title="Tax Rates"><DataTable columns={taxCols} data={taxRates} loading={loading} onRowClick={openEdit} /></Card>}

      {/* ═══════════════════════════════════════════════════════════
          CREATE / EDIT MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? 'Edit' : 'New'} ${tabLabel()}`} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg whitespace-pre-line">{error}</div>}

          {/* Invoice Form */}
          {tab === 'invoices' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Invoice Number" name="invoice_number" value={form.invoice_number} onChange={handleChange} required placeholder="e.g. INV-001" />
                <FormField label="Invoice Type" name="invoice_type" type="select" value={form.invoice_type} onChange={handleChange} options={[{ value: 'sales', label: 'Sales Invoice' }, { value: 'purchase', label: 'Purchase Invoice' }, { value: 'credit_note', label: 'Credit Note' }, { value: 'debit_note', label: 'Debit Note' }]} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Customer Name" name="customer_name" value={form.customer_name} onChange={handleChange} required />
                <FormField label="Customer Email" name="customer_email" type="email" value={form.customer_email} onChange={handleChange} />
              </div>
              <FormField label="Customer Address" name="customer_address" type="textarea" value={form.customer_address} onChange={handleChange} />
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={[{ value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' }, { value: 'partial', label: 'Partially Paid' }, { value: 'paid', label: 'Paid' }, { value: 'overdue', label: 'Overdue' }, { value: 'cancelled', label: 'Cancelled' }]} />
                <FormField label="Issue Date" name="issue_date" type="date" value={form.issue_date} onChange={handleChange} required />
                <FormField label="Due Date" name="due_date" type="date" value={form.due_date} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Subtotal" name="subtotal" type="number" value={form.subtotal} onChange={handleChange} />
                <FormField label="Tax Amount" name="tax_amount" type="number" value={form.tax_amount} onChange={handleChange} />
                <FormField label="Discount" name="discount_amount" type="number" value={form.discount_amount} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
                <FormField label="Terms & Conditions" name="terms" type="textarea" value={form.terms} onChange={handleChange} />
              </div>
            </>
          )}

          {/* Payment Form */}
          {tab === 'payments' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Payment Number" name="payment_number" value={form.payment_number} onChange={handleChange} required placeholder="e.g. PAY-001" />
                <FormField label="Invoice" name="invoice" type="select" value={form.invoice} onChange={handleChange} options={invoiceOptions} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Amount" name="amount" type="number" value={form.amount} onChange={handleChange} required />
                <FormField label="Payment Method" name="payment_method" type="select" value={form.payment_method} onChange={handleChange} options={[{ value: 'cash', label: 'Cash' }, { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'credit_card', label: 'Credit Card' }, { value: 'check', label: 'Check' }, { value: 'stripe', label: 'Stripe' }, { value: 'paypal', label: 'PayPal' }]} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={[{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }, { value: 'failed', label: 'Failed' }, { value: 'refunded', label: 'Refunded' }]} />
                <FormField label="Payment Date" name="payment_date" type="date" value={form.payment_date} onChange={handleChange} required />
              </div>
              <FormField label="Reference" name="reference" value={form.reference} onChange={handleChange} placeholder="Transaction reference" />
              <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
            </>
          )}

          {/* Expense Form */}
          {tab === 'expenses' && (
            <>
              <FormField label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Amount" name="amount" type="number" value={form.amount} onChange={handleChange} required />
                <FormField label="Category" name="category" type="select" value={form.category} onChange={handleChange} options={categoryOptions} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Date" name="date" type="date" value={form.date} onChange={handleChange} required />
                <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'reimbursed', label: 'Reimbursed' }]} />
              </div>
              <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
            </>
          )}

          {/* Budget Form */}
          {tab === 'budgets' && (
            <>
              <FormField label="Budget Name" name="name" value={form.name} onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Fiscal Year" name="fiscal_year" type="select" value={form.fiscal_year} onChange={handleChange} options={fyOptions} required />
                <FormField label="Department" name="department" value={form.department} onChange={handleChange} placeholder="e.g. Marketing" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Total Budget" name="total_budget" type="number" value={form.total_budget} onChange={handleChange} required />
                <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={[{ value: 'active', label: 'Active' }, { value: 'exceeded', label: 'Exceeded' }, { value: 'closed', label: 'Closed' }]} />
              </div>
            </>
          )}

          {/* Chart of Accounts Form */}
          {tab === 'accounts' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Account Code" name="code" value={form.code} onChange={handleChange} required placeholder="e.g. 1000" />
                <FormField label="Account Name" name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Account Type" name="account_type" type="select" value={form.account_type} onChange={handleChange} options={[{ value: 'asset', label: 'Asset' }, { value: 'liability', label: 'Liability' }, { value: 'equity', label: 'Equity' }, { value: 'revenue', label: 'Revenue' }, { value: 'expense', label: 'Expense' }]} />
                <FormField label="Parent Account" name="parent" type="select" value={form.parent} onChange={handleChange} options={parentAccountOptions} />
              </div>
              <FormField label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} />
            </>
          )}

          {/* Journal Entry Form */}
          {tab === 'journal' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Entry Number" name="entry_number" value={form.entry_number} onChange={handleChange} required placeholder="e.g. JE-001" />
                <FormField label="Date" name="date" type="date" value={form.date} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Fiscal Year" name="fiscal_year" type="select" value={form.fiscal_year} onChange={handleChange} options={fyOptions} required />
                <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={[{ value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'cancelled', label: 'Cancelled' }]} />
              </div>
              <FormField label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} required />
              <FormField label="Reference" name="reference" value={form.reference} onChange={handleChange} />
            </>
          )}

          {/* Tax Rate Form */}
          {tab === 'tax_rates' && (
            <>
              <FormField label="Tax Name" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. VAT 5%" />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Rate (%)" name="rate" type="number" value={form.rate} onChange={handleChange} required />
                <FormField label="Tax Type" name="tax_type" type="select" value={form.tax_type} onChange={handleChange} options={[{ value: 'sales', label: 'Sales Tax' }, { value: 'vat', label: 'VAT' }, { value: 'gst', label: 'GST' }, { value: 'withholding', label: 'Withholding' }]} />
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

      {/* ═══════════════════════════════════════════════════════════
          INVOICE DETAIL MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Modal isOpen={detailModal} onClose={() => setDetailModal(false)} title={`Invoice ${detailItem?.invoice_number || ''}`} size="xl">
        {detailItem && (
          <div className="space-y-4">
            {/* Invoice header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="font-medium">{detailItem.customer_name}</p>
                {detailItem.customer_email && <p className="text-xs text-gray-500">{detailItem.customer_email}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <StatusBadge status={detailItem.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold">{fmt(detailItem.total)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Balance Due</p>
                <p className={`text-lg font-bold ${Number(detailItem.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(detailItem.balance_due)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-gray-500">Type:</span> {({ sales: 'Sales', purchase: 'Purchase', credit_note: 'Credit Note', debit_note: 'Debit Note' }[detailItem.invoice_type])}</div>
              <div><span className="text-gray-500">Issue:</span> {detailItem.issue_date}</div>
              <div><span className="text-gray-500">Due:</span> {detailItem.due_date}</div>
              <div><span className="text-gray-500">Paid:</span> {fmt(detailItem.amount_paid)}</div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {detailItem.status === 'draft' && (
                <Button size="sm" onClick={() => sendInvoice(detailItem)}>Mark as Sent</Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => { setDetailModal(false); setEditItem(detailItem); setForm({ invoice_number: detailItem.invoice_number || '', invoice_type: detailItem.invoice_type || 'sales', customer_name: detailItem.customer_name || '', customer_email: detailItem.customer_email || '', customer_address: detailItem.customer_address || '', issue_date: detailItem.issue_date || '', due_date: detailItem.due_date || '', status: detailItem.status || 'draft', subtotal: detailItem.subtotal || '', tax_amount: detailItem.tax_amount || '', discount_amount: detailItem.discount_amount || '', notes: detailItem.notes || '', terms: detailItem.terms || '' }); setTab('invoices'); setError(''); setShowModal(true); }}>Edit Invoice</Button>
            </div>

            {/* Sub-tabs: Lines / Payments */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
              {['lines', 'payments'].map(dt => (
                <button key={dt} onClick={() => setDetailTab(dt)} className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${detailTab === dt ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {dt === 'lines' ? `Invoice Lines (${invoiceLines.length})` : `Payments (${invoicePayments.length})`}
                </button>
              ))}
            </div>

            {/* Invoice Lines */}
            {detailTab === 'lines' && (
              <div className="space-y-3">
                {invoiceLines.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 font-medium">Description</th>
                        <th className="text-right py-2 font-medium">Qty</th>
                        <th className="text-right py-2 font-medium">Unit Price</th>
                        <th className="text-right py-2 font-medium">Tax %</th>
                        <th className="text-right py-2 font-medium">Disc %</th>
                        <th className="text-right py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceLines.map((line, i) => (
                        <tr key={line.id || i} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2">{line.description}</td>
                          <td className="text-right py-2">{line.quantity}</td>
                          <td className="text-right py-2">{fmt(line.unit_price)}</td>
                          <td className="text-right py-2">{line.tax_rate}%</td>
                          <td className="text-right py-2">{line.discount_percent}%</td>
                          <td className="text-right py-2 font-semibold">{fmt(line.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No invoice lines yet. Add one below.</p>
                )}

                {/* Add Line Form */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                  <p className="text-sm font-semibold">Add Invoice Line</p>
                  <FormField label="Description" name="description" value={lineForm.description} onChange={(n, v) => setLineForm(f => ({ ...f, [n]: v }))} required />
                  <div className="grid grid-cols-4 gap-3">
                    <FormField label="Qty" name="quantity" type="number" value={lineForm.quantity} onChange={(n, v) => setLineForm(f => ({ ...f, [n]: v }))} />
                    <FormField label="Unit Price" name="unit_price" type="number" value={lineForm.unit_price} onChange={(n, v) => setLineForm(f => ({ ...f, [n]: v }))} required />
                    <FormField label="Tax %" name="tax_rate" type="number" value={lineForm.tax_rate} onChange={(n, v) => setLineForm(f => ({ ...f, [n]: v }))} />
                    <FormField label="Disc %" name="discount_percent" type="number" value={lineForm.discount_percent} onChange={(n, v) => setLineForm(f => ({ ...f, [n]: v }))} />
                  </div>
                  <Button size="sm" onClick={addInvoiceLine} loading={addingLine} disabled={!lineForm.description || !lineForm.unit_price}>Add Line</Button>
                </div>
              </div>
            )}

            {/* Payments for this invoice */}
            {detailTab === 'payments' && (
              <div>
                {invoicePayments.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 font-medium">Payment #</th>
                        <th className="text-right py-2 font-medium">Amount</th>
                        <th className="text-left py-2 font-medium">Method</th>
                        <th className="text-left py-2 font-medium">Status</th>
                        <th className="text-left py-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoicePayments.map((p, i) => (
                        <tr key={p.id || i} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2">{p.payment_number}</td>
                          <td className="text-right py-2">{fmt(p.amount)}</td>
                          <td className="py-2">{p.payment_method}</td>
                          <td className="py-2"><StatusBadge status={p.status} /></td>
                          <td className="py-2">{p.payment_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No payments recorded for this invoice.</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
