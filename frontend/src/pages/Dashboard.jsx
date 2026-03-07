import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import api from '../api/client';

/* ───────── small reusable pieces ───────── */

function KPICard({ title, value, sub, icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${color || 'bg-primary-100 dark:bg-primary-900/30'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function BranchCard({ name, icon, color, borderColor, products, value, lowStock, t }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border-2 ${borderColor} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`${color} px-5 py-3 flex items-center gap-3`}>
        <span className="text-2xl">{icon}</span>
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{name}</h3>
      </div>
      <div className="p-5 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{products}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.products')}</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.inv_value')}</p>
        </div>
        <div>
          <p className={`text-2xl font-bold ${lowStock > 0 ? 'text-amber-600' : 'text-green-600'}`}>{lowStock}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.low_stock')}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all group">
      <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 text-center">{label}</span>
    </button>
  );
}

function Skeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      ))}
    </div>
  );
}

/* ───────── branch definitions ───────── */

const BRANCHES = [
  { key: 'led',    icon: '💡', color: 'bg-amber-50 dark:bg-amber-900/20',  borderColor: 'border-amber-300 dark:border-amber-700' },
  { key: 'heater', icon: '🔥', color: 'bg-red-50 dark:bg-red-900/20',      borderColor: 'border-red-300 dark:border-red-700' },
  { key: 'solar',  icon: '☀️', color: 'bg-blue-50 dark:bg-blue-900/20',    borderColor: 'border-blue-300 dark:border-blue-700' },
];

/* ───────── main dashboard ───────── */

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const companyName = user?.company_name || user?.company?.name || 'Gamma International';

  const [exec, setExec] = useState(null);
  const [invDash, setInvDash] = useState(null);
  const [invoiceSummary, setInvoiceSummary] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboards/executive/').catch(() => ({ data: {} })),
      api.get('/inventory/products/dashboard/').catch(() => ({ data: {} })),
      api.get('/finance/invoices/summary/').catch(() => ({ data: {} })),
      api.get('/finance/invoices/?ordering=-created_at&page_size=5').catch(() => ({ data: { results: [] } })),
      api.get('/inventory/movements/?ordering=-created_at&page_size=5').catch(() => ({ data: { results: [] } })),
      api.get('/inventory/products/?page_size=500').catch(() => ({ data: { results: [] } })),
      api.get('/inventory/categories/').catch(() => ({ data: { results: [] } })),
    ]).then(([e, inv, iSum, iRecent, mRecent, prods, cats]) => {
      setExec(e.data);
      setInvDash(inv.data);
      setInvoiceSummary(iSum.data);
      setRecentInvoices(iRecent.data.results || []);
      setRecentMovements(mRecent.data.results || []);
      setProducts(prods.data.results || []);
      setCategories(cats.data.results || []);
    }).finally(() => setLoading(false));
  }, []);

  /* ── helpers ── */
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '-';

  /* ── branch data calculation ── */
  const branchKeywords = {
    led:    ['led', 'light', 'lamp', 'bulb', 'lighting', 'luminaire'],
    heater: ['heater', 'thermocouple', 'element', 'heating', 'thermal', 'sensor'],
    solar:  ['solar', 'ac', 'air conditioner', 'cooling', 'hvac', 'panel'],
  };

  const categorizeToBranch = (product) => {
    const catName = (product.category_name || '').toLowerCase();
    const prodName = (product.name || '').toLowerCase();
    const searchStr = catName + ' ' + prodName;
    for (const [branch, keywords] of Object.entries(branchKeywords)) {
      if (keywords.some(kw => searchStr.includes(kw))) return branch;
    }
    return null;
  };

  const branchData = {};
  BRANCHES.forEach(b => { branchData[b.key] = { products: 0, value: 0, lowStock: 0 }; });
  products.forEach(p => {
    const branch = categorizeToBranch(p);
    if (branch) {
      branchData[branch].products += 1;
      branchData[branch].value += parseFloat(p.cost_price || 0) * parseFloat(p.total_stock || 0);
      if (p.total_stock !== undefined && p.min_stock_level !== undefined && parseFloat(p.total_stock) <= parseFloat(p.min_stock_level)) {
        branchData[branch].lowStock += 1;
      }
    }
  });

  /* ── today ── */
  const today = new Date();
  const greeting = today.getHours() < 12 ? t('dashboard.good_morning') : today.getHours() < 18 ? t('dashboard.good_afternoon') : t('dashboard.good_evening');

  return (
    <div className="space-y-6 fade-in">

      {/* ═══════ Company Header ═══════ */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{companyName}</h1>
            <p className="text-primary-200 mt-1">{greeting}, {user?.first_name || 'User'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-primary-200">{today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-xs text-primary-300 mt-1">{t('dashboard.powered_by')}</p>
          </div>
        </div>
      </div>

      {/* ═══════ Global KPIs ═══════ */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title={t('dashboard.revenue')} value={fmt(exec?.revenue_this_month)} sub={t('dashboard.this_month')} icon="💰" color="bg-green-100 dark:bg-green-900/30" />
          <KPICard title={t('dashboard.orders')} value={exec?.orders_this_month || 0} sub={t('dashboard.this_month')} icon="🛒" color="bg-blue-100 dark:bg-blue-900/30" />
          <KPICard title={t('dashboard.employees')} value={exec?.active_employees || 0} sub={t('common.active')} icon="👥" color="bg-purple-100 dark:bg-purple-900/30" />
          <KPICard title={t('dashboard.pipeline')} value={fmt(exec?.pipeline_value)} sub={t('dashboard.open_deals')} icon="📊" color="bg-amber-100 dark:bg-amber-900/30" />
        </div>
      )}

      {/* ═══════ Branch KPI Cards ═══════ */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t('dashboard.branches')}</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border animate-pulse h-40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BRANCHES.map(b => (
              <BranchCard
                key={b.key}
                name={t(`dashboard.branch_${b.key}`)}
                icon={b.icon}
                color={b.color}
                borderColor={b.borderColor}
                products={branchData[b.key].products}
                value={fmt(branchData[b.key].value)}
                lowStock={branchData[b.key].lowStock}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══════ Financial Snapshot ═══════ */}
      {!loading && invoiceSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title={t('finance.total_invoiced')} value={fmt(invoiceSummary.total_invoiced)} icon="📄" color="bg-sky-100 dark:bg-sky-900/30" />
          <KPICard title={t('finance.total_paid')} value={fmt(invoiceSummary.total_paid)} icon="✅" color="bg-green-100 dark:bg-green-900/30" />
          <KPICard title={t('finance.outstanding')} value={fmt(invoiceSummary.total_outstanding)} icon="⏳" color="bg-amber-100 dark:bg-amber-900/30" />
          <KPICard title={t('finance.overdue_invoices')} value={invoiceSummary.overdue_count || 0} icon="⚠️" color="bg-red-100 dark:bg-red-900/30" />
        </div>
      )}

      {/* ═══════ Inventory Overview ═══════ */}
      {!loading && invDash && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard title={t('inventory.total_products')} value={invDash.total_products || 0} icon="📦" color="bg-indigo-100 dark:bg-indigo-900/30" />
          <KPICard title={t('inventory.inventory_value')} value={fmt(invDash.total_value)} icon="💎" color="bg-teal-100 dark:bg-teal-900/30" />
          <KPICard title={t('inventory.low_stock_alerts')} value={invDash.low_stock_count || 0} icon="🔔" color="bg-orange-100 dark:bg-orange-900/30" />
        </div>
      )}

      {/* ═══════ Quick Actions ═══════ */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t('dashboard.quick_actions')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <QuickAction icon="📄" label={t('dashboard.new_invoice')} onClick={() => navigate('/finance')} />
          <QuickAction icon="📦" label={t('dashboard.add_product')} onClick={() => navigate('/inventory')} />
          <QuickAction icon="💳" label={t('dashboard.record_payment')} onClick={() => navigate('/finance')} />
          <QuickAction icon="💸" label={t('dashboard.new_expense')} onClick={() => navigate('/finance')} />
          <QuickAction icon="👤" label={t('dashboard.new_employee')} onClick={() => navigate('/hr')} />
          <QuickAction icon="🤝" label={t('dashboard.new_deal')} onClick={() => navigate('/crm')} />
        </div>
      </div>

      {/* ═══════ Recent Activity ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Invoices */}
        <Card title={t('dashboard.recent_invoices')}>
          {loading ? <Skeleton /> : recentInvoices.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">{t('common.no_data')}</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentInvoices.slice(0, 5).map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-3 px-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{inv.customer_name} &middot; {fmtDate(inv.issue_date)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(inv.total)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Stock Movements */}
        <Card title={t('dashboard.recent_movements')}>
          {loading ? <Skeleton /> : recentMovements.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">{t('common.no_data')}</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentMovements.slice(0, 5).map(mv => (
                <div key={mv.id} className="flex items-center justify-between py-3 px-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{mv.product_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{mv.reference_number || '-'} &middot; {fmtDate(mv.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-sm font-semibold ${mv.movement_type === 'in' ? 'text-green-600' : mv.movement_type === 'out' ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'}`}>
                      {mv.movement_type === 'in' ? '+' : mv.movement_type === 'out' ? '-' : ''}{mv.quantity}
                    </span>
                    <StatusBadge status={mv.movement_type} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ═══════ Products by Category ═══════ */}
      {!loading && invDash?.by_category && invDash.by_category.length > 0 && (
        <Card title={t('dashboard.products_by_category')}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {invDash.by_category.map((cat, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{cat.count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{cat.category__name || t('finance.uncategorized')}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
