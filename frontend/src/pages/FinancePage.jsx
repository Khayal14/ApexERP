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
const emptyBudget = { name: '', fiscal_year: '', department: '', total_budget: '', status: 'active' };
const emptyTaxRate = { name: '', rate: '', tax_type: 'vat', is_default: false };
const emptyAccount = { code: '', name: '', account_type: 'asset', parent: '', description: '', is_reconcilable: false };
const emptyJournalEntry = { entry_number: '', date: '', fiscal_year: '', description: '', status: 'draft', reference: '' };

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
  const [overdueInvoices, setOverdueInvoices] = useState([]);
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
  const pct = (n) => `${(n || 0).toFixed(1)}%`;

  /* ── tabs ────────────────────────────────────────────────────── */
  const TABS = [
    { key: 'dashboard', label: t('finance.dashboard') },
    { key: 'invoices', label: t('finance.invoices') },
    { key: 'payments', label: t('finance.payments') },
    { key: 'expenses', label: t('finance.expenses') },
    { key: 'budgets', label: t('finance.budgets') },
    { key: 'accounts', label: t('finance.accounts') },
    { key: 'journal', label: t('finance.journal') },
    { key: 'tax_rates', label: t('finance.tax_rates') },
  ];

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
      api.get('/finance/invoices/overdue/').catch(() => ({ data: { results: [] } })),
    ]).then(([inv, pay, exp, expCat, bud, acc, je, tax, fy, sum, expD, budV, overdue]) => {
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
      setOverdueInvoices(overdue.data.results || overdue.data || []);
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

  const tabLabel = () => t(`finance.${({ invoices: 'invoice', payments: 'payment', expenses: 'expense', budgets: 'budget', accounts: 'account', journal: 'journal_entry', tax_rates: 'tax_rate' })[tab] || 'invoice'}`);

  const openCreate = () => { setEditItem(null); setForm(getEmpty()); setError(''); setShowModal(true); };

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
      ['subtotal', 'tax_amount', 'discount_amount', 'amount', 'total_budget', 'spent', 'rate', 'balance'].forEach(k => {
        if (k in payload && (payload[k] === '' || payload[k] === null || payload[k] === undefined)) payload[k] = 0;
      });
      ['invoice', 'category', 'parent', 'fiscal_year', 'employee'].forEach(k => {
        if (k in payload && payload[k] === '') payload[k] = null;
      });
      if (editItem) await api.put(`${endpoint}${editItem.id}/`, payload);
      else await api.post(endpoint, payload);
      setShowModal(false);
      fetchData();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n') : t('common.failed_save'));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!editItem || !confirm(t('common.are_you_sure'))) return;
    try { await api.delete(`${getEndpoint()}${editItem.id}/`); setShowModal(false); fetchData(); }
    catch { setError(t('common.failed_delete')); }
  };

  /* ── invoice actions ────────────────────────────────────────── */
  const sendInvoice = async (inv) => {
    try { await api.post(`/finance/invoices/${inv.id}/send-invoice/`); fetchData(); setDetailModal(false); }
    catch { alert('Failed'); }
  };

  const addInvoiceLine = async () => {
    if (!detailItem) return;
    setAddingLine(true);
    try {
      const payload = { ...lineForm };
      ['quantity', 'unit_price', 'tax_rate', 'discount_percent'].forEach(k => { if (payload[k] === '' || payload[k] === null) payload[k] = 0; });
      const res = await api.post(`/finance/invoices/${detailItem.id}/add-line/`, payload);
      setDetailItem(res.data);
      setInvoiceLines(res.data.lines || []);
      setLineForm({ description: '', quantity: '1', unit_price: '', tax_rate: '0', discount_percent: '0' });
      fetchData();
    } catch (err) { alert(err.response?.data ? JSON.stringify(err.response.data) : 'Failed'); }
    finally { setAddingLine(false); }
  };

  const approveExpense = async (exp) => { try { await api.post(`/finance/expenses/${exp.id}/approve/`); fetchData(); } catch {} };
  const rejectExpense = async (exp) => { try { await api.post(`/finance/expenses/${exp.id}/reject/`); fetchData(); } catch {} };
  const postJournalEntry = async (entry) => { try { await api.post(`/finance/journal-entries/${entry.id}/post-entry/`); fetchData(); } catch (err) { alert(err.response?.data?.error || 'Failed'); } };

  /* ── dropdown options ───────────────────────────────────────── */
  const invoiceOptions = invoices.map(i => ({ value: i.id, label: `${i.invoice_number} - ${i.customer_name}` }));
  const categoryOptions = expenseCategories.map(c => ({ value: c.id, label: c.name }));
  const accountOptions = accounts.map(a => ({ value: a.id, label: `${a.code} - ${a.name}` }));
  const fyOptions = fiscalYears.map(f => ({ value: f.id, label: f.name }));
  const parentAccountOptions = [{ value: '', label: t('common.top_level') }, ...accountOptions];

  /* ── invoice type / status maps ─────────────────────────────── */
  const invoiceTypeMap = { sales: t('finance.sales_invoice'), purchase: t('finance.purchase_invoice'), credit_note: t('finance.credit_note'), debit_note: t('finance.debit_note') };
  const invoiceStatusMap = { draft: t('finance.draft'), sent: t('finance.sent'), partial: t('finance.partial'), paid: t('finance.paid'), overdue: t('finance.overdue'), cancelled: t('finance.cancelled') };
  const payMethodMap = { cash: t('finance.cash'), bank_transfer: t('finance.bank_transfer'), credit_card: t('finance.credit_card'), check: t('finance.check'), stripe: t('finance.stripe'), paypal: t('finance.paypal') };
  const payStatusMap = { pending: t('finance.pending'), completed: t('finance.completed'), failed: t('finance.failed'), refunded: t('finance.refunded') };
  const accTypeMap = { asset: t('finance.asset'), liability: t('finance.liability'), equity: t('finance.equity'), revenue: t('finance.revenue_type'), expense: t('finance.expense_type') };
  const taxTypeMap = { sales: t('finance.sales_tax'), vat: t('finance.vat'), gst: t('finance.gst'), withholding: t('finance.withholding') };

  /* ── column definitions ─────────────────────────────────────── */
  const invoiceCols = [
    { key: 'invoice_number', label: t('finance.invoice_number') },
    { key: 'customer_name', label: t('finance.customer_name') },
    { key: 'invoice_type', label: t('finance.invoice_type'), render: v => invoiceTypeMap[v] || v },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> },
    { key: 'total', label: t('common.total'), render: v => fmt(v) },
    { key: 'balance_due', label: t('finance.balance_due'), render: v => <span className={Number(v) > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>{fmt(v)}</span> },
    { key: 'issue_date', label: t('finance.issue_date') },
    { key: 'due_date', label: t('finance.due_date') },
  ];

  const paymentCols = [
    { key: 'payment_number', label: t('finance.payment_number') },
    { key: 'amount', label: t('common.amount'), render: v => fmt(v) },
    { key: 'payment_method', label: t('finance.payment_method'), render: v => payMethodMap[v] || v },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> },
    { key: 'payment_date', label: t('finance.payment_date') },
    { key: 'reference', label: t('common.reference') },
  ];

  const expenseCols = [
    { key: 'description', label: t('common.description'), render: v => v?.length > 50 ? v.slice(0, 50) + '...' : v },
    { key: 'category_name', label: t('common.category') },
    { key: 'amount', label: t('common.amount'), render: v => fmt(v) },
    { key: 'date', label: t('common.date') },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v || 'pending'} /> },
    { key: 'is_reimbursable', label: t('common.reimbursable'), render: v => v ? t('common.yes') : t('common.no') },
    { key: '_actions', label: t('common.actions'), render: (_, row) => row.status === 'pending' ? (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); approveExpense(row); }} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">{t('common.approve')}</button>
        <button onClick={(e) => { e.stopPropagation(); rejectExpense(row); }} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">{t('common.reject')}</button>
      </div>
    ) : null },
  ];

  const budgetCols = [
    { key: 'name', label: t('finance.budget_name') },
    { key: 'department', label: t('common.department') },
    { key: 'total_budget', label: t('finance.total_budget'), render: v => fmt(v) },
    { key: 'spent', label: t('finance.spent'), render: v => fmt(v) },
    { key: 'remaining', label: t('finance.remaining'), render: v => <span className={Number(v) < 0 ? 'text-red-600 font-semibold' : ''}>{fmt(v)}</span> },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> },
  ];

  const accountCols = [
    { key: 'code', label: t('common.code') },
    { key: 'name', label: t('finance.account_name') },
    { key: 'account_type', label: t('finance.account_type'), render: v => accTypeMap[v] || v },
    { key: 'balance', label: t('common.balance'), render: v => fmt(v) },
    { key: 'is_reconcilable', label: t('common.reconcilable'), render: v => v ? t('common.yes') : t('common.no') },
  ];

  const journalCols = [
    { key: 'entry_number', label: t('finance.entry_number') },
    { key: 'date', label: t('common.date') },
    { key: 'description', label: t('common.description'), render: v => v?.length > 40 ? v.slice(0, 40) + '...' : v },
    { key: 'total_debit', label: t('finance.debit'), render: v => fmt(v) },
    { key: 'total_credit', label: t('finance.credit'), render: v => fmt(v) },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> },
    { key: '_actions', label: t('common.actions'), render: (_, row) => row.status === 'draft' ? (
      <button onClick={(e) => { e.stopPropagation(); postJournalEntry(row); }} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">{t('common.post')}</button>
    ) : null },
  ];

  const taxCols = [
    { key: 'name', label: t('finance.tax_name') },
    { key: 'rate', label: t('common.rate'), render: v => `${v}%` },
    { key: 'tax_type', label: t('finance.tax_type'), render: v => taxTypeMap[v] || v },
    { key: 'is_default', label: t('common.default'), render: v => v ? t('common.yes') : t('common.no') },
  ];

  /* ── computed dashboard values ──────────────────────────────── */
  const totalInvoiced = Number(summary.total_invoiced) || 0;
  const totalPaid = Number(summary.total_paid) || 0;
  const totalOutstanding = Number(summary.total_outstanding) || 0;
  const totalExpApproved = Number(expenseDash.total_expenses) || 0;
  const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced * 100) : 0;
  const avgInvoiceValue = invoices.length > 0 ? totalInvoiced / invoices.length : 0;
  const netCashFlow = totalPaid - totalExpApproved;
  const recentPayments = [...payments].sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || '')).slice(0, 5);

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finance.title')}</h1>
        {tab !== 'dashboard' && <Button onClick={openCreate}>+ {t('common.new')} {tabLabel()}</Button>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {TABS.map(t2 => (
          <button key={t2.key} onClick={() => setTab(t2.key)} className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t2.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t2.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          DASHBOARD TAB
          ══════════════════════════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <>
          {/* Row 1: Primary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('finance.total_invoiced')}</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{fmt(totalInvoiced)}</p>
              </div>
            </Card>
            <Card>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('finance.total_paid')}</p>
                <p className="text-xl font-bold text-green-600 mt-1">{fmt(totalPaid)}</p>
              </div>
            </Card>
            <Card>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('finance.outstanding')}</p>
                <p className="text-xl font-bold text-yellow-600 mt-1">{fmt(totalOutstanding)}</p>
              </div>
            </Card>
            <Card>
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('finance.overdue_invoices')}</p>
                <p className="text-xl font-bold text-red-600 mt-1">{summary.overdue_count || 0}</p>
              </div>
            </Card>
          </div>

          {/* Row 2: Cash Flow & Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card title={t('finance.cash_flow_summary')}>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('finance.money_in')}</span>
                  <span className="font-semibold text-green-600">{fmt(totalPaid)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('finance.money_out')}</span>
                  <span className="font-semibold text-red-600">{fmt(totalExpApproved)}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
                  <span className="text-sm font-medium">{t('finance.net_cash_flow')}</span>
                  <span className={`text-lg font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(netCashFlow)}</span>
                </div>
              </div>
            </Card>

            <Card title={t('finance.financial_overview')}>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{t('finance.collection_rate')}</span>
                    <span className="font-semibold">{pct(collectionRate)}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${collectionRate > 80 ? 'bg-green-500' : collectionRate > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(collectionRate, 100)}%` }} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('finance.avg_invoice_value')}</span>
                  <span className="font-semibold">{fmt(avgInvoiceValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('finance.pending_expenses')}</span>
                  <span className="font-semibold text-orange-600">{expenseDash.pending_count || 0}</span>
                </div>
              </div>
            </Card>

            <Card title={t('finance.expenses_this_month')}>
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-3xl font-bold text-purple-600">{fmt(expenseDash.this_month)}</p>
                <p className="text-sm text-gray-500 mt-1">{t('finance.total_expenses_approved')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{fmt(totalExpApproved)}</p>
                <p className="text-sm text-gray-500 mt-1">{t('finance.active_budgets')}: <span className="font-semibold">{budgets.filter(b => b.status === 'active').length}</span></p>
              </div>
            </Card>
          </div>

          {/* Row 3: Invoices by Status */}
          {summary.by_status && summary.by_status.length > 0 && (
            <Card title={t('finance.invoices_by_status')}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {summary.by_status.map((s, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <StatusBadge status={s.status} />
                    <p className="text-2xl font-bold mt-2">{s.count}</p>
                    <p className="text-xs text-gray-500 mt-1">{fmt(s.total)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Row 4: Overdue Invoices + Recent Payments side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Overdue Invoices */}
            <Card title={t('finance.overdue_invoices_list')}>
              {overdueInvoices.length > 0 ? (
                <div className="space-y-2">
                  {overdueInvoices.slice(0, 5).map((inv, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20" onClick={() => openInvoiceDetail(inv)}>
                      <div>
                        <p className="font-medium text-sm">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500">{inv.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600 text-sm">{fmt(inv.balance_due)}</p>
                        <p className="text-xs text-gray-500">{t('finance.due_date')}: {inv.due_date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">{t('common.no_data')}</p>
              )}
            </Card>

            {/* Recent Payments */}
            <Card title={t('finance.recent_payments')}>
              {recentPayments.length > 0 ? (
                <div className="space-y-2">
                  {recentPayments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{p.payment_number}</p>
                        <p className="text-xs text-gray-500">{payMethodMap[p.payment_method] || p.payment_method}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 text-sm">{fmt(p.amount)}</p>
                        <p className="text-xs text-gray-500">{p.payment_date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">{t('common.no_data')}</p>
              )}
            </Card>
          </div>

          {/* Row 5: Budget Variance */}
          {budgetVariance.length > 0 && (
            <Card title={t('finance.budget_variance')}>
              <div className="space-y-3">
                {budgetVariance.map((b, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-40 text-sm font-medium truncate">{b.name}</div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div className={`h-4 rounded-full transition-all ${b.utilization > 100 ? 'bg-red-500' : b.utilization > 80 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(b.utilization, 100)}%` }} />
                      </div>
                    </div>
                    <div className="w-16 text-right text-sm font-semibold">{pct(b.utilization)}</div>
                    <div className="w-32 text-right text-xs text-gray-500">{fmt(b.spent)} / {fmt(b.total)}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Row 6: Expenses by Category */}
          {expenseDash.by_category && expenseDash.by_category.length > 0 && (
            <Card title={t('finance.expenses_by_category')}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {expenseDash.by_category.map((c, i) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium">{c.category__name || t('finance.uncategorized')}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{fmt(c.total)}</p>
                    <p className="text-xs text-gray-500">{c.count} {c.count !== 1 ? t('finance.expense_count_plural') : t('finance.expense_count')}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Data Tabs ─────────────────────────────────────────── */}
      {tab === 'invoices' && <Card title={t('finance.invoices')}><DataTable columns={invoiceCols} data={invoices} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'payments' && <Card title={t('finance.payments')}><DataTable columns={paymentCols} data={payments} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'expenses' && <Card title={t('finance.expenses')}><DataTable columns={expenseCols} data={expenses} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'budgets' && <Card title={t('finance.budgets')}><DataTable columns={budgetCols} data={budgets} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'accounts' && <Card title={t('finance.accounts')}><DataTable columns={accountCols} data={accounts} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'journal' && <Card title={t('finance.journal')}><DataTable columns={journalCols} data={journalEntries} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'tax_rates' && <Card title={t('finance.tax_rates')}><DataTable columns={taxCols} data={taxRates} loading={loading} onRowClick={openEdit} /></Card>}

      {/* ═══════════════════════════════════════════════════════════
          CREATE / EDIT MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? t('common.edit') : t('common.new')} ${tabLabel()}`} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg whitespace-pre-line">{error}</div>}

          {tab === 'invoices' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('finance.invoice_number')} name="invoice_number" value={form.invoice_number} onChange={handleChange} required placeholder="INV-001" />
                <FormField label={t('finance.invoice_type')} name="invoice_type" type="select" value={form.invoice_type} onChange={handleChange} options={[{ value: 'sales', label: t('finance.sales_invoice') }, { value: 'purchase', label: t('finance.purchase_invoice') }, { value: 'credit_note', label: t('finance.credit_note') }, { value: 'debit_note', label: t('finance.debit_note') }]} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('finance.customer_name')} name="customer_name" value={form.customer_name} onChange={handleChange} required />
                <FormField label={t('finance.customer_email')} name="customer_email" type="email" value={form.customer_email} onChange={handleChange} />
              </div>
              <FormField label={t('finance.customer_address')} name="customer_address" type="textarea" value={form.customer_address} onChange={handleChange} />
              <div className="grid grid-cols-3 gap-4">
                <FormField label={t('common.status')} name="status" type="select" value={form.status} onChange={handleChange} options={Object.entries(invoiceStatusMap).map(([v, l]) => ({ value: v, label: l }))} />
                <FormField label={t('finance.issue_date')} name="issue_date" type="date" value={form.issue_date} onChange={handleChange} required />
                <FormField label={t('finance.due_date')} name="due_date" type="date" value={form.due_date} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label={t('finance.subtotal')} name="subtotal" type="number" value={form.subtotal} onChange={handleChange} />
                <FormField label={t('finance.tax_amount')} name="tax_amount" type="number" value={form.tax_amount} onChange={handleChange} />
                <FormField label={t('finance.discount')} name="discount_amount" type="number" value={form.discount_amount} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('common.notes')} name="notes" type="textarea" value={form.notes} onChange={handleChange} />
                <FormField label={t('finance.terms')} name="terms" type="textarea" value={form.terms} onChange={handleChange} />
              </div>
            </>
          )}

          {tab === 'payments' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('finance.payment_number')} name="payment_number" value={form.payment_number} onChange={handleChange} required placeholder="PAY-001" />
                <FormField label={t('finance.invoice')} name="invoice" type="select" value={form.invoice} onChange={handleChange} options={invoiceOptions} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('common.amount')} name="amount" type="number" value={form.amount} onChange={handleChange} required />
                <FormField label={t('finance.payment_method')} name="payment_method" type="select" value={form.payment_method} onChange={handleChange} options={Object.entries(payMethodMap).map(([v, l]) => ({ value: v, label: l }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('common.status')} name="status" type="select" value={form.status} onChange={handleChange} options={Object.entries(payStatusMap).map(([v, l]) => ({ value: v, label: l }))} />
                <FormField label={t('finance.payment_date')} name="payment_date" type="date" value={form.payment_date} onChange={handleChange} required />
              </div>
              <FormField label={t('common.reference')} name="reference" value={form.reference} onChange={handleChange} placeholder={t('finance.transaction_ref')} />
              <FormField label={t('common.notes')} name="notes" type="textarea" value={form.notes} onChange={handleChange} />
            </>
          )}

          {tab === 'expenses' && (
            <>
              <FormField label={t('common.description')} name="description" type="textarea" value={form.description} onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('common.amount')} name="amount" type="number" value={form.amount} onChange={handleChange} required />
                <FormField label={t('common.category')} name="category" type="select" value={form.category} onChange={handleChange} options={categoryOptions} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('common.date')} name="date" type="date" value={form.date} onChange={handleChange} required />
                <FormField label={t('common.status')} name="status" type="select" value={form.status} onChange={handleChange} options={[{ value: 'pending', label: t('finance.pending') }, { value: 'approved', label: t('finance.approved') }, { value: 'rejected', label: t('finance.rejected') }, { value: 'reimbursed', label: t('finance.reimbursed') }]} />
              </div>
              <FormField label={t('common.notes')} name="notes" type="textarea" value={form.notes} onChange={handleChange} />
            </>
          )}

          {tab === 'budgets' && (
            <>
              <FormField label={t('finance.budget_name')} name="name" value={form.name} onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('finance.fiscal_year')} name="fiscal_year" type="select" value={form.fiscal_year} onChange={handleChange} options={fyOptions} required />
                <FormField label={t('common.department')} name="department" value={form.department} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('finance.total_budget')} name="total_budget" type="number" value={form.total_budget} onChange={handleChange} required />
                <FormField label={t('common.status')} name="status" type="select" value={form.status} onChange={handleChange} options={[{ value: 'active', label: t('common.active') }, { value: 'exceeded', label: t('finance.exceeded') }, { value: 'closed', label: t('finance.closed') }]} />
              </div>
            </>
          )}

          {tab === 'accounts' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('finance.account_code')} name="code" value={form.code} onChange={handleChange} required placeholder="1000" />
                <FormField label={t('finance.account_name')} name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('finance.account_type')} name="account_type" type="select" value={form.account_type} onChange={handleChange} options={Object.entries(accTypeMap).map(([v, l]) => ({ value: v, label: l }))} />
                <FormField label={t('finance.parent_account')} name="parent" type="select" value={form.parent} onChange={handleChange} options={parentAccountOptions} />
              </div>
              <FormField label={t('common.description')} name="description" type="textarea" value={form.description} onChange={handleChange} />
            </>
          )}

          {tab === 'journal' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('finance.entry_number')} name="entry_number" value={form.entry_number} onChange={handleChange} required placeholder="JE-001" />
                <FormField label={t('common.date')} name="date" type="date" value={form.date} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('finance.fiscal_year')} name="fiscal_year" type="select" value={form.fiscal_year} onChange={handleChange} options={fyOptions} required />
                <FormField label={t('common.status')} name="status" type="select" value={form.status} onChange={handleChange} options={[{ value: 'draft', label: t('finance.draft') }, { value: 'posted', label: t('finance.posted') }, { value: 'cancelled', label: t('finance.cancelled') }]} />
              </div>
              <FormField label={t('common.description')} name="description" type="textarea" value={form.description} onChange={handleChange} required />
              <FormField label={t('common.reference')} name="reference" value={form.reference} onChange={handleChange} />
            </>
          )}

          {tab === 'tax_rates' && (
            <>
              <FormField label={t('finance.tax_name')} name="name" value={form.name} onChange={handleChange} required placeholder="VAT 5%" />
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('common.rate')} name="rate" type="number" value={form.rate} onChange={handleChange} required />
                <FormField label={t('finance.tax_type')} name="tax_type" type="select" value={form.tax_type} onChange={handleChange} options={Object.entries(taxTypeMap).map(([v, l]) => ({ value: v, label: l }))} />
              </div>
            </>
          )}

          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>{editItem && <Button type="button" variant="danger" onClick={handleDelete}>{t('common.delete')}</Button>}</div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
              <Button type="submit" loading={saving}>{editItem ? t('common.update') : t('common.create')}</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          INVOICE DETAIL MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Modal isOpen={detailModal} onClose={() => setDetailModal(false)} title={`${t('finance.invoice')} ${detailItem?.invoice_number || ''}`} size="xl">
        {detailItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">{t('common.customer')}</p>
                <p className="font-medium">{detailItem.customer_name}</p>
                {detailItem.customer_email && <p className="text-xs text-gray-500">{detailItem.customer_email}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('common.status')}</p>
                <StatusBadge status={detailItem.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('common.total')}</p>
                <p className="text-lg font-bold">{fmt(detailItem.total)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('finance.balance_due')}</p>
                <p className={`text-lg font-bold ${Number(detailItem.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(detailItem.balance_due)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-gray-500">{t('common.type')}:</span> {invoiceTypeMap[detailItem.invoice_type]}</div>
              <div><span className="text-gray-500">{t('finance.issue_date')}:</span> {detailItem.issue_date}</div>
              <div><span className="text-gray-500">{t('finance.due_date')}:</span> {detailItem.due_date}</div>
              <div><span className="text-gray-500">{t('finance.amount_paid')}:</span> {fmt(detailItem.amount_paid)}</div>
            </div>

            <div className="flex gap-2">
              {detailItem.status === 'draft' && <Button size="sm" onClick={() => sendInvoice(detailItem)}>{t('finance.mark_sent')}</Button>}
              <Button size="sm" variant="secondary" onClick={() => { setDetailModal(false); setEditItem(detailItem); const f = {}; Object.keys(emptyInvoice).forEach(k => { f[k] = detailItem[k] ?? emptyInvoice[k]; }); setForm(f); setTab('invoices'); setError(''); setShowModal(true); }}>{t('finance.edit_invoice')}</Button>
            </div>

            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
              {['lines', 'payments'].map(dt => (
                <button key={dt} onClick={() => setDetailTab(dt)} className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${detailTab === dt ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {dt === 'lines' ? `${t('finance.invoice_lines')} (${invoiceLines.length})` : `${t('finance.payments')} (${invoicePayments.length})`}
                </button>
              ))}
            </div>

            {detailTab === 'lines' && (
              <div className="space-y-3">
                {invoiceLines.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 font-medium">{t('common.description')}</th>
                      <th className="text-right py-2 font-medium">{t('finance.quantity')}</th>
                      <th className="text-right py-2 font-medium">{t('finance.unit_price')}</th>
                      <th className="text-right py-2 font-medium">{t('finance.tax_percent')}</th>
                      <th className="text-right py-2 font-medium">{t('finance.discount_percent')}</th>
                      <th className="text-right py-2 font-medium">{t('common.total')}</th>
                    </tr></thead>
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
                ) : <p className="text-sm text-gray-500 text-center py-4">{t('finance.no_lines')}</p>}

                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                  <p className="text-sm font-semibold">{t('finance.add_invoice_line')}</p>
                  <FormField label={t('common.description')} name="description" value={lineForm.description} onChange={(n, v) => setLineForm(f => ({ ...f, [n]: v }))} required />
                  <div className="grid grid-cols-4 gap-3">
                    <FormField label={t('finance.quantity')} name="quantity" type="number" value={lineForm.quantity} onChange={(n, v) => setLineForm(f => ({ ...f, [n]: v }))} />
                    <FormField label={t('finance.unit_price')} name="unit_price" type="number" value={lineForm.unit_price} onChange={(n, v) => setLineForm(f => ({ ...f, [n]: v }))} required />
                    <FormField label={t('finance.tax_percent')} name="tax_rate" type="number" value={lineForm.tax_rate} onChange={(n, v) => setLineForm(f => ({ ...f, [n]: v }))} />
                    <FormField label={t('finance.discount_percent')} name="discount_percent" type="number" value={lineForm.discount_percent} onChange={(n, v) => setLineForm(f => ({ ...f, [n]: v }))} />
                  </div>
                  <Button size="sm" onClick={addInvoiceLine} loading={addingLine} disabled={!lineForm.description || !lineForm.unit_price}>{t('finance.add_line')}</Button>
                </div>
              </div>
            )}

            {detailTab === 'payments' && (
              <div>
                {invoicePayments.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 font-medium">{t('finance.payment_number')}</th>
                      <th className="text-right py-2 font-medium">{t('common.amount')}</th>
                      <th className="text-left py-2 font-medium">{t('common.method')}</th>
                      <th className="text-left py-2 font-medium">{t('common.status')}</th>
                      <th className="text-left py-2 font-medium">{t('common.date')}</th>
                    </tr></thead>
                    <tbody>
                      {invoicePayments.map((p, i) => (
                        <tr key={p.id || i} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2">{p.payment_number}</td>
                          <td className="text-right py-2">{fmt(p.amount)}</td>
                          <td className="py-2">{payMethodMap[p.payment_method] || p.payment_method}</td>
                          <td className="py-2"><StatusBadge status={p.status} /></td>
                          <td className="py-2">{p.payment_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-sm text-gray-500 text-center py-4">{t('finance.no_payments')}</p>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
