import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatPKR,
  formatDate,
  getDaysDifference,
  calculateDaysOfCover,
  isBatchAtRiskOfExpiringUnsold,
} from '../../rules/rulesEngine';
import {
  Hourglass,
  Sliders,
  AlertTriangle,
  HelpCircle,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ZAxis,
  ReferenceLine,
} from 'recharts';

export const SlowMovingPage: React.FC = () => {
  const { state, setActivePage } = useApp();

  // Adjustable parameters
  const [slowMoverThreshold, setSlowMoverThreshold] = useState<number>(90); // default 90 days
  const [salesWindowDays, setSalesWindowDays] = useState<number>(30); // 30, 60, 90 days

  const prodMap = useMemo(() => new Map(state.products.map((p) => [p.sku, p])), [state.products]);

  // Compute stock velocity and days of cover for all released batches
  const slowMovingData = useMemo(() => {
    let totalValueAtRisk = 0;
    const items: any[] = [];
    const scatterPoints: any[] = [];

    // Calculate usable stock per product first
    const productUsableStock = new Map<string, number>();
    for (const b of state.batches) {
      if (b.qualityStatus === 'Released') {
        const daysLeft = getDaysDifference(b.expiryDate, state.today);
        if (daysLeft >= 0) {
          productUsableStock.set(b.sku, (productUsableStock.get(b.sku) || 0) + b.qty);
        }
      }
    }

    for (const b of state.batches) {
      if (b.qualityStatus !== 'Released' || b.qty <= 0) continue;
      const prod = prodMap.get(b.sku);
      if (!prod) continue;

      const daysLeft = getDaysDifference(b.expiryDate, state.today);
      if (daysLeft < 0) continue; // Skip expired, already in write-offs

      const totalUsableForProd = productUsableStock.get(b.sku) || b.qty;
      const { daysOfCover, display: coverDisplay } = calculateDaysOfCover(totalUsableForProd, prod.avgDailySales);

      const isAtRisk = daysOfCover === 'infinity' || daysOfCover > daysLeft;
      const isSlow = daysOfCover === 'infinity' || daysOfCover > slowMoverThreshold;

      const val = b.qty * prod.unitCost;

      if (isAtRisk || isSlow) {
        if (isAtRisk) {
          totalValueAtRisk += val;
        }

        let suggestedAction = 'Monitor turnover';
        if (daysOfCover === 'infinity') {
          suggestedAction = 'Emergency discount or channel transfer';
        } else if (daysOfCover > daysLeft * 1.5) {
          suggestedAction = 'Immediate 10% wholesale clearance price';
        } else if (daysOfCover > daysLeft) {
          suggestedAction = 'Prioritise in active retail dispatches';
        } else {
          suggestedAction = 'Halt upcoming production replenishment';
        }

        items.push({
          batchNo: b.batchNo,
          sku: b.sku,
          productName: prod.name,
          category: prod.category,
          unit: prod.unit,
          qty: b.qty,
          location: b.location,
          expiryDate: b.expiryDate,
          daysLeft,
          avgDailySales: prod.avgDailySales,
          daysOfCover,
          coverDisplay,
          isAtRisk,
          isSlow,
          val,
          suggestedAction,
        });

        // Scatter chart point
        if (daysOfCover !== 'infinity' && daysOfCover < 365 && daysLeft < 365) {
          scatterPoints.push({
            batchNo: b.batchNo,
            sku: b.sku,
            x: daysLeft, // X-axis: Remaining Shelf Life (days)
            y: daysOfCover, // Y-axis: Days of Cover (days)
            z: b.qty,
            val,
            isAtRisk,
            name: prod.name,
          });
        }
      }
    }

    // Sort by atRisk first, then highest value at risk
    items.sort((a, b) => {
      if (a.isAtRisk && !b.isAtRisk) return -1;
      if (!a.isAtRisk && b.isAtRisk) return 1;
      return b.val - a.val;
    });

    return {
      items,
      scatterPoints,
      totalValueAtRisk,
    };
  }, [state.batches, state.today, prodMap, slowMoverThreshold]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Slow-Moving Stock & Days-of-Cover Analysis
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Compares stock consumption velocity against remaining shelf life to identify items at risk of expiring unsold
          </p>
        </div>

        {/* Estimated Value at Risk Indicator */}
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold uppercase tracking-wider">
              Estimated Value at Risk (Current Rules)
            </div>
            <div className="text-base font-bold text-amber-900 dark:text-amber-200 font-mono">
              {formatPKR(slowMovingData.totalValueAtRisk)}
            </div>
          </div>
        </div>
      </div>

      {/* Control Strip & Parameters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700 dark:text-stone-300">
              Slow-Mover Threshold:
            </span>
            <select
              value={slowMoverThreshold}
              onChange={(e) => setSlowMoverThreshold(Number(e.target.value))}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-medium"
            >
              <option value={60}>&gt; 60 Days Cover</option>
              <option value={90}>&gt; 90 Days Cover (Standard)</option>
              <option value={120}>&gt; 120 Days Cover</option>
              <option value={180}>&gt; 180 Days Cover</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700 dark:text-stone-300">
              Sales Window Basis:
            </span>
            <select
              value={salesWindowDays}
              onChange={(e) => setSalesWindowDays(Number(e.target.value))}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-medium"
            >
              <option value={30}>Last 30 Days Daily Average</option>
              <option value={60}>Last 60 Days Daily Average</option>
              <option value={90}>Last 90 Days Daily Average</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-stone-500 italic flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
          <span>Rule: &quot;At Risk&quot; triggers whenever Days of Cover &gt; Remaining Shelf Life</span>
        </div>
      </div>

      {/* Scatter Chart: Days of Cover vs Remaining Shelf Life */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Risk Matrix: Days of Cover vs. Remaining Shelf Life
            </h2>
            <p className="text-xs text-stone-500">
              Batches in the upper-left quadrant (Days of Cover &gt; Shelf Life) will expire before normal customer sales can absorb them.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-600 inline-block" />
              <span>At Risk of Expiring Unsold</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span>Slow Moving (&gt;{slowMoverThreshold}d)</span>
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <XAxis
                type="number"
                dataKey="x"
                name="Remaining Shelf Life"
                unit="d"
                tick={{ fontSize: 11 }}
                stroke="#a8a29e"
                label={{ value: 'Remaining Shelf Life (Days)', position: 'insideBottom', offset: -10, fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Days of Cover"
                unit="d"
                tick={{ fontSize: 11 }}
                stroke="#a8a29e"
                label={{ value: 'Days of Cover (Days)', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <ZAxis range={[60, 200]} dataKey="z" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="p-2.5 rounded-lg bg-stone-900 text-stone-100 text-xs border border-stone-700 shadow-xl">
                      <div className="font-bold">{data.name}</div>
                      <div className="font-mono text-[11px] text-stone-400">Batch: {data.batchNo} ({data.sku})</div>
                      <div className="mt-1 space-y-0.5">
                        <div>Shelf Life Left: <strong className="font-mono">{data.x} days</strong></div>
                        <div>Days of Cover: <strong className="font-mono">{data.y} days</strong></div>
                        <div>Batch Value: <strong className="font-mono">{formatPKR(data.val)}</strong></div>
                        <div className={`mt-1 font-semibold ${data.isAtRisk ? 'text-rose-400' : 'text-amber-400'}`}>
                          {data.isAtRisk ? 'At Risk of Expiring Unsold' : 'Slow Turnover'}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              {/* Reference line Y = X where Cover == Shelf life */}
              <ReferenceLine stroke="#e11d48" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Parity Line (Cover = Shelf Life)', fill: '#e11d48', fontSize: 10 }} />
              <Scatter name="Batches" data={slowMovingData.scatterPoints} fill="#d97706" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table of At-Risk and Slow-Moving Batches */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Slow-Moving & Velocity-Imbalanced Batches ({slowMovingData.items.length})
          </h2>
          <span className="text-xs text-stone-400">
            Sorted by urgency and financial exposure
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                <th className="py-3 px-4 font-semibold">SKU & Batch</th>
                <th className="py-3 px-3 font-semibold">Product Name</th>
                <th className="py-3 px-3 font-semibold text-right">Qty & Loc</th>
                <th className="py-3 px-3 font-semibold text-right">Daily Sales</th>
                <th className="py-3 px-3 font-semibold text-right">Days of Cover</th>
                <th className="py-3 px-3 font-semibold text-right">Shelf Life Left</th>
                <th className="py-3 px-3 font-semibold">Risk Classification</th>
                <th className="py-3 px-4 font-semibold text-right">Estimated Value</th>
                <th className="py-3 px-4 font-semibold">Suggested Remedial Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {slowMovingData.items.map((item) => (
                <tr key={item.batchNo} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                  <td className="py-3 px-4 font-mono">
                    <div className="font-bold text-stone-900 dark:text-stone-100">{item.batchNo}</div>
                    <div className="text-[10px] text-stone-400">{item.sku}</div>
                  </td>

                  <td className="py-3 px-3 font-medium text-stone-800 dark:text-stone-200">
                    {item.productName}
                  </td>

                  <td className="py-3 px-3 text-right font-mono">
                    <div>{item.qty} {item.unit}</div>
                    <div className="text-[10px] text-stone-400">{item.location}</div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-stone-700 dark:text-stone-300">
                    {item.avgDailySales}/day
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-semibold text-amber-700 dark:text-amber-400">
                    {item.coverDisplay}
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-semibold text-stone-800 dark:text-stone-200">
                    {item.daysLeft}d left
                  </td>

                  <td className="py-3 px-3">
                    {item.isAtRisk ? (
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        At risk of expiring unsold
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Slow turnover (&gt;{slowMoverThreshold}d)
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                    {formatPKR(item.val)}
                  </td>

                  <td className="py-3 px-4 text-stone-700 dark:text-stone-300 text-[11px]">
                    <div className="font-medium text-emerald-800 dark:text-emerald-400">
                      {item.suggestedAction}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
