import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { evaluateForecastMethods } from '../../rules/rulesEngine';
import {
  TrendingUp,
  Info,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceArea,
} from 'recharts';

export const DemandForecastPage: React.FC = () => {
  const { state } = useApp();

  // Selected Finished Good for forecasting (default to Sooper Classic Biscuit)
  const finishedProducts = useMemo(
    () => state.products.filter((p) => p.category !== 'Ingredients' && p.category !== 'Packaging'),
    [state.products]
  );

  const [selectedSku, setSelectedSku] = useState<string>(finishedProducts[0]?.sku || 'SKU-BIS-001');

  const selectedProduct = useMemo(
    () => state.products.find((p) => p.sku === selectedSku) || state.products[0],
    [selectedSku, state.products]
  );

  // Get sales history for selected product
  const historyObj = useMemo(() => {
    return (
      state.salesHistory.find((s) => s.sku === selectedSku) ||
      state.salesHistory[0]
    );
  }, [selectedSku, state.salesHistory]);

  // Run statistical forecast evaluation
  const forecastResults = useMemo(() => {
    if (!historyObj) return null;
    return evaluateForecastMethods(historyObj.history);
  }, [historyObj]);

  // Build chart dataset combining historical actuals with method projections on held-out months
  const chartData = useMemo(() => {
    if (!historyObj || !forecastResults) return [];

    const naiveMap = new Map(forecastResults.evaluations[0].predictions.map((p) => [p.month, p.predicted]));
    const maMap = new Map(forecastResults.evaluations[1].predictions.map((p) => [p.month, p.predicted]));
    const esMap = new Map(forecastResults.evaluations[2].predictions.map((p) => [p.month, p.predicted]));

    return historyObj.history.map((h, idx) => {
      const isHeldOut = idx >= 9; // Months 10, 11, 12 (Oct, Nov, Dec)
      return {
        month: h.month.split(' ')[0], // short name e.g. "Dec", "Jan"
        fullMonth: h.month,
        actual: h.sales,
        naive: isHeldOut ? naiveMap.get(h.month) : undefined,
        movingAvg: isHeldOut ? maMap.get(h.month) : undefined,
        expSmoothing: isHeldOut ? esMap.get(h.month) : undefined,
      };
    });
  }, [historyObj, forecastResults]);

  return (
    <div className="space-y-6">
      {/* Page Header with Strict Academic Disclaimers */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Demand Forecast (statistical)
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold border border-stone-200 dark:border-stone-700">
              Evaluated on synthetic data
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Statistical benchmark comparing Naive Baseline, 3-Month Moving Average, and Seasonal Exponential Smoothing on held-out sales
          </p>
        </div>

        {/* Product Selector */}
        <div className="w-full sm:w-72">
          <label className="text-[10px] text-stone-400 font-medium block mb-1">
            Finished Good SKU
          </label>
          <select
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            className="w-full p-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
          >
            {finishedProducts.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Non-Negotiable Academic Disclaimer Banner */}
      <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Academic Disclaimer:</strong> Evaluated on synthetic data. Not evidence of real-world accuracy.
          The first 9 months serve as training history, and the last 3 months are held out for error measurement (MAE & MAPE).
        </div>
      </div>

      {/* Forecast Line Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              12-Month Sales History & Held-Out Period Projections
            </h2>
            <p className="text-xs text-stone-500">
              Solid line represents recorded sales; dashed lines demonstrate statistical model backtests on Months 10–12
            </p>
          </div>
          <span className="text-xs font-mono text-stone-400">Unit: Cartons / Month</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#a8a29e" />
              <YAxis tick={{ fontSize: 11 }} stroke="#a8a29e" />
              <Tooltip
                content={({ payload, label }) => {
                  if (!payload || payload.length === 0) return null;
                  const item = chartData.find((d) => d.month === label);
                  return (
                    <div className="p-3 rounded-xl bg-stone-900 text-stone-100 text-xs border border-stone-700 shadow-2xl space-y-1">
                      <div className="font-bold text-stone-200">{item?.fullMonth}</div>
                      <div className="text-stone-300">
                        Actual Historical Sales: <strong className="font-mono text-emerald-400">{item?.actual}</strong>
                      </div>
                      {item?.naive !== undefined && (
                        <div className="text-amber-300">
                          Naive Baseline: <span className="font-mono">{item.naive}</span>
                        </div>
                      )}
                      {item?.movingAvg !== undefined && (
                        <div className="text-blue-300">
                          3-Month Moving Avg: <span className="font-mono">{item.movingAvg}</span>
                        </div>
                      )}
                      {item?.expSmoothing !== undefined && (
                        <div className="text-purple-300">
                          Exp. Smoothing + Season: <span className="font-mono">{item.expSmoothing}</span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {/* Actual Sales */}
              <Line
                type="monotone"
                dataKey="actual"
                name="Historical Actual Sales"
                stroke="#15803d"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              {/* Naive Baseline */}
              <Line
                type="monotone"
                dataKey="naive"
                name="Naive Baseline"
                stroke="#d97706"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 4 }}
              />
              {/* Moving Average */}
              <Line
                type="monotone"
                dataKey="movingAvg"
                name="3-Month Moving Average"
                stroke="#0284c7"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ r: 4 }}
              />
              {/* Exponential Smoothing */}
              <Line
                type="monotone"
                dataKey="expSmoothing"
                name="Exponential Smoothing + Seasonal"
                stroke="#9333ea"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Benchmark Verdict Cards */}
      {forecastResults && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {forecastResults.evaluations.map((ev) => {
            const isWinner = ev.methodName === forecastResults.bestMethod;
            return (
              <div
                key={ev.methodName}
                className={`p-4 rounded-xl border ${
                  isWinner
                    ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
                } shadow-xs space-y-3 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                      {ev.methodName}
                    </h3>
                    {isWinner && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                        Lowest Error
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                    <div className="p-2.5 bg-stone-50 dark:bg-stone-800 rounded-lg">
                      <div className="text-[10px] text-stone-400">MAE (Mean Abs Error)</div>
                      <div className="text-sm font-bold font-mono text-stone-800 dark:text-stone-200 mt-0.5">
                        {ev.mae} units
                      </div>
                    </div>
                    <div className="p-2.5 bg-stone-50 dark:bg-stone-800 rounded-lg">
                      <div className="text-[10px] text-stone-400">MAPE (% Error)</div>
                      <div className="text-sm font-bold font-mono text-stone-800 dark:text-stone-200 mt-0.5">
                        {ev.mape}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 border-t border-stone-100 dark:border-stone-800 pt-2">
                  Next Month Projection: <strong className="font-mono text-stone-800 dark:text-stone-200">{ev.futurePredictions[0].predicted} units</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Model Verdict Explanation */}
      {forecastResults && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Better Method Verdict:</strong> {forecastResults.verdictReason}
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
            Automated benchmark
          </span>
        </div>
      )}

      {/* Table: Held-Out Months Actual vs. Forecast */}
      {forecastResults && (
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-200 dark:border-stone-800">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Held-Out Test Set: Predicted vs. Actual
            </h2>
            <p className="text-xs text-stone-500">
              Performance breakdown on Months 10, 11, and 12
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                  <th className="py-2.5 px-4 font-semibold">Held-Out Month</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actual Sales</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Naive Predicted</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Naive Error (%)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Moving Avg Predicted</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Moving Avg Error (%)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Exp Smoothing Predicted</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Exp Smoothing Error (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {[0, 1, 2].map((idx) => {
                  const m = forecastResults.evaluations[0].predictions[idx];
                  const naive = forecastResults.evaluations[0].predictions[idx];
                  const ma = forecastResults.evaluations[1].predictions[idx];
                  const es = forecastResults.evaluations[2].predictions[idx];

                  return (
                    <tr key={idx} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 font-mono">
                      <td className="py-2.5 px-4 font-medium text-stone-800 dark:text-stone-200 font-sans">
                        {m.month}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-stone-900 dark:text-stone-100">
                        {m.actual}
                      </td>
                      <td className="py-2.5 px-3 text-right text-stone-700 dark:text-stone-300">
                        {naive.predicted}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-600">
                        {naive.pctError}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-stone-700 dark:text-stone-300">
                        {ma.predicted}
                      </td>
                      <td className="py-2.5 px-3 text-right text-blue-600">
                        {ma.pctError}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-stone-700 dark:text-stone-300">
                        {es.predicted}
                      </td>
                      <td className="py-2.5 px-3 text-right text-purple-600">
                        {es.pctError}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
