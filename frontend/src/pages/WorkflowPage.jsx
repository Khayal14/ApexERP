import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import api from '../api/client';

/* ─── Business Lines ─── */
const BUSINESS_LINES = [
  { key: 'all',    label: 'All Lines',              icon: '🏢', color: 'border-gray-400' },
  { key: 'led',    label: 'LED Lights',             icon: '💡', color: 'border-amber-400' },
  { key: 'heater', label: 'Heater & Thermocouple',  icon: '🔥', color: 'border-red-400' },
  { key: 'solar',  label: 'Solar AC',               icon: '☀️', color: 'border-blue-400' },
  { key: 'trade',  label: 'Trade',                  icon: '🌍', color: 'border-emerald-400' },
];

/* ─── Pipeline Steps ─── */
const PIPELINE_STEPS = [
  { key: 'leads',       label: 'Leads / Inquiries',   icon: '📨', endpoint: '/workflow/leads/' },
  { key: 'supplier_pi', label: 'Supplier PI',          icon: '📋', endpoint: '/workflow/supplier-pis/' },
  { key: 'quotations',  label: 'Client Quotations',    icon: '📄', endpoint: '/workflow/quotations/' },
  { key: 'client_po',   label: 'Client PO',            icon: '🛒', endpoint: '/workflow/client-pos/' },
  { key: 'invoices',    label: 'Commercial Invoices',   icon: '💰', endpoint: '/workflow/invoices/' },
  { key: 'deliveries',  label: 'Deliveries',           icon: '🚚', endpoint: '/workflow/deliveries/' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'EGP', label: 'EGP (ج.م)' },
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'IQD', label: 'IQD (ع.د)' },
];

const BL_OPTIONS = [
  { value: 'led',    label: 'LED Lights' },
  { value: 'heater', label: 'Heater & Thermocouple' },
  { value: 'solar',  label: 'Solar AC' },
  { value: 'trade',  label: 'Trade' },
];

/* ─── Empty form templates ─── */
const emptyLead = { business_line: 'led', client_name: '', client_email: '', client_phone: '', client_company: '', source: 'direct', status: 'new', product_interest: '', estimated_value: '', currency: 'USD', notes: '' };
const emptyPI = { business_line: 'led', pi_number: '', supplier: '', issue_date: '', expiry_date: '', currency: 'USD', subtotal: '', shipping_cost: '0', insurance_cost: '0', customs_cost: '0', total: '', exchange_rate_to_iqd: '1', notes: '' };
const emptyQuotation = { business_line: 'led', quotation_number: '', lead: '', supplier_pi: '', client_name: '', client_email: '', client_phone: '', client_company: '', status: 'draft', issue_date: '', valid_until: '', currency: 'USD', subtotal: '', margin_percent: '', tax_amount: '0', discount_amount: '0', total: '', terms: '', notes: '' };
const emptyClientPO = { business_line: 'led', po_number: '', quotation: '', client_name: '', client_email: '', client_company: '', status: 'received', fulfillment_source: 'from_stock', order_date: '', expected_delivery: '', currency: 'USD', subtotal: '', tax_amount: '0', total: '', notes: '' };
const emptyInvoice = { business_line: 'led', invoice_number: '', client_po: '', client_name: '', client_email: '', client_company: '', client_address: '', status: 'draft', issue_date: '', due_date: '', currency: 'USD', subtotal: '', tax_amount: '0', discount_amount: '0', total: '', terms: '', notes: '' };
const emptyDelivery = { business_line: 'led', delivery_number: '', client_po: '', commercial_invoice: '', status: 'pending', client_name: '', delivery_address: '', scheduled_date: '', tracking_number: '', notes: '' };

const empties = { leads: emptyLead, supplier_pi: emptyPI, quotations: emptyQuotation, client_po: emptyClientPO, invoices: emptyInvoice, deliveries: emptyDelivery };

/* ─── Pipeline Step Badge ─── */
function PipelineStepper({ steps, active, counts, onStepClick }) {
  return (
    <div className="flex overflow-x-auto gap-1 pb-2 scrollbar-thin">
      {steps.map((step, i) => {
        const isActive = active === step.key;
        return (
          <button
            key={step.key}
            onClick={() => onStepClick(step.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              isActive
                ? 'bg-primary-600 text-white shadow-md shadow-primary-200 dark:shadow-primary-900/40'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
            }`}
          >
            <span className="text-base">{step.icon}</span>
            <span>{step.label}</span>
            {counts[step.key] > 0 && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>{counts[step.key]}</span>
            )}
            {i < steps.length - 1 && (
              <span className={`ml-1 text-xs ${isActive ? 'text-white/50' : 'text-gray-300 dark:text-gray-600'}`}>→</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Column definitions per step ─── */
function getColumns(step, t, fmt) {
  const blCol = { key: 'business_line', label: 'Line', render: (v) => {
    const bl = BUSINESS_LINES.find(b => b.key === v);
    return bl ? <span>{bl.icon} {bl.label}</span> : v;
  }};
  const statusCol = { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> };

  switch (step) {
    case 'leads':
      return [blCol, { key: 'client_name', label: 'Client' }, { key: 'client_company', label: 'Company' }, { key: 'source', label: 'Source', render: v => v?.replace(/_/g, ' ') }, statusCol, { key: 'estimated_value', label: 'Est. Value', render: (v, r) => `${r.currency} ${fmt(v)}` }, { key: 'created_at', label: 'Date', render: v => v ? new Date(v).toLocaleDateString() : '-' }];
    case 'supplier_pi':
      return [blCol, { key: 'pi_number', label: 'PI #' }, { key: 'supplier_name', label: 'Supplier' }, { key: 'currency', label: 'Currency' }, { key: 'total', label: 'Total', render: (v, r) => `${r.currency} ${fmt(v)}` }, { key: 'issue_date', label: 'Date' }];
    case 'quotations':
      return [blCol, { key: 'quotation_number', label: 'Quote #' }, { key: 'client_name', label: 'Client' }, statusCol, { key: 'margin_percent', label: 'Margin %', render: v => `${v || 0}%` }, { key: 'total', label: 'Total', render: (v, r) => `${r.currency} ${fmt(v)}` }, { key: 'valid_until', label: 'Valid Until' }];
    case 'client_po':
      return [blCol, { key: 'po_number', label: 'PO #' }, { key: 'client_name', label: 'Client' }, statusCol, { key: 'fulfillment_source', label: 'Source', render: v => v?.replace(/_/g, ' ') }, { key: 'total', label: 'Total', render: (v, r) => `${r.currency} ${fmt(v)}` }, { key: 'order_date', label: 'Order Date' }];
    case 'invoices':
      return [blCol, { key: 'invoice_number', label: 'Invoice #' }, { key: 'client_name', label: 'Client' }, statusCol, { key: 'total', label: 'Total', render: (v, r) => `${r.currency} ${fmt(v)}` }, { key: 'balance_due', label: 'Balance', render: (v, r) => `${r.currency} ${fmt(v)}` }, { key: 'due_date', label: 'Due Date' }];
    case 'deliveries':
      return [blCol, { key: 'delivery_number', label: 'Delivery #' }, { key: 'client_name', label: 'Client' }, statusCol, { key: 'scheduled_date', label: 'Scheduled' }, { key: 'actual_date', label: 'Delivered', render: v => v || '—' }];
    default:
      return [];
  }
}

/* ─── Form fields per step ─── */
function StepForm({ step, form, onChange, suppliers, leads, quotations, clientPOs, supplierPIs, invoices }) {
  const blField = <FormField label="Business Line" name="business_line" type="select" value={form.business_line} onChange={onChange} options={BL_OPTIONS} required />;
  const currField = <FormField label="Currency" name="currency" type="select" value={form.currency} onChange={onChange} options={CURRENCIES} />;

  switch (step) {
    case 'leads':
      return (<>
        <div className="grid grid-cols-2 gap-4">{blField}{currField}</div>
        <FormField label="Client Name" name="client_name" value={form.client_name} onChange={onChange} required />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" name="client_email" type="email" value={form.client_email} onChange={onChange} />
          <FormField label="Phone" name="client_phone" value={form.client_phone} onChange={onChange} />
        </div>
        <FormField label="Company" name="client_company" value={form.client_company} onChange={onChange} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Source" name="source" type="select" value={form.source} onChange={onChange} options={['direct','referral','website','exhibition','cold_call','other']} />
          <FormField label="Status" name="status" type="select" value={form.status} onChange={onChange} options={['new','contacted','qualified','converted','lost']} />
        </div>
        <FormField label="Estimated Value" name="estimated_value" type="number" value={form.estimated_value} onChange={onChange} />
        <FormField label="Product Interest" name="product_interest" type="textarea" value={form.product_interest} onChange={onChange} placeholder="What products does the client need?" />
        <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={onChange} />
      </>);

    case 'supplier_pi':
      return (<>
        <div className="grid grid-cols-2 gap-4">{blField}{currField}</div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="PI Number" name="pi_number" value={form.pi_number} onChange={onChange} required />
          <FormField label="Supplier" name="supplier" type="select" value={form.supplier} onChange={onChange} options={(suppliers || []).map(s => ({ value: s.id, label: s.name }))} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Issue Date" name="issue_date" type="date" value={form.issue_date} onChange={onChange} required />
          <FormField label="Expiry Date" name="expiry_date" type="date" value={form.expiry_date} onChange={onChange} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Subtotal" name="subtotal" type="number" value={form.subtotal} onChange={onChange} />
          <FormField label="Shipping Cost" name="shipping_cost" type="number" value={form.shipping_cost} onChange={onChange} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Insurance" name="insurance_cost" type="number" value={form.insurance_cost} onChange={onChange} />
          <FormField label="Customs" name="customs_cost" type="number" value={form.customs_cost} onChange={onChange} />
          <FormField label="Exchange Rate → IQD" name="exchange_rate_to_iqd" type="number" value={form.exchange_rate_to_iqd} onChange={onChange} />
        </div>
        <FormField label="Total" name="total" type="number" value={form.total} onChange={onChange} />
        <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={onChange} />
      </>);

    case 'quotations':
      return (<>
        <div className="grid grid-cols-2 gap-4">{blField}{currField}</div>
        <FormField label="Quotation Number" name="quotation_number" value={form.quotation_number} onChange={onChange} required />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Based on Lead" name="lead" type="select" value={form.lead} onChange={onChange} options={(leads || []).map(l => ({ value: l.id, label: `${l.client_name} (${l.client_company || 'N/A'})` }))} />
          <FormField label="Based on Supplier PI" name="supplier_pi" type="select" value={form.supplier_pi} onChange={onChange} options={(supplierPIs || []).map(p => ({ value: p.id, label: `${p.pi_number} - ${p.supplier_name}` }))} />
        </div>
        <FormField label="Client Name" name="client_name" value={form.client_name} onChange={onChange} required />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" name="client_email" type="email" value={form.client_email} onChange={onChange} />
          <FormField label="Phone" name="client_phone" value={form.client_phone} onChange={onChange} />
        </div>
        <FormField label="Company" name="client_company" value={form.client_company} onChange={onChange} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Status" name="status" type="select" value={form.status} onChange={onChange} options={['draft','sent','accepted','rejected','expired']} />
          <FormField label="Margin %" name="margin_percent" type="number" value={form.margin_percent} onChange={onChange} placeholder="e.g. 15" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Issue Date" name="issue_date" type="date" value={form.issue_date} onChange={onChange} required />
          <FormField label="Valid Until" name="valid_until" type="date" value={form.valid_until} onChange={onChange} required />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Subtotal" name="subtotal" type="number" value={form.subtotal} onChange={onChange} />
          <FormField label="Tax" name="tax_amount" type="number" value={form.tax_amount} onChange={onChange} />
          <FormField label="Discount" name="discount_amount" type="number" value={form.discount_amount} onChange={onChange} />
        </div>
        <FormField label="Total" name="total" type="number" value={form.total} onChange={onChange} />
        <FormField label="Terms & Conditions" name="terms" type="textarea" value={form.terms} onChange={onChange} />
        <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={onChange} />
      </>);

    case 'client_po':
      return (<>
        <div className="grid grid-cols-2 gap-4">{blField}{currField}</div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="PO Number" name="po_number" value={form.po_number} onChange={onChange} required />
          <FormField label="From Quotation" name="quotation" type="select" value={form.quotation} onChange={onChange} options={(quotations || []).filter(q => q.status === 'accepted').map(q => ({ value: q.id, label: `${q.quotation_number} - ${q.client_name}` }))} />
        </div>
        <FormField label="Client Name" name="client_name" value={form.client_name} onChange={onChange} required />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" name="client_email" type="email" value={form.client_email} onChange={onChange} />
          <FormField label="Company" name="client_company" value={form.client_company} onChange={onChange} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Status" name="status" type="select" value={form.status} onChange={onChange} options={['received','confirmed','in_fulfillment','partially_fulfilled','fulfilled','cancelled']} />
          <FormField label="Fulfillment Source" name="fulfillment_source" type="select" value={form.fulfillment_source} onChange={onChange} options={[{value:'from_stock',label:'From Stock'},{value:'from_supplier',label:'Order from Supplier'},{value:'mixed',label:'Mixed (Stock + Supplier)'}]} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Order Date" name="order_date" type="date" value={form.order_date} onChange={onChange} required />
          <FormField label="Expected Delivery" name="expected_delivery" type="date" value={form.expected_delivery} onChange={onChange} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Subtotal" name="subtotal" type="number" value={form.subtotal} onChange={onChange} />
          <FormField label="Tax" name="tax_amount" type="number" value={form.tax_amount} onChange={onChange} />
          <FormField label="Total" name="total" type="number" value={form.total} onChange={onChange} />
        </div>
        <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={onChange} />
      </>);

    case 'invoices':
      return (<>
        <div className="grid grid-cols-2 gap-4">{blField}{currField}</div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Invoice Number" name="invoice_number" value={form.invoice_number} onChange={onChange} required />
          <FormField label="Client PO" name="client_po" type="select" value={form.client_po} onChange={onChange} options={(clientPOs || []).map(p => ({ value: p.id, label: `${p.po_number} - ${p.client_name}` }))} />
        </div>
        <FormField label="Client Name" name="client_name" value={form.client_name} onChange={onChange} required />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" name="client_email" type="email" value={form.client_email} onChange={onChange} />
          <FormField label="Company" name="client_company" value={form.client_company} onChange={onChange} />
        </div>
        <FormField label="Address" name="client_address" type="textarea" value={form.client_address} onChange={onChange} rows={2} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Status" name="status" type="select" value={form.status} onChange={onChange} options={['draft','issued','partially_paid','paid','overdue','cancelled']} />
          <FormField label="Issue Date" name="issue_date" type="date" value={form.issue_date} onChange={onChange} required />
        </div>
        <FormField label="Due Date" name="due_date" type="date" value={form.due_date} onChange={onChange} required />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Subtotal" name="subtotal" type="number" value={form.subtotal} onChange={onChange} />
          <FormField label="Tax" name="tax_amount" type="number" value={form.tax_amount} onChange={onChange} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Discount" name="discount_amount" type="number" value={form.discount_amount} onChange={onChange} />
          <FormField label="Total" name="total" type="number" value={form.total} onChange={onChange} />
        </div>
        <FormField label="Terms" name="terms" type="textarea" value={form.terms} onChange={onChange} />
        <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={onChange} />
      </>);

    case 'deliveries':
      return (<>
        <div className="grid grid-cols-2 gap-4">{blField}
          <FormField label="Delivery Number" name="delivery_number" value={form.delivery_number} onChange={onChange} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Client PO" name="client_po" type="select" value={form.client_po} onChange={onChange} options={(clientPOs || []).map(p => ({ value: p.id, label: `${p.po_number} - ${p.client_name}` }))} required />
          <FormField label="Invoice" name="commercial_invoice" type="select" value={form.commercial_invoice} onChange={onChange} options={(invoices || []).map(i => ({ value: i.id, label: `${i.invoice_number} - ${i.client_name}` }))} />
        </div>
        <FormField label="Client Name" name="client_name" value={form.client_name} onChange={onChange} required />
        <FormField label="Delivery Address" name="delivery_address" type="textarea" value={form.delivery_address} onChange={onChange} rows={2} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Status" name="status" type="select" value={form.status} onChange={onChange} options={['pending','awaiting_stock','received_at_warehouse','dispatched','in_transit','delivered']} />
          <FormField label="Scheduled Date" name="scheduled_date" type="date" value={form.scheduled_date} onChange={onChange} />
        </div>
        <FormField label="Tracking Number" name="tracking_number" value={form.tracking_number} onChange={onChange} />
        <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={onChange} />
      </>);

    default:
      return null;
  }
}

/* ═══════════════════════════════════════ */
/* ─────────── MAIN COMPONENT ─────────── */
/* ═══════════════════════════════════════ */

export default function WorkflowPage() {
  const { t } = useTranslation();
  const [activeLine, setActiveLine] = useState('all');
  const [activeStep, setActiveStep] = useState('leads');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* Reference data */
  const [suppliers, setSuppliers] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [allQuotations, setAllQuotations] = useState([]);
  const [allClientPOs, setAllClientPOs] = useState([]);
  const [allSupplierPIs, setAllSupplierPIs] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);

  const fetchAll = () => {
    setLoading(true);
    const fetches = PIPELINE_STEPS.map(s =>
      api.get(s.endpoint).catch(() => ({ data: { results: [] } }))
    );
    fetches.push(
      api.get('/supply-chain/vendors/?page_size=500').catch(() => ({ data: { results: [] } }))
    );
    Promise.all(fetches).then((results) => {
      const newData = {};
      PIPELINE_STEPS.forEach((s, i) => {
        newData[s.key] = results[i].data.results || results[i].data || [];
      });
      setData(newData);
      setAllLeads(newData.leads || []);
      setAllSupplierPIs(newData.supplier_pi || []);
      setAllQuotations(newData.quotations || []);
      setAllClientPOs(newData.client_po || []);
      setAllInvoices(newData.invoices || []);
      setSuppliers(results[results.length - 1].data.results || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  /* ── Filter by business line ── */
  const filteredData = useMemo(() => {
    const items = data[activeStep] || [];
    if (activeLine === 'all') return items;
    return items.filter(item => item.business_line === activeLine);
  }, [data, activeStep, activeLine]);

  /* ── Counts per step (filtered by line) ── */
  const counts = useMemo(() => {
    const c = {};
    PIPELINE_STEPS.forEach(s => {
      const items = data[s.key] || [];
      c[s.key] = activeLine === 'all' ? items.length : items.filter(i => i.business_line === activeLine).length;
    });
    return c;
  }, [data, activeLine]);

  const fmt = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0);
  const columns = getColumns(activeStep, t, fmt);
  const stepConfig = PIPELINE_STEPS.find(s => s.key === activeStep);

  /* ── CRUD handlers ── */
  const openCreate = () => {
    setEditItem(null);
    const empty = { ...empties[activeStep] };
    if (activeLine !== 'all') empty.business_line = activeLine;
    setForm(empty);
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    const empty = empties[activeStep];
    const filled = {};
    Object.keys(empty).forEach(k => { filled[k] = item[k] ?? empty[k]; });
    setForm(filled);
    setError('');
    setShowModal(true);
  };

  const handleChange = (name, value) => setForm(f => ({ ...f, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const cleanForm = { ...form };
      // Remove empty FK fields
      ['lead', 'supplier_pi', 'quotation', 'client_po', 'commercial_invoice', 'supplier'].forEach(k => {
        if (cleanForm[k] === '' || cleanForm[k] === null) delete cleanForm[k];
      });
      if (editItem) {
        await api.put(`${stepConfig.endpoint}${editItem.id}/`, cleanForm);
      } else {
        await api.post(stepConfig.endpoint, cleanForm);
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      const d = err.response?.data;
      setError(d ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n') : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editItem || !confirm(t('common.are_you_sure'))) return;
    try {
      await api.delete(`${stepConfig.endpoint}${editItem.id}/`);
      setShowModal(false);
      fetchAll();
    } catch { setError(t('common.failed_delete')); }
  };

  /* ── Summary KPIs for active step ── */
  const stepKPIs = useMemo(() => {
    const items = filteredData;
    switch (activeStep) {
      case 'leads': {
        const newC = items.filter(i => i.status === 'new').length;
        const conv = items.filter(i => i.status === 'converted').length;
        const totalVal = items.reduce((s, i) => s + parseFloat(i.estimated_value || 0), 0);
        return [
          { label: 'Total Leads', value: items.length, icon: '📨' },
          { label: 'New', value: newC, icon: '🆕' },
          { label: 'Converted', value: conv, icon: '✅' },
          { label: 'Pipeline Value', value: `$${fmt(totalVal)}`, icon: '💰' },
        ];
      }
      case 'quotations': {
        const sent = items.filter(i => i.status === 'sent').length;
        const accepted = items.filter(i => i.status === 'accepted').length;
        const totalVal = items.reduce((s, i) => s + parseFloat(i.total || 0), 0);
        return [
          { label: 'Total Quotes', value: items.length, icon: '📄' },
          { label: 'Sent', value: sent, icon: '📤' },
          { label: 'Accepted', value: accepted, icon: '✅' },
          { label: 'Total Value', value: `$${fmt(totalVal)}`, icon: '💰' },
        ];
      }
      case 'client_po': {
        const fromStock = items.filter(i => i.fulfillment_source === 'from_stock').length;
        const fromSupplier = items.filter(i => i.fulfillment_source === 'from_supplier').length;
        const totalVal = items.reduce((s, i) => s + parseFloat(i.total || 0), 0);
        return [
          { label: 'Total POs', value: items.length, icon: '🛒' },
          { label: 'From Stock', value: fromStock, icon: '📦' },
          { label: 'From Supplier', value: fromSupplier, icon: '🌍' },
          { label: 'Total Value', value: `$${fmt(totalVal)}`, icon: '💰' },
        ];
      }
      case 'invoices': {
        const paid = items.filter(i => i.status === 'paid').length;
        const overdue = items.filter(i => i.status === 'overdue').length;
        const totalVal = items.reduce((s, i) => s + parseFloat(i.total || 0), 0);
        return [
          { label: 'Total Invoices', value: items.length, icon: '💰' },
          { label: 'Paid', value: paid, icon: '✅' },
          { label: 'Overdue', value: overdue, icon: '⚠️' },
          { label: 'Total Value', value: `$${fmt(totalVal)}`, icon: '📊' },
        ];
      }
      default:
        return [{ label: 'Total', value: items.length, icon: stepConfig?.icon || '📋' }];
    }
  }, [filteredData, activeStep]);

  return (
    <div className="space-y-5 fade-in">

      {/* ═══ Page Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('workflow.title') || 'Sales Pipeline'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('workflow.subtitle') || 'Lead → Quotation → PO → Invoice → Delivery'}
          </p>
        </div>
        <Button onClick={openCreate}>+ {stepConfig?.label || 'New'}</Button>
      </div>

      {/* ═══ Business Line Tabs ═══ */}
      <div className="flex overflow-x-auto gap-2 pb-1">
        {BUSINESS_LINES.map(bl => (
          <button
            key={bl.key}
            onClick={() => setActiveLine(bl.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border-2 transition-all ${
              activeLine === bl.key
                ? `${bl.color} bg-white dark:bg-gray-800 shadow-sm`
                : 'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span>{bl.icon}</span>
            <span>{bl.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ Pipeline Steps ═══ */}
      <PipelineStepper steps={PIPELINE_STEPS} active={activeStep} counts={counts} onStepClick={setActiveStep} />

      {/* ═══ Step KPIs ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stepKPIs.map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{kpi.icon}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ═══ Data Table ═══ */}
      <Card title={`${stepConfig?.icon} ${stepConfig?.label}`} actions={
        <span className="text-sm text-gray-500 dark:text-gray-400">{filteredData.length} records</span>
      }>
        <DataTable columns={columns} data={filteredData} loading={loading} onRowClick={openEdit} />
      </Card>

      {/* ═══ Create/Edit Modal ═══ */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? 'Edit' : 'New'} ${stepConfig?.label || ''}`} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg whitespace-pre-line">{error}</div>}

          <StepForm
            step={activeStep}
            form={form}
            onChange={handleChange}
            suppliers={suppliers}
            leads={allLeads}
            quotations={allQuotations}
            clientPOs={allClientPOs}
            supplierPIs={allSupplierPIs}
            invoices={allInvoices}
          />

          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>{editItem && <Button type="button" variant="danger" onClick={handleDelete}>{t('common.delete')}</Button>}</div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
              <Button type="submit" loading={saving}>{editItem ? t('common.update') : t('common.create')}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
