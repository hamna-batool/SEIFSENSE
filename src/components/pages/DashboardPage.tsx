import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatPKR,
  formatDate,
  getDaysDifference,
  getExpiryBand,
  calculateDaysOfCover,
} from '../../rules/rulesEngine';
import {
  Boxes,
  AlertTriangle,
  Clock,
  TrendingDown,
  ShoppingCart,
  ArrowRight,
  ShieldAlert,
  CheckCircle,
  Truck,
  DollarSign,
  AlertOctagon,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { state, setActivePage, computedAlerts } = useApp();

  const prodMap = useMemo(() => new Map(state.products.map((p) => [p.sku, p])), [state.products]);

  // Compute metrics with pure rules
  const metrics = useMemo(() => {
    let totalStockValue = 0;
    let expiredBatchesCount = 0;
    let expiredValue = 0;
    let expiringIn7DaysCount = 0;
    let expiringIn30DaysCount = 0;
    let expiringIn60DaysCount = 0;
    let slowMovingValue = 0;

    for (const b of state.batches) {
      const prod = prodMap.get(b.sku);
      if (!prod) continue;
      const daysLeft = getDaysDifference(b.expiryDate, state.today);
      const val = b.qty * prod.unitCost;

      totalStockValue += val;

      if (daysLeft < 0) {
        expiredBatchesCount++;
        expiredValue += val;
      } else if (daysLeft <= 7) {
        expiringIn7DaysCount++;
      } else if (daysLeft <= 30) {
        expiringIn30DaysCount++;
      } else if (daysLeft <= 60) {
        expiringIn60DaysCount++;
      }

      // Check slow moving
      if (b.qualityStatus === 'Released' && daysLeft >= 0) {
        const { daysOfCover } = calculateDaysOfCover(b.qty, prod.avgDailySales);
        if (daysOfCover === 'infinity' || daysOfCover > daysLeft || daysOfCover > 90) {
          slowMovingValue += val;
        }
      }
    }

    const pendingPrCount = state.purchaseRequests.filter((pr) => pr.status === 'Pending approval').length;

    return {
      totalStockValue,
      expiredBatchesCount,
      expiredValue,
      expiringIn7DaysCount,
      expiringIn30DaysCount,
      expiringIn60DaysCount,
      slowMovingValue,
      pendingPrCount,
    };
  }, [state.batches, state.products, state.today, state.purchaseRequests, prodMap]);

  // Expiry Timeline over next 12 weeks
  const expiryTimelineData = useMemo(() => {
    const weeks = Array.from({ length: 12 }, (_, i) => ({
      week: `Wk +${i + 1}`,
      critical: 0,
      warning: 0,
      healthy: 0,
    }));

    for (const b of state.batches) {
      if (b.qty <= 0) continue;
      const daysLeft = getDaysDifference(b.expiryDate, state.today);
      if (daysLeft < 0) continue;
      const weekIndex = Math.floor(daysLeft / 7);
      if (weekIndex < 12) {
        if (daysLeft <= 14) {
          weeks[weekIndex].critical += b.qty;
        } else if (daysLeft <= 30) {
          weeks[weekIndex].warning += b.qty;
        } else {
          weeks[weekIndex].healthy += b.qty;
        }
      }
    }

    return weeks;
  }, [state.batches, state.today]);

  // Stock value by category
  const categoryData = useMemo(() => {
    const catMap = new Map<string, number>();
    for (const b of state.batches) {
      const prod = prodMap.get(b.sku);
      if (!prod) continue;
      const val = b.qty * prod.unitCost;
      catMap.set(prod.category, (catMap.get(prod.category) || 0) + val);
    }
    return Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
  }, [state.batches, prodMap]);

  // Write-offs by reason
  const writeOffData = useMemo(() => {
    const map = new Map<string, number>();
    for (const wo of state.writeOffs) {
      map.set(wo.reason, (map.get(wo.reason) || 0) + wo.value);
    }
    return Array.from(map.entries()).map(([reason, value]) => ({ reason, value }));
  }, [state.writeOffs]);

  // Top 10 at-risk SKUs
  const atRiskSkus = useMemo(() => {
    const skuAtRiskMap = new Map<string, { sku: string; name: string; category: string; atRiskValue: number; batchesCount: number }>();
    for (const b of state.batches) {
      const prod = prodMap.get(b.sku);
      if (!prod) continue;
      const daysLeft = getDaysDifference(b.expiryDate, state.today);
      if (daysLeft <= 30 && b.qty > 0) {
        const val = b.qty * prod.unitCost;
        const existing = skuAtRiskMap.get(b.sku) || {
          sku: b.sku,
          name: prod.name,
          category: prod.category,
          atRiskValue: 0,
          batchesCount: 0,
        };
        existing.atRiskValue += val;
        existing.batchesCount += 1;
        skuAtRiskMap.set(b.sku, existing);
      }
    }
    return Array.from(skuAtRiskMap.values())
      .sort((a, b) => b.atRiskValue - a.atRiskValue)
      .slice(0, 10);
  }, [state.batches, prodMap, state.today]);

  // Needs Attention Today (Top critical & high unacknowledged items)
  const urgentItems = useMemo(() => {
    return computedAlerts
      .filter((a) => a.severity === 'Critical' || a.severity === 'Expired' || a.severity === 'High')
      .slice(0, 5);
  }, [computedAlerts]);

  const COLORS = ['#15803d', '#b45309', '#0284c7', '#7c3aed', '#db2777', '#d97706', '#475569', '#0d9488'];

  return (
    <div className="space-y-6">
      {/* Top Banner Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Plant Inventory & Expiry Dashboard
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Real-time multi-aisle stock valuation, shelf-life monitoring, and FEFO operational metrics
          </p>
        </div>

        {/* Role contextual badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300">
          <span className="text-stone-500">Active View:</span>
          <span className="font-semibold text-emerald-800 dark:text-emerald-400">{state.role} Perspective</span>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Stock Value */}
        <button
          onClick={() => setActivePage('inventory')}
          className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-left hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-xs group"
        >
          <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">Total Stock Value</div>
          <div className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono tabular-nums mt-1 truncate">
            {formatPKR(metrics.totalStockValue)}
          </div>
          <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
            <span>{state.batches.length} batches</span>
            <ArrowRight className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        {/* Expiring in 7 Days */}
        <button
          onClick={() => setActivePage('alerts')}
          className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-left hover:border-rose-400 dark:hover:border-rose-700 transition-all shadow-xs group"
        >
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
            <AlertOctagon className="w-3 h-3" />
            <span>&le; 7 Days Left</span>
          </div>
          <div className="text-base font-bold text-rose-700 dark:text-rose-400 font-mono tabular-nums mt-1">
            {metrics.expiringIn7DaysCount}
          </div>
          <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
            <span>Urgent clearance</span>
            <ArrowRight className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        {/* Expiring in 30 Days */}
        <button
          onClick={() => setActivePage('inventory', { expiryBand: '<30' })}
          className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-left hover:border-amber-400 dark:hover:border-amber-700 transition-all shadow-xs group"
        >
          <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">8–30 Days Left</div>
          <div className="text-base font-bold text-amber-800 dark:text-amber-300 font-mono tabular-nums mt-1">
            {metrics.expiringIn30DaysCount}
          </div>
          <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
            <span>Wholesale priority</span>
            <ArrowRight className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        {/* Expiring in 60 Days */}
        <button
          onClick={() => setActivePage('inventory', { expiryBand: '30-60' })}
          className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-left hover:border-stone-400 transition-all shadow-xs group"
        >
          <div className="text-[11px] text-stone-600 dark:text-stone-300 font-medium">31–60 Days Left</div>
          <div className="text-base font-bold text-stone-800 dark:text-stone-200 font-mono tabular-nums mt-1">
            {metrics.expiringIn60DaysCount}
          </div>
          <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
            <span>Excludes retail 60d</span>
            <ArrowRight className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        {/* Expired Stock Value */}
        <button
          onClick={() => setActivePage('writeoffs')}
          className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-left hover:border-rose-400 dark:hover:border-rose-700 transition-all shadow-xs group"
        >
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Expired Value</div>
          <div className="text-base font-bold text-rose-700 dark:text-rose-400 font-mono tabular-nums mt-1 truncate">
            {formatPKR(metrics.expiredValue)}
          </div>
          <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
            <span>{metrics.expiredBatchesCount} batches write-off</span>
            <ArrowRight className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        {/* Slow-Moving Stock Value */}
        <button
          onClick={() => setActivePage('slow-moving')}
          className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-left hover:border-amber-400 dark:hover:border-amber-700 transition-all shadow-xs group"
        >
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Slow-Moving Value</div>
          <div className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono tabular-nums mt-1 truncate">
            {formatPKR(metrics.slowMovingValue)}
          </div>
          <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
            <span>Cover &gt; Shelf life</span>
            <ArrowRight className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        {/* Pending PO Approvals */}
        <button
          onClick={() => setActivePage('purchasing')}
          className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-left hover:border-emerald-400 dark:hover:border-emerald-700 transition-all shadow-xs group"
        >
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Pending Approvals</div>
          <div className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono tabular-nums mt-1">
            {metrics.pendingPrCount}
          </div>
          <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
            <span>Purchase requests</span>
            <ArrowRight className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Expiry Timeline by Week (Stacked Bar) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                12-Week Expiry Horizon Timeline
              </h2>
              <p className="text-xs text-stone-500">
                Weekly projected quantity expiring across Critical (&le;14d), Warning (15-30d), and Healthy (&gt;30d)
              </p>
            </div>
            <span className="text-[11px] font-mono text-stone-400">Unit: Cartons / Bags</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expiryTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#a8a29e" />
                <YAxis tick={{ fontSize: 11 }} stroke="#a8a29e" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    borderColor: '#44403c',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fafaf9',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="critical" name="Critical (≤14d)" stackId="a" fill="#e11d48" />
                <Bar dataKey="warning" name="Warning (15–30d)" stackId="a" fill="#f59e0b" />
                <Bar dataKey="healthy" name="Healthy (>30d)" stackId="a" fill="#15803d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Stock Value by Category (Donut) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Stock Value by Category
            </h2>
            <p className="text-xs text-stone-500 mb-3">
              Distribution of current on-hand warehouse inventory
            </p>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatPKR(Number(val) || 0)}
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#44403c',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#fafaf9',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[11px] text-stone-600 dark:text-stone-400 mt-2 border-t border-stone-100 dark:border-stone-800 pt-2">
            {categoryData.slice(0, 6).map((c, idx) => (
              <div key={c.name} className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Row: Needs Attention Today + Top At-Risk SKUs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs Attention Today */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Needs Attention Today
                </h2>
              </div>
              <button
                onClick={() => setActivePage('alerts')}
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View all {computedAlerts.length} alerts</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {urgentItems.map((item) => {
                const prod = prodMap.get(item.sku);
                const band = getExpiryBand(item.daysLeft);
                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                          {item.batchNo}
                        </span>
                        <span className="text-stone-500 font-medium">({item.sku})</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${band.badgeClass}`}>
                          {item.daysLeft < 0 ? `Expired ${Math.abs(item.daysLeft)}d ago` : `${item.daysLeft}d left`}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {prod?.name} · {item.qty} units · Val: {formatPKR(item.value)} · Loc: {item.location}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium block mb-1">
                        {item.suggestedAction}
                      </span>
                      <button
                        onClick={() => setActivePage('alerts')}
                        className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                      >
                        Action &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top 10 At-Risk SKUs Table */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Top At-Risk Finished Products
            </h2>
            <span className="text-xs text-stone-400">Short shelf life (&le;30d)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400">
                  <th className="pb-2 font-medium">SKU / Product</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium text-right">Batches</th>
                  <th className="pb-2 font-medium text-right">Value at Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {atRiskSkus.map((skuItem) => (
                  <tr key={skuItem.sku} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="py-2.5">
                      <div className="font-medium text-stone-800 dark:text-stone-200">{skuItem.name}</div>
                      <div className="font-mono text-[10px] text-stone-400">{skuItem.sku}</div>
                    </td>
                    <td className="py-2.5 text-stone-500">{skuItem.category}</td>
                    <td className="py-2.5 text-right font-mono text-stone-700 dark:text-stone-300">
                      {skuItem.batchesCount}
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                      {formatPKR(skuItem.atRiskValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
