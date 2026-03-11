import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import FormField from '../components/common/FormField';
import Modal from '../components/common/Modal';
import api from '../api/client';

/* ─── Constants ─── */
const BRANCHES = [
  {
    key: 'obour',
    label: 'Gamma International — Obour City',
    name_en: 'Gamma International',
    name_ar: 'جاما انترناشيونال',
    address_en: 'Obour City, Cairo, Egypt',
    address_ar: 'مدينة العبور، القاهرة، مصر',
  },
  {
    key: 'nasr',
    label: 'Gamma International — Nasr City',
    name_en: 'Gamma International',
    name_ar: 'جاما انترناشيونال',
    address_en: 'Nasr City, Cairo, Egypt',
    address_ar: 'مدينة نصر، القاهرة، مصر',
  },
  {
    key: 'engineering',
    label: 'Gamma for Engineering and Trade',
    name_en: 'Gamma for Engineering and Trade',
    name_ar: 'جاما للهندسة والتجارة',
    address_en: 'Cairo, Egypt',
    address_ar: 'القاهرة، مصر',
  },
];

const IEC_NOTE = 'الكشافات واللمبات المورده منا تخضع للمواصفات القياسية العالمية 62612-2013 IEC';

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

const EMPTY_LINE = {
  description: '',
  item_code: '',
  sku: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
  total: 0,
  image_b64: null,
};

/* ─── Helpers ─── */
const fmtCurrency = (amount, currency = 'USD') => {
  const n = parseFloat(amount) || 0;
  const symbols = { USD: '$', EUR: '€', CNY: '¥', IQD: 'IQD ' };
  const sym = symbols[currency] || currency + ' ';
  if (currency === 'IQD') return `IQD ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/* ═══════════════════════════════════════════ */
/* ─── LINE ITEMS EDITOR ─── */
/* ═══════════════════════════════════════════ */
function LineItemsEditor({ items, onChange, currency, showTax }) {
  const fileInputRefs = useRef({});

  const updateLine = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    const qty = parseFloat(updated[index].quantity) || 0;
    const price = parseFloat(updated[index].unit_price) || 0;
    const tax = parseFloat(updated[index].tax_rate) || 0;
    const lineSubtotal = qty * price;
    updated[index].total = lineSubtotal + (lineSubtotal * tax / 100);
    onChange(updated);
  };

  const addLine = () => onChange([...items, { ...EMPTY_LINE }]);

  const removeLine = (index) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const duplicateLine = (index) => {
    const newItems = [...items];
    newItems.splice(index + 1, 0, { ...items[index], image_b64: items[index].image_b64 });
    onChange(newItems);
  };

  const moveLine = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onChange(newItems);
  };

  const handleImageUpload = async (index, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    try {
      const b64 = await fileToBase64(file);
      const updated = [...items];
      updated[index] = { ...updated[index], image_b64: b64 };
      onChange(updated);
    } catch {
      toast.error('Failed to read image file.');
    }
  };

  const removeImage = (index) => {
    const updated = [...items];
    updated[index] = { ...updated[index], image_b64: null };
    onChange(updated);
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = '';
    }
  };

  const handleLoadFromInventory = () => {
    toast('Inventory integration coming soon', { icon: 'ℹ️' });
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        <Button variant="outline" size="sm" onClick={handleLoadFromInventory}>
          📦 Load from Inventory
        </Button>
      </div>

      {/* Header row */}
      <div className="hidden sm:grid gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2"
           style={{ gridTemplateColumns: showTax
             ? '2rem 5rem 1fr 2.5rem 5rem 5rem 4rem 5.5rem 5rem'
             : '2rem 5rem 1fr 2.5rem 5rem 5rem 5.5rem 5rem'
           }}>
        <span>#</span>
        <span>Code</span>
        <span>Description</span>
        <span className="text-center">Img</span>
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
             style={{ gridTemplateColumns: showTax
               ? '2rem 5rem 1fr 2.5rem 5rem 5rem 4rem 5.5rem 5rem'
               : '2rem 5rem 1fr 2.5rem 5rem 5rem 5.5rem 5rem'
             }}>

          {/* Row number + reorder */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
            <div className="flex flex-col gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => moveLine(idx, -1)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs leading-none p-0.5"
                title="Move up"
              >▲</button>
              <button
                type="button"
                onClick={() => moveLine(idx, 1)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs leading-none p-0.5"
                title="Move down"
              >▼</button>
            </div>
          </div>

          {/* Item Code */}
          <input
            type="text"
            value={item.item_code || ''}
            onChange={e => updateLine(idx, 'item_code', e.target.value)}
            className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            placeholder="e.g. LED-001"
          />

          {/* Description */}
          <input
            type="text"
            value={item.description}
            onChange={e => updateLine(idx, 'description', e.target.value)}
            className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            placeholder="Item description..."
          />

          {/* Image */}
          <div className="flex items-center justify-center">
            {item.image_b64 ? (
              <div className="relative inline-block">
                <img
                  src={item.image_b64}
                  alt="Item"
                  className="w-10 h-10 object-cover rounded border border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center hover:bg-red-600 leading-none"
                  title="Remove image"
                >x</button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[idx] && fileInputRefs.current[idx].click()}
                  className="w-10 h-10 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors text-base"
                  title="Upload image"
                >+</button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={el => fileInputRefs.current[idx] = el}
                  onChange={e => handleImageUpload(idx, e.target.files[0])}
                />
              </>
            )}
          </div>

          {/* Quantity */}
          <input
            type="number"
            value={item.quantity}
            min="0"
            step="any"
            onChange={e => updateLine(idx, 'quantity', e.target.value)}
            className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white text-center focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />

          {/* Unit Price */}
          <input
            type="number"
            value={item.unit_price}
            min="0"
            step="any"
            onChange={e => updateLine(idx, 'unit_price', e.target.value)}
            className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white text-right focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />

          {/* Tax */}
          {showTax && (
            <input
              type="number"
              value={item.tax_rate || 0}
              min="0"
              step="any"
              onChange={e => updateLine(idx, 'tax_rate', e.target.value)}
              className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white text-center focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          )}

          {/* Total (read-only) */}
          <div className="text-right text-sm font-semibold text-gray-900 dark:text-white px-1">
            {fmtCurrency(item.total, currency)}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => duplicateLine(idx)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"
              title="Duplicate"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => removeLine(idx)}
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
              title="Remove"
              disabled={items.length <= 1}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      {/* Add Line button */}
      <button
        type="button"
        onClick={addLine}
        className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        + Add Line Item
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/* ─── LIVE PREVIEW PANEL ─── */
/* ═══════════════════════════════════════════ */
function LivePreview({ docType, data, items, currency, branch, senderInfo }) {
  const doc = DOC_TYPES.find(d => d.key === docType);
  const branchData = BRANCHES.find(b => b.key === branch) || BRANCHES[0];

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const shipping = parseFloat(data.shipping_cost) || 0;
  const insurance = parseFloat(data.insurance_cost) || 0;
  const customs = parseFloat(data.customs_cost) || 0;
  const tax = parseFloat(data.tax_amount) || 0;
  const discount = parseFloat(data.discount_amount) || 0;
  const grandTotal = subtotal + shipping + insurance + customs + tax - discount;

  const colorMap = {
    offer:       { header: '#2b6cb0', accent: '#3182ce' },
    supplier_pi: { header: '#2f855a', accent: '#38a169' },
    supplier_po: { header: '#9b2c2c', accent: '#c53030' },
    invoice:     { header: '#744210', accent: '#d69e2e' },
  };
  const colors = colorMap[docType] || colorMap.offer;

  const isClientDoc = docType === 'offer' || docType === 'invoice';
  const partyLabel = isClientDoc ? 'Client' : 'Supplier';
  const partyName = isClientDoc ? (data.client_name || '—') : (data.supplier_name || '—');
  const partyCompany = isClientDoc ? data.client_company : data.supplier_company;
  const partyEmail = isClientDoc ? data.client_email : data.supplier_email;

  const docRef = docType === 'offer'
    ? (data.offer_reference || '—')
    : (data.doc_number || '—');

  const hasOfferConditions =
    docType === 'offer' &&
    (data.payment_terms || data.warranty_duration || data.delivery_location || data.delivery_time);

  const hasSender = senderInfo && (senderInfo.name || senderInfo.phone || senderInfo.email);

  return (
    <div
      className="bg-white dark:bg-gray-850 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden text-xs"
      style={{ minHeight: '600px' }}
    >
      {/* Header band */}
      <div className="px-5 py-4 text-white" style={{ background: colors.header }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">G</div>
              <div>
                <p className="font-bold text-sm">{branchData.name_en}</p>
                <p className="text-yellow-300 text-[10px]">{branchData.name_ar}</p>
              </div>
            </div>
            <p className="text-white/60 text-[9px] mt-1">{branchData.address_en}</p>
          </div>
          <div className="text-right">
            <div className="px-3 py-1 rounded-md text-[10px] font-bold" style={{ background: colors.accent }}>
              {doc?.label || docType}
            </div>
            <p className="text-white/70 text-[10px] mt-1">#{docRef}</p>
            <p className="text-white/60 text-[9px]">{data.date || '—'}</p>
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
            <p className="font-semibold text-gray-900 dark:text-white">{branchData.name_en}</p>
            <p className="text-gray-500 text-[10px]">{branchData.address_en}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-400 uppercase font-semibold">{partyLabel}</p>
            <p className="font-semibold text-gray-900 dark:text-white">{partyName}</p>
            {partyCompany && <p className="text-gray-500 text-[10px]">{partyCompany}</p>}
            {partyEmail && <p className="text-gray-500 text-[10px]">{partyEmail}</p>}
          </div>
        </div>

        {/* Mini items table */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div
            className="grid grid-cols-12 gap-1 px-2 py-1.5 text-white text-[9px] font-semibold"
            style={{ background: colors.header }}
          >
            <span className="col-span-1">#</span>
            <span className="col-span-5">Description</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-2 text-right">Price</span>
            <span className="col-span-2 text-right">Total</span>
          </div>
          {items.slice(0, 8).map((item, i) => (
            <div
              key={i}
              className={`grid grid-cols-12 gap-1 px-2 py-1 ${i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
            >
              <span className="col-span-1 text-gray-400">{i + 1}</span>
              <span className="col-span-5 text-gray-900 dark:text-white truncate">{item.description || '—'}</span>
              <span className="col-span-2 text-center text-gray-700 dark:text-gray-300">{item.quantity}</span>
              <span className="col-span-2 text-right text-gray-700 dark:text-gray-300">{fmtCurrency(item.unit_price, currency)}</span>
              <span className="col-span-2 text-right font-medium text-gray-900 dark:text-white">{fmtCurrency(item.total, currency)}</span>
            </div>
          ))}
          {items.length > 8 && (
            <div className="px-2 py-1 text-gray-400 text-center text-[9px]">
              ... and {items.length - 8} more item{items.length - 8 !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-48 space-y-0.5">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span><span>{fmtCurrency(subtotal, currency)}</span>
            </div>
            {shipping > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span><span>{fmtCurrency(shipping, currency)}</span>
              </div>
            )}
            {insurance > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Insurance</span><span>{fmtCurrency(insurance, currency)}</span>
              </div>
            )}
            {customs > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Customs</span><span>{fmtCurrency(customs, currency)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Tax</span><span>{fmtCurrency(tax, currency)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Discount</span><span>-{fmtCurrency(discount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300 dark:border-gray-600">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span style={{ color: colors.header }}>{fmtCurrency(grandTotal, currency)}</span>
            </div>
            {parseFloat(data.amount_paid) > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>Paid</span><span>{fmtCurrency(data.amount_paid, currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-red-600">
                  <span>Balance</span><span>{fmtCurrency(data.balance_due, currency)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Offer Conditions summary table */}
        {hasOfferConditions && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div
              className="px-2 py-1 text-white text-[9px] font-semibold"
              style={{ background: colors.header }}
            >
              Offer Conditions
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.payment_terms && (
                <div className="flex gap-2 px-2 py-1">
                  <span className="text-[9px] text-gray-400 w-24 shrink-0">Payment Terms</span>
                  <span className="text-[9px] text-gray-700 dark:text-gray-300">{data.payment_terms}</span>
                </div>
              )}
              {data.warranty_duration && (
                <div className="flex gap-2 px-2 py-1">
                  <span className="text-[9px] text-gray-400 w-24 shrink-0">Warranty</span>
                  <span className="text-[9px] text-gray-700 dark:text-gray-300">{data.warranty_duration}</span>
                </div>
              )}
              {data.delivery_location && (
                <div className="flex gap-2 px-2 py-1">
                  <span className="text-[9px] text-gray-400 w-24 shrink-0">Delivery Location</span>
                  <span className="text-[9px] text-gray-700 dark:text-gray-300">{data.delivery_location}</span>
                </div>
              )}
              {data.delivery_time && (
                <div className="flex gap-2 px-2 py-1">
                  <span className="text-[9px] text-gray-400 w-24 shrink-0">Delivery Time</span>
                  <span className="text-[9px] text-gray-700 dark:text-gray-300">{data.delivery_time}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sender info */}
        {hasSender && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
            <p className="text-[9px] text-gray-400 uppercase font-semibold mb-0.5">Prepared by</p>
            {senderInfo.name && <p className="text-[10px] text-gray-700 dark:text-gray-300 font-medium">{senderInfo.name}</p>}
            {senderInfo.phone && <p className="text-[9px] text-gray-500">{senderInfo.phone}</p>}
            {senderInfo.email && <p className="text-[9px] text-gray-500">{senderInfo.email}</p>}
          </div>
        )}

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

  /* ── Doc type & branch ── */
  const [docType, setDocType] = useState(searchParams.get('type') || 'offer');
  const [branch, setBranch] = useState('obour');
  const [generating, setGenerating] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [availableRecords, setAvailableRecords] = useState([]);

  /* ── Sender info (persisted) ── */
  const [senderInfo, setSenderInfo] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gamma_sender_info') || '{}'); } catch { return {}; }
  });
  const [senderDirty, setSenderDirty] = useState(false);
  const [senderSaved, setSenderSaved] = useState(false);
  const [senderOpen, setSenderOpen] = useState(false);

  /* ── Document data ── */
  const [data, setData] = useState({
    offer_reference: '',
    date: '',
    valid_until: '',
    due_date: '',
    expected_date: '',
    business_line: 'led',
    currency: 'USD',
    // Client
    client_name: '',
    client_company: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    // Supplier
    supplier_name: '',
    supplier_company: '',
    supplier_email: '',
    supplier_phone: '',
    supplier_address: '',
    // Financial
    tax_amount: 0,
    discount_amount: 0,
    shipping_cost: 0,
    insurance_cost: 0,
    customs_cost: 0,
    exchange_rate_to_iqd: 1,
    amount_paid: 0,
    balance_due: 0,
    // Offer conditions
    payment_terms: '',
    warranty_duration: '',
    delivery_location: '',
    delivery_time: '',
    // General
    terms: '',
    notes: '',
    // Bank
    bank_name: '',
    bank_account: '',
    bank_iban: '',
    bank_swift: '',
  });

  const [items, setItems] = useState([{ ...EMPTY_LINE }]);

  /* ── Pre-fill from URL params ── */
  useEffect(() => {
    const recordId = searchParams.get('id');
    const type = searchParams.get('type');
    if (type) setDocType(type);
    if (recordId && type) loadRecord(type, recordId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateData = useCallback((name, value) => {
    setData(prev => ({ ...prev, [name]: value }));
  }, []);

  const updateSender = (name, value) => {
    setSenderInfo(prev => ({ ...prev, [name]: value }));
    setSenderDirty(true);
    setSenderSaved(false);
  };

  const saveSender = () => {
    localStorage.setItem('gamma_sender_info', JSON.stringify(senderInfo));
    setSenderDirty(false);
    setSenderSaved(true);
    setTimeout(() => setSenderSaved(false), 2500);
  };

  /* ── Calculated totals ── */
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const calculatedTotal =
    subtotal
    + (parseFloat(data.shipping_cost) || 0)
    + (parseFloat(data.insurance_cost) || 0)
    + (parseFloat(data.customs_cost) || 0)
    + (parseFloat(data.tax_amount) || 0)
    - (parseFloat(data.discount_amount) || 0);

  /* ── Derived flags ── */
  const showTax = docType === 'invoice';
  const showShipping = docType === 'supplier_pi';
  const showBankDetails = docType === 'invoice';
  const isClientDoc = docType === 'offer' || docType === 'invoice';

  /* ─── Load from existing record ─── */
  const endpointMap = {
    offer:       '/workflow/quotations/',
    supplier_pi: '/workflow/supplier-pis/',
    supplier_po: '/workflow/client-pos/',
    invoice:     '/workflow/invoices/',
  };

  const fetchRecords = async (type) => {
    try {
      const ep = endpointMap[type];
      const res = await api.get(ep);
      setAvailableRecords(res.data.results || res.data || []);
    } catch {
      setAvailableRecords([]);
    }
  };

  const loadRecord = async (type, id) => {
    setLoadingRecord(true);
    try {
      const ep = endpointMap[type];
      const res = await api.get(`${ep}${id}/`);
      const rec = res.data;
      setData(prev => ({
        ...prev,
        offer_reference: rec.quotation_number || rec.reference || '',
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
        supplier_company: rec.supplier_company || '',
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
        payment_terms: rec.payment_terms || '',
        warranty_duration: rec.warranty_duration || '',
        delivery_location: rec.delivery_location || '',
        delivery_time: rec.delivery_time || '',
        terms: rec.terms || '',
        notes: rec.notes || '',
      }));
      if (rec.lines && rec.lines.length > 0) {
        setItems(rec.lines.map(l => ({
          description: l.description || '',
          item_code: l.item_code || '',
          sku: l.product_sku || l.sku || '',
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.selling_unit_price || l.unit_price) || 0,
          tax_rate: parseFloat(l.tax_rate) || 0,
          total: parseFloat(l.total) || 0,
          image_b64: l.image_b64 || null,
        })));
      }
      toast.success('Record loaded successfully.');
    } catch (err) {
      console.error('Failed to load record:', err);
      toast.error('Failed to load record.');
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
        branch,
        sender_info: senderInfo,
        subtotal,
        total: calculatedTotal,
        items: items.map(i => ({
          description: i.description,
          item_code: i.item_code || '',
          sku: i.sku || '',
          quantity: parseFloat(i.quantity) || 0,
          unit_price: parseFloat(i.unit_price) || 0,
          tax_rate: parseFloat(i.tax_rate) || 0,
          total: parseFloat(i.total) || 0,
          image_b64: i.image_b64 || null,
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

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const refNum = data.offer_reference || 'doc';
      link.download = `${refNum}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF generated and downloaded.');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('PDF generation failed. Check backend connection.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-5 fade-in">

      {/* ═══ Page Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('pdf_editor.title') || 'Document Editor'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Edit and preview before generating PDF
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => { fetchRecords(docType); setShowLoadModal(true); }}
          >
            Load Record
          </Button>
          <Button variant="secondary" onClick={handlePrint}>
            Print Preview
          </Button>
          <Button onClick={handleGeneratePDF} loading={generating}>
            Generate PDF
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

          {/* === 1. Branch Selector (offer only) === */}
          {docType === 'offer' && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select Branch</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BRANCHES.map(b => (
                  <button
                    key={b.key}
                    onClick={() => setBranch(b.key)}
                    className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      branch === b.key
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <p className={`text-sm font-semibold leading-tight ${branch === b.key ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                      {b.name_en}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" dir="rtl">{b.name_ar}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{b.address_en}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* === 2. Sender Info (offer only, collapsible) === */}
          {docType === 'offer' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setSenderOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Sender / Salesperson Info
                </h3>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${senderOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {senderOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      label="Name"
                      name="name"
                      value={senderInfo.name || ''}
                      onChange={updateSender}
                      placeholder="Your full name"
                    />
                    <FormField
                      label="Phone"
                      name="phone"
                      value={senderInfo.phone || ''}
                      onChange={updateSender}
                      placeholder="+20 ..."
                    />
                    <FormField
                      label="Email"
                      name="email"
                      type="email"
                      value={senderInfo.email || ''}
                      onChange={updateSender}
                      placeholder="you@gammaintl.com"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" onClick={saveSender} disabled={!senderDirty && !senderSaved}>
                      {senderSaved ? 'Saved' : 'Save'}
                    </Button>
                    {senderSaved && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        Saved successfully
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    This info is saved and pre-filled on future documents.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* === 3. Document Info === */}
          <Card title="Document Info">
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {docType === 'offer' && (
                  <FormField
                    label="Offer Reference No."
                    name="offer_reference"
                    value={data.offer_reference}
                    onChange={updateData}
                    required
                    placeholder="e.g. QUO-2026-0001"
                  />
                )}
                {docType !== 'offer' && (
                  <FormField
                    label="Document Number"
                    name="doc_number"
                    value={data.doc_number || ''}
                    onChange={updateData}
                    required
                    placeholder="e.g. INV-2026-0001"
                  />
                )}
                <FormField
                  label="Date"
                  name="date"
                  type="date"
                  value={data.date}
                  onChange={updateData}
                  required
                />
                {docType === 'offer' && (
                  <FormField
                    label="Valid Until"
                    name="valid_until"
                    type="date"
                    value={data.valid_until}
                    onChange={updateData}
                  />
                )}
                {docType === 'invoice' && (
                  <FormField
                    label="Due Date"
                    name="due_date"
                    type="date"
                    value={data.due_date}
                    onChange={updateData}
                  />
                )}
                {docType === 'supplier_po' && (
                  <FormField
                    label="Expected Delivery"
                    name="expected_date"
                    type="date"
                    value={data.expected_date}
                    onChange={updateData}
                  />
                )}
                {docType === 'supplier_pi' && (
                  <FormField
                    label="Valid Until"
                    name="valid_until"
                    type="date"
                    value={data.valid_until}
                    onChange={updateData}
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Business Line"
                  name="business_line"
                  type="select"
                  value={data.business_line}
                  onChange={updateData}
                  options={BL_OPTIONS}
                />
                <FormField
                  label="Currency"
                  name="currency"
                  type="select"
                  value={data.currency}
                  onChange={updateData}
                  options={CURRENCIES}
                />
              </div>
            </div>
          </Card>

          {/* === 4. Client / Supplier Info === */}
          <Card title={isClientDoc ? 'Client Information' : 'Supplier Information'}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={isClientDoc ? 'Client Name' : 'Supplier Name'}
                  name={isClientDoc ? 'client_name' : 'supplier_name'}
                  value={isClientDoc ? data.client_name : data.supplier_name}
                  onChange={updateData}
                  required
                />
                <FormField
                  label="Company"
                  name={isClientDoc ? 'client_company' : 'supplier_company'}
                  value={isClientDoc ? data.client_company : (data.supplier_company || '')}
                  onChange={updateData}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Email"
                  type="email"
                  name={isClientDoc ? 'client_email' : 'supplier_email'}
                  value={isClientDoc ? data.client_email : data.supplier_email}
                  onChange={updateData}
                />
                <FormField
                  label="Phone"
                  name={isClientDoc ? 'client_phone' : 'supplier_phone'}
                  value={isClientDoc ? data.client_phone : data.supplier_phone}
                  onChange={updateData}
                />
              </div>
              <FormField
                label="Address"
                type="textarea"
                rows={2}
                name={isClientDoc ? 'client_address' : 'supplier_address'}
                value={isClientDoc ? data.client_address : data.supplier_address}
                onChange={updateData}
              />
            </div>
          </Card>

          {/* === 5. Line Items === */}
          <Card title="Line Items">
            <LineItemsEditor
              items={items}
              onChange={setItems}
              currency={data.currency}
              showTax={showTax}
            />
          </Card>

          {/* IEC Compliance Note (offer only) */}
          {docType === 'offer' && (
            <div className="rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 px-5 py-4 space-y-1">
              <p
                className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 text-right leading-relaxed"
                dir="rtl"
              >
                {IEC_NOTE}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                This standard note is automatically included in all quotation PDFs.
              </p>
            </div>
          )}

          {/* === 6. Offer Conditions (offer only) === */}
          {docType === 'offer' && (
            <Card title="Offer Conditions">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Payment Terms"
                  name="payment_terms"
                  value={data.payment_terms}
                  onChange={updateData}
                  placeholder="e.g. 50% advance, 50% on delivery"
                />
                <FormField
                  label="Warranty Duration"
                  name="warranty_duration"
                  value={data.warranty_duration}
                  onChange={updateData}
                  placeholder="e.g. 2 years"
                />
                <FormField
                  label="Delivery Location"
                  name="delivery_location"
                  value={data.delivery_location}
                  onChange={updateData}
                  placeholder="e.g. Client warehouse, Cairo"
                />
                <FormField
                  label="Delivery Time"
                  name="delivery_time"
                  value={data.delivery_time}
                  onChange={updateData}
                  placeholder="e.g. 4-6 weeks after PO"
                />
              </div>
            </Card>
          )}

          {/* === 7. Financial Summary === */}
          <Card title="Financial Summary">
            <div className="space-y-4">
              {/* Auto-calculated subtotal */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-300">Subtotal (calculated from items)</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {fmtCurrency(subtotal, data.currency)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {showShipping && (
                  <>
                    <FormField label="Shipping Cost" name="shipping_cost" type="number" value={data.shipping_cost} onChange={updateData} />
                    <FormField label="Insurance Cost" name="insurance_cost" type="number" value={data.insurance_cost} onChange={updateData} />
                    <FormField label="Customs Cost" name="customs_cost" type="number" value={data.customs_cost} onChange={updateData} />
                  </>
                )}
                <FormField label="Tax Amount" name="tax_amount" type="number" value={data.tax_amount} onChange={updateData} />
                <FormField label="Discount Amount" name="discount_amount" type="number" value={data.discount_amount} onChange={updateData} />
                {showShipping && (
                  <FormField label="Exchange Rate to IQD" name="exchange_rate_to_iqd" type="number" value={data.exchange_rate_to_iqd} onChange={updateData} />
                )}
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

              {showShipping && parseFloat(data.exchange_rate_to_iqd) > 1 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    Total in IQD (Rate: {data.exchange_rate_to_iqd})
                  </span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    {fmtCurrency(calculatedTotal * parseFloat(data.exchange_rate_to_iqd), 'IQD')}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* === 8. Terms & Notes === */}
          <Card title="Terms & Notes">
            <div className="space-y-4">
              <FormField
                label="Terms & Conditions"
                name="terms"
                type="textarea"
                value={data.terms}
                onChange={updateData}
                rows={3}
                placeholder="Payment terms, warranty, delivery conditions..."
              />
              <FormField
                label="Notes"
                name="notes"
                type="textarea"
                value={data.notes}
                onChange={updateData}
                rows={2}
                placeholder="Additional notes..."
              />
              {showBankDetails && (
                <>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 pt-2">Bank Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Bank Name" name="bank_name" value={data.bank_name} onChange={updateData} />
                    <FormField label="Account Number" name="bank_account" value={data.bank_account} onChange={updateData} />
                    <FormField label="IBAN" name="bank_iban" value={data.bank_iban} onChange={updateData} />
                    <FormField label="SWIFT Code" name="bank_swift" value={data.bank_swift} onChange={updateData} />
                  </div>
                </>
              )}
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
              branch={branch}
              senderInfo={senderInfo}
            />

            {/* Action buttons under preview */}
            <div className="mt-4 space-y-2">
              <Button onClick={handleGeneratePDF} loading={generating} className="w-full">
                Generate & Download PDF
              </Button>
              <Button variant="outline" onClick={handlePrint} className="w-full">
                Print Preview
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* ═══ Load Record Modal ═══ */}
      <Modal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        title="Load from Existing Record"
        size="lg"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a record to pre-fill the editor. You can adjust anything before generating the PDF.
          </p>
          {loadingRecord ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : availableRecords.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No records found for this document type.</p>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {availableRecords.map(rec => {
                const num = rec.quotation_number || rec.pi_number || rec.po_number || rec.invoice_number || rec.id;
                const name = rec.client_name || rec.supplier_name || '—';
                const total = rec.total || 0;
                const status = rec.status || '';
                return (
                  <button
                    key={rec.id}
                    onClick={() => loadRecord(docType, rec.id)}
                    className="w-full flex items-center justify-between px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">#{num}</p>
                      <p className="text-xs text-gray-500">{name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {fmtCurrency(total, rec.currency)}
                      </p>
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
