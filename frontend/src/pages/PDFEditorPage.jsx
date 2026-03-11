import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import FormField from '../components/common/FormField';
import Modal from '../components/common/Modal';
import api from '../api/client';

/* ─── Constants ─── */
const DOC_TYPES = [
  { key: 'offer',       label: 'Client Offer / Quotation', labelAr: 'عرض سعر',       icon: '📄', color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' },
  { key: 'supplier_pi', label: 'Supplier Proforma Invoice', labelAr: 'فاتورة أولية',  icon: '📋', color: 'border-green-400 bg-green-50 dark:bg-green-900/20' },
  { key: 'supplier_po', label: 'Supplier Purchase Order',   labelAr: 'أمر شراء',       icon: '🛒', color: 'border-red-400 bg-red-50 dark:bg-red-900/20' },
  { key: 'invoice',     label: 'Commercial Invoice',        labelAr: 'فاتورة تجارية',  icon: '💰', color: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'IQD', label: 'IQD (ع.د)' },
];

const BL_OPTIONS = [
  { value: 'led', label: 'LED Lights' },
  { value: 'heater', label: 'Heater & Thermocouple' },
  { value: 'solar', label: 'Solar AC' },
  { value: 'trade', label: 'Trade' },
];

const EMPTY_LINE = { description: '', sku: '', quantity: 1, unit_price: 0, tax_rate: 0, total: 0 };

/* ─── Helpers ─── */
const fmtCurrency = (amount, currency = 'USD') => {
  const n = parseFloat(amount) || 0;
  const symbols = { USD: '$', EUR: '€', CNY: '¥', IQD: 'IQD ' };
  const sym = symbols[currency] || currency + ' ';
  if (currency === 'IQD') return `IQD ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/* ═══════════════════════════════════════════ */
/* ─── LINE ITEMS EDITOR ─── */
/* ═══════════════════════════════════════════ */
function LineItemsEditor({ items, onChange, currency, showTax, showSku }) {
  const updateLine = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-calculate total
    const qty = parseFloat(updated[index].quantity) || 0;
    const price = parseFloat(updated[index].unit_price) || 0;
    const tax = parseFloat(updated[index].tax_rate) || 0;
    const subtotal = qty * price;
    updated[index].total = subtotal + (subtotal * tax / 100);
    onChange(updated);
  };

  const addLine = () => onChange([...items, { ...EMPTY_LINE }]);

  const removeLine = (index) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const duplicateLine = (index) => {
    const newItems = [...items];
    newItems.splice(index + 1, 0, { ...items[index] });
    onChange(newItems);
  };

  const moveLine = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="grid gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1"
           style={{ gridTemplateColumns: showSku
             ? (showTax ? '2rem 1fr 7rem 5rem 5rem 4.5rem 5.5rem 5rem' : '2rem 1fr 7rem 5rem 5rem 5.5rem 5rem')
             : (showTax ? '2rem 1fr 5rem 5rem 4.5rem 5.5rem 5rem' : '2rem 1fr 5rem 5rem 5.5rem 5rem')
           }}>
        <span>#</span>
        <span>Description</span>
        {showSku && <span>SKU</span>}
        <span className="text-center">Qty</span>
        <span className="text-right">Unit Price</span>
        {showTax && <span className="text-center">Tax %</span>}
        <span className="text-right">Total</span>
        <span className="text-center">Actions</span>
      </div>

      {/* Line items */}
      {items.map((item, idx) => (
        <div key={idx}
             className="grid gap-2 items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-2 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
             style={{ gridTemplateColumns: showSku
               ? (showTax ? '2rem 1fr 7rem 5rem 5rem 4.5rem 5.5rem 5rem' : '2rem 1fr 7rem 5rem 5rem 5.5rem 5rem')
               : (showTax ? '2rem 1fr 5rem 5rem 4.5rem 5.5rem 5rem' : '2rem 1fr 5rem 5rem 5.5rem 5rem')
             }}>

          {/* Row number + reorder */}
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => moveLine(idx, -1)} className="text-gray-400 hover:text-gray-600 text-xs leading-none" title="Move up">▲</button>
              <button type="button" onClick={() => moveLine(idx, 1)} className="text-gray-400 hover:text-gray-600 text-xs leading-none" title="Move down">▼</button>
            </div>
          </div>

          {/* Description */}
          <input
            type="text" value={item.description}
            onChange={e => updateLine(idx, 'description', e.target.value)}
            className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            placeholder="Item description..."
          />

          {/* SKU */}
          {showSku && (
            <input
              type="text" value={item.sku || ''}
              onChange={e => updateLine(idx, 'sku', e.target.value)}
              className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              placeholder="SKU"
            />
          )}

          {/* Quantity */}
          <input
            type="number" value={item.quantity} min="0" step="any"
            onChange={e => updateLine(idx, 'quantity', e.target.value)}
            className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white text-center focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />

          {/* Unit Price */}
          <input
            type="number" value={item.unit_price} min="0" step="any"
            onChange={e => updateLine(idx, 'unit_price', e.target.value)}
            className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white text-right focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />

          {/* Tax */}
          {showTax && (
            <input
              type="number" value={item.tax_rate || 0} min="0" step="any"
              onChange={e => updateLine(idx, 'tax_rate', e.target.value)}
              className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white text-center focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          )}

          {/* Total (read-only calculated) */}
          <div className="text-right text-sm font-semibold text-gray-900 dark:text-white px-1">
            {fmtCurrency(item.total, currency)}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-1">
            <button type="button" onClick={() => duplicateLine(idx)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors" title="Duplicate">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </button>
            <button type="button" onClick={() => removeLine(idx)}
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors" title="Remove"
              disabled={items.length <= 1}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      ))}

      {/* Add Line button */}
      <button type="button" onClick={addLine}
        className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
        + Add Line Item
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/* ─── LIVE PREVIEW PANEL ─── */
/* ═══════════════════════════════════════════ */
function LivePreview({ docType, data, items, currency }) {
  const doc = DOC_TYPES.find(d => d.key === docType);
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const shipping = parseFloat(data.shipping_cost) || 0;
  const insurance = parseFloat(data.insurance_cost) || 0;
  const customs = parseFloat(data.customs_cost) || 0;
  const tax = parseFloat(data.tax_amount) || 0;
  const discount = parseFloat(data.discount_amount) || 0;
  const extras = shipping + insurance + customs;
  const grandTotal = subtotal + extras + tax - discount;

  const colorMap = {
    offer: { header: '#2b6cb0', accent: '#3182ce' },
    supplier_pi: { header: '#2f855a', accent: '#38a169' },
    supplier_po: { header: '#9b2c2c', accent: '#c53030' },
    invoice: { header: '#744210', accent: '#d69e2e' },
  };
  const colors = colorMap[docType] || colorMap.offer;

  const partyLabel = docType === 'offer' || docType === 'invoice' ? 'Client' : 'Supplier';
  const partyName = data.client_name || data.supplier_name || '—';
  const partyCompany = data.client_company || data.supplier_company || '';
  const partyEmail = data.client_email || data.supplier_email || '';

  return (
    <div className="bg-white dark:bg-gray-850 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden text-xs" style={{ minHeight: '600px' }}>
      {/* Header band */}
      <div className="px-5 py-4 text-white" style={{ background: colors.header }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">G</div>
              <div>
                <p className="font-bold text-sm">Gamma International</p>
                <p className="text-white/70 text-[10px]">غاما الدولية</p>
              </div>
            </div>
            <p className="text-white/60 text-[9px] mt-1">Baghdad, Iraq | +964 770 123 4567</p>
          </div>
          <div className="text-right">
            <div className="px-3 py-1 rounded-md text-[10px] font-bold" style={{ background: colors.accent }}>
              {doc?.label || docType}
            </div>
            <p className="text-white/70 text-[10px] mt-1">#{data.doc_number || '—'}</p>
            <p className="text-white/60 text-[9px]">{data.date || data.issue_date || '—'}</p>
          </div>
        </div>
      </div>

      {/* Accent stripe */}
      <div className="h-0.5" style={{ background: colors.accent }} />

      <div className="p-4 space-y-3">
        {/* Party info */}
        <div className="flex justify-between">
          <div>
            <p className="text-[9px] text-gray-400 uppercase font-semibold">From</p>
            <p className="font-semibold text-gray-900 dark:text-white">Gamma International</p>
            <p className="text-gray-500">info@gammaintl.com</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-400 uppercase font-semibold">{partyLabel}</p>
            <p className="font-semibold text-gray-900 dark:text-white">{partyName}</p>
            {partyCompany && <p className="text-gray-500">{partyCompany}</p>}
            {partyEmail && <p className="text-gray-500">{partyEmail}</p>}
          </div>
        </div>

        {/* Mini items table */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-1 px-2 py-1.5 text-white text-[9px] font-semibold" style={{ background: colors.header }}>
            <span className="col-span-1">#</span>
            <span className="col-span-5">Description</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-2 text-right">Price</span>
            <span className="col-span-2 text-right">Total</span>
          </div>
          {items.slice(0, 8).map((item, i) => (
            <div key={i} className={`grid grid-cols-12 gap-1 px-2 py-1 ${i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : ''}`}>
              <span className="col-span-1 text-gray-400">{i + 1}</span>
              <span className="col-span-5 text-gray-900 dark:text-white truncate">{item.description || '—'}</span>
              <span className="col-span-2 text-center text-gray-700 dark:text-gray-300">{item.quantity}</span>
              <span className="col-span-2 text-right text-gray-700 dark:text-gray-300">{fmtCurrency(item.unit_price, currency)}</span>
              <span className="col-span-2 text-right font-medium text-gray-900 dark:text-white">{fmtCurrency(item.total, currency)}</span>
            </div>
          ))}
          {items.length > 8 && (
            <div className="px-2 py-1 text-gray-400 text-center text-[9px]">
              ... and {items.length - 8} more items
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-48 space-y-0.5">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span><span>{fmtCurrency(subtotal, currency)}</span>
            </div>
            {shipping > 0 && <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{fmtCurrency(shipping, currency)}</span></div>}
            {insurance > 0 && <div className="flex justify-between text-gray-500"><span>Insurance</span><span>{fmtCurrency(insurance, currency)}</span></div>}
            {customs > 0 && <div className="flex justify-between text-gray-500"><span>Customs</span><span>{fmtCurrency(customs, currency)}</span></div>}
            {tax > 0 && <div className="flex justify-between text-gray-500"><span>Tax</span><span>{fmtCurrency(tax, currency)}</span></div>}
            {discount > 0 && <div className="flex justify-between text-gray-500"><span>Discount</span><span>-{fmtCurrency(discount, currency)}</span></div>}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300 dark:border-gray-600">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span style={{ color: colors.header }}>{fmtCurrency(grandTotal, currency)}</span>
            </div>
            {data.amount_paid > 0 && <>
              <div className="flex justify-between text-green-600"><span>Paid</span><span>{fmtCurrency(data.amount_paid, currency)}</span></div>
              <div className="flex justify-between font-bold text-red-600"><span>Balance</span><span>{fmtCurrency(data.balance_due, currency)}</span></div>
            </>}
          </div>
        </div>

        {/* Notes preview */}
        {(data.terms || data.notes) && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
            {data.terms && <p className="text-gray-500 text-[9px] truncate"><b>Terms:</b> {data.terms}</p>}
            {data.notes && <p className="text-gray-400 text-[9px] truncate mt-0.5"><b>Notes:</b> {data.notes}</p>}
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ─── MAIN PDF EDITOR PAGE ─── */
/* ═══════════════════════════════════════════ */
export default function PDFEditorPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  // State
  const [docType, setDocType] = useState(searchParams.get('type') || 'offer');
  const [generating, setGenerating] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [availableRecords, setAvailableRecords] = useState([]);

  // Document data
  const [data, setData] = useState({
    doc_number: '', date: '', valid_until: '', due_date: '', expected_date: '',
    business_line: 'led', currency: 'USD', reference: '',
    // Client fields
    client_name: '', client_company: '', client_email: '', client_phone: '', client_address: '',
    // Supplier fields
    supplier_name: '', supplier_company: '', supplier_email: '', supplier_phone: '', supplier_address: '',
    // Financial
    tax_amount: 0, discount_amount: 0, shipping_cost: 0, insurance_cost: 0, customs_cost: 0,
    exchange_rate_to_iqd: 1, amount_paid: 0, balance_due: 0,
    // Text
    terms: '', notes: '',
    // Bank (invoice)
    bank_name: '', bank_account: '', bank_iban: '', bank_swift: '',
  });

  const [items, setItems] = useState([{ ...EMPTY_LINE }]);

  // Pre-fill from URL params
  useEffect(() => {
    const recordId = searchParams.get('id');
    const type = searchParams.get('type');
    if (type) setDocType(type);
    if (recordId && type) loadRecord(type, recordId);
  }, []);

  const updateData = (name, value) => setData(prev => ({ ...prev, [name]: value }));

  // Auto-calculate totals when items change
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const calculatedTotal = subtotal
    + (parseFloat(data.shipping_cost) || 0)
    + (parseFloat(data.insurance_cost) || 0)
    + (parseFloat(data.customs_cost) || 0)
    + (parseFloat(data.tax_amount) || 0)
    - (parseFloat(data.discount_amount) || 0);

  /* ─── Load from existing record ─── */
  const endpointMap = {
    offer: '/workflow/quotations/',
    supplier_pi: '/workflow/supplier-pis/',
    supplier_po: '/workflow/client-pos/',
    invoice: '/workflow/invoices/',
  };

  const fetchRecords = async (type) => {
    try {
      const ep = endpointMap[type];
      const res = await api.get(ep);
      setAvailableRecords(res.data.results || res.data || []);
    } catch { setAvailableRecords([]); }
  };

  const loadRecord = async (type, id) => {
    setLoadingRecord(true);
    try {
      const ep = endpointMap[type];
      const res = await api.get(`${ep}${id}/`);
      const rec = res.data;
      // Map fields based on doc type
      setData(prev => ({
        ...prev,
        doc_number: rec.quotation_number || rec.pi_number || rec.po_number || rec.invoice_number || '',
        date: rec.issue_date || rec.order_date || '',
        valid_until: rec.valid_until || rec.expiry_date || '',
        due_date: rec.due_date || '',
        expected_date: rec.expected_delivery || rec.expected_date || '',
        business_line: rec.business_line || 'led',
        currency: rec.currency || 'USD',
        client_name: rec.client_name || '',
        client_company: rec.client_company || '',
        client_email: rec.client_email || '',
        client_phone: rec.client_phone || '',
        client_address: rec.client_address || '',
        supplier_name: rec.supplier_name || '',
        supplier_email: rec.supplier_email || '',
        supplier_phone: rec.supplier_phone || '',
        supplier_address: rec.supplier_address || '',
        tax_amount: rec.tax_amount || 0,
        discount_amount: rec.discount_amount || 0,
        shipping_cost: rec.shipping_cost || 0,
        insurance_cost: rec.insurance_cost || 0,
        customs_cost: rec.customs_cost || 0,
        exchange_rate_to_iqd: rec.exchange_rate_to_iqd || 1,
        amount_paid: rec.amount_paid || 0,
        balance_due: rec.balance_due || 0,
        terms: rec.terms || '',
        notes: rec.notes || '',
      }));
      if (rec.lines && rec.lines.length > 0) {
        setItems(rec.lines.map(l => ({
          description: l.description || '',
          sku: l.product_sku || l.sku || '',
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.selling_unit_price || l.unit_price) || 0,
          tax_rate: parseFloat(l.tax_rate) || 0,
          total: parseFloat(l.total) || 0,
        })));
      }
    } catch (err) {
      console.error('Failed to load record:', err);
    } finally {
      setLoadingRecord(false);
      setShowLoadModal(false);
    }
  };

  /* ─── Generate PDF ─── */
  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const payload = {
        ...data,
        subtotal,
        total: calculatedTotal,
        items: items.map(i => ({
          description: i.description,
          sku: i.sku || '',
          quantity: parseFloat(i.quantity) || 0,
          unit_price: parseFloat(i.unit_price) || 0,
          tax_rate: parseFloat(i.tax_rate) || 0,
          total: parseFloat(i.total) || 0,
        })),
        bank_details: data.bank_name ? {
          'Bank Name': data.bank_name,
          'Account Number': data.bank_account,
          'IBAN': data.bank_iban,
          'SWIFT': data.bank_swift,
        } : undefined,
      };

      const response = await api.post(`/workflow/generate-pdf/${docType}/`, payload, {
        responseType: 'blob',
      });

      // Download the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.doc_number || docType}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      // Fallback: try opening in new tab
      alert('PDF generation failed. Make sure the backend endpoint is running.');
    } finally {
      setGenerating(false);
    }
  };

  /* ─── Print preview via browser ─── */
  const handlePrint = () => {
    window.print();
  };

  // Derived settings per doc type
  const showTax = docType === 'invoice';
  const showSku = docType === 'supplier_pi' || docType === 'supplier_po';
  const showShipping = docType === 'supplier_pi';
  const showBankDetails = docType === 'invoice';
  const isClientDoc = docType === 'offer' || docType === 'invoice';

  return (
    <div className="space-y-5 fade-in">

      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('pdf_editor.title') || 'Document Editor'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Edit and preview before generating PDF
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { fetchRecords(docType); setShowLoadModal(true); }}>
            📂 Load Record
          </Button>
          <Button variant="secondary" onClick={handlePrint}>
            🖨️ Print Preview
          </Button>
          <Button onClick={handleGeneratePDF} loading={generating}>
            📥 Generate PDF
          </Button>
        </div>
      </div>

      {/* ═══ Document Type Selector ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DOC_TYPES.map(dt => (
          <button
            key={dt.key}
            onClick={() => setDocType(dt.key)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
              docType === dt.key
                ? `${dt.color} shadow-sm`
                : 'border-transparent bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-2xl">{dt.icon}</span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold truncate ${docType === dt.key ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                {dt.label}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{dt.labelAr}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ═══ Main Editor + Preview Split ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── LEFT: Editor (3 cols) ── */}
        <div className="xl:col-span-3 space-y-5">

          {/* Document Info */}
          <Card title="📝 Document Info">
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <FormField label="Document Number" name="doc_number" value={data.doc_number} onChange={updateData} required placeholder="e.g. QUO-2026-0001" />
                <FormField label="Date" name="date" type="date" value={data.date} onChange={updateData} required />
                {docType === 'offer' && <FormField label="Valid Until" name="valid_until" type="date" value={data.valid_until} onChange={updateData} />}
                {docType === 'invoice' && <FormField label="Due Date" name="due_date" type="date" value={data.due_date} onChange={updateData} />}
                {docType === 'supplier_po' && <FormField label="Expected Delivery" name="expected_date" type="date" value={data.expected_date} onChange={updateData} />}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Business Line" name="business_line" type="select" value={data.business_line} onChange={updateData} options={BL_OPTIONS} />
                <FormField label="Currency" name="currency" type="select" value={data.currency} onChange={updateData} options={CURRENCIES} />
                <FormField label="Reference" name="reference" value={data.reference} onChange={updateData} placeholder="PO ref, project name..." />
              </div>
            </div>
          </Card>

          {/* Party Info */}
          <Card title={isClientDoc ? '👤 Client Information' : '🏭 Supplier Information'}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label={isClientDoc ? 'Client Name' : 'Supplier Name'}
                  name={isClientDoc ? 'client_name' : 'supplier_name'}
                  value={isClientDoc ? data.client_name : data.supplier_name}
                  onChange={updateData} required />
                <FormField label="Company"
                  name={isClientDoc ? 'client_company' : 'supplier_company'}
                  value={isClientDoc ? data.client_company : (data.supplier_company || '')}
                  onChange={updateData} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Email" type="email"
                  name={isClientDoc ? 'client_email' : 'supplier_email'}
                  value={isClientDoc ? data.client_email : data.supplier_email}
                  onChange={updateData} />
                <FormField label="Phone"
                  name={isClientDoc ? 'client_phone' : 'supplier_phone'}
                  value={isClientDoc ? data.client_phone : data.supplier_phone}
                  onChange={updateData} />
              </div>
              <FormField label="Address" type="textarea" rows={2}
                name={isClientDoc ? 'client_address' : 'supplier_address'}
                value={isClientDoc ? data.client_address : data.supplier_address}
                onChange={updateData} />
            </div>
          </Card>

          {/* Line Items */}
          <Card title="📦 Line Items">
            <LineItemsEditor
              items={items}
              onChange={setItems}
              currency={data.currency}
              showTax={showTax}
              showSku={showSku}
            />
          </Card>

          {/* Financial Summary */}
          <Card title="💰 Financial Summary">
            <div className="space-y-4">
              {/* Auto-calculated subtotal */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-300">Subtotal (calculated from items)</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{fmtCurrency(subtotal, data.currency)}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {showShipping && <>
                  <FormField label="Shipping Cost" name="shipping_cost" type="number" value={data.shipping_cost} onChange={updateData} />
                  <FormField label="Insurance Cost" name="insurance_cost" type="number" value={data.insurance_cost} onChange={updateData} />
                  <FormField label="Customs Cost" name="customs_cost" type="number" value={data.customs_cost} onChange={updateData} />
                </>}
                <FormField label="Tax Amount" name="tax_amount" type="number" value={data.tax_amount} onChange={updateData} />
                <FormField label="Discount Amount" name="discount_amount" type="number" value={data.discount_amount} onChange={updateData} />
                {showShipping && <FormField label="Exchange Rate → IQD" name="exchange_rate_to_iqd" type="number" value={data.exchange_rate_to_iqd} onChange={updateData} />}
              </div>

              {docType === 'invoice' && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Amount Paid" name="amount_paid" type="number" value={data.amount_paid} onChange={updateData} />
                  <FormField label="Balance Due" name="balance_due" type="number" value={data.balance_due} onChange={updateData} />
                </div>
              )}

              {/* Grand total */}
              <div className="flex items-center justify-between p-4 bg-primary-600 rounded-lg text-white">
                <span className="text-sm font-medium">Grand Total</span>
                <span className="text-2xl font-bold">{fmtCurrency(calculatedTotal, data.currency)}</span>
              </div>

              {showShipping && data.exchange_rate_to_iqd > 1 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <span className="text-sm text-amber-700 dark:text-amber-300">Total in IQD (Rate: {data.exchange_rate_to_iqd})</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{fmtCurrency(calculatedTotal * data.exchange_rate_to_iqd, 'IQD')}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Terms, Notes, Bank */}
          <Card title="📋 Terms & Notes">
            <div className="space-y-4">
              <FormField label="Terms & Conditions" name="terms" type="textarea" value={data.terms} onChange={updateData} rows={3} placeholder="Payment terms, warranty, delivery conditions..." />
              <FormField label="Notes" name="notes" type="textarea" value={data.notes} onChange={updateData} rows={2} placeholder="Additional notes..." />
              {showBankDetails && <>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 pt-2">Bank Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Bank Name" name="bank_name" value={data.bank_name} onChange={updateData} />
                  <FormField label="Account Number" name="bank_account" value={data.bank_account} onChange={updateData} />
                  <FormField label="IBAN" name="bank_iban" value={data.bank_iban} onChange={updateData} />
                  <FormField label="SWIFT Code" name="bank_swift" value={data.bank_swift} onChange={updateData} />
                </div>
              </>}
            </div>
          </Card>
        </div>

        {/* ── RIGHT: Live Preview (2 cols) ── */}
        <div className="xl:col-span-2">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Live Preview</h3>
              <span className="text-xs text-gray-400">Updates as you type</span>
            </div>
            <LivePreview
              docType={docType}
              data={data}
              items={items}
              currency={data.currency}
            />

            {/* Action buttons under preview */}
            <div className="mt-4 space-y-2">
              <Button onClick={handleGeneratePDF} loading={generating} className="w-full">
                📥 Generate & Download PDF
              </Button>
              <Button variant="outline" onClick={handlePrint} className="w-full">
                🖨️ Print Preview
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Load Record Modal ═══ */}
      <Modal isOpen={showLoadModal} onClose={() => setShowLoadModal(false)} title="Load from Existing Record" size="lg">
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a record to pre-fill the editor. You can then adjust anything before generating the PDF.
          </p>
          {availableRecords.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No records found for this document type.</p>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {availableRecords.map(rec => {
                const num = rec.quotation_number || rec.pi_number || rec.po_number || rec.invoice_number || rec.id;
                const name = rec.client_name || rec.supplier_name || '—';
                const total = rec.total || 0;
                const status = rec.status || '';
                return (
                  <button key={rec.id}
                    onClick={() => loadRecord(docType, rec.id)}
                    className="w-full flex items-center justify-between px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">#{num}</p>
                      <p className="text-xs text-gray-500">{name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtCurrency(total, rec.currency)}</p>
                      <p className="text-xs text-gray-400 capitalize">{status?.replace(/_/g, ' ')}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
