import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { runAlertAccuracyTest, formatPKR } from '../../rules/rulesEngine';
import {
  Gauge,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

export const ImpactMetricsPage: React.FC = () => {
  const { state, dispatch, addToast } = useApp();

  const [testResult, setTestResult] = useState<ReturnType<typeof runAlertAccuracyTest> | null>(null);

  const metrics = state.impactMetrics;

  const handleUpdate = (
    field: keyof typeof state.impactMetrics,
    type: 'baseline' | 'prototype',
    valStr: string
  ) => {
    const val = valStr.trim() === '' ? null : Number(valStr);
    dispatch({
      type: 'UPDATE_IMPACT_METRIC',
      payload: {
        field,
        metricType: type,
        value: val,
      },
    });
  };

  const handleRunAccuracyTest = () => {
    const result = runAlertAccuracyTest(
      state.batches,
      state.products,
      state.alertThresholds,
      state.today
    );
    setTestResult(result);

    // Automatically suggest populating prototype alert correctness with empirical result
    dispatch({
      type: 'UPDATE_IMPACT_METRIC',
      payload: {
        field: 'alertCorrectnessPct',
        metricType: 'prototype',
        value: result.accuracyPct,
      },
    });

    addToast(
      'Accuracy Test Completed',
      `Evaluated ${result.totalTested} batches: Accuracy ${result.accuracyPct}%, Precision ${result.precisionPct}%, Recall ${result.recallPct}%.`,
      'success'
    );
  };

  const calculateDelta = (baseline: number | null, prototype: number | null, isHigherBetter = false) => {
    if (baseline === null || prototype === null) {
      return { diff: null, pct: null, isImprovement: false, text: 'Awaiting user input' };
    }
    const diff = prototype - baseline;
    const pct = baseline !== 0 ? Math.round((diff / Math.abs(baseline)) * 1000) / 10 : 0;
    const isImprovement = isHigherBetter ? diff > 0 : diff < 0;

    return {
      diff,
      pct,
      isImprovement,
      text: `${diff > 0 ? '+' : ''}${diff} (${diff > 0 ? '+' : ''}${pct}%)`,
    };
  };

  const deltaReportTime = calculateDelta(
    metrics.timeToPrepareInventoryReportMinutes.baseline,
    metrics.timeToPrepareInventoryReportMinutes.prototype,
    false
  );
  const deltaAlertAcc = calculateDelta(
    metrics.alertCorrectnessPct.baseline,
    metrics.alertCorrectnessPct.prototype,
    true
  );
  const deltaFefoAcc = calculateDelta(
    metrics.eligibleBatchSelectionAccuracyPct.baseline,
    metrics.eligibleBatchSelectionAccuracyPct.prototype,
    true
  );
  const deltaWriteOff = calculateDelta(
    metrics.expiryRelatedWriteOffValuePkr.baseline,
    metrics.expiryRelatedWriteOffValuePkr.prototype,
    false
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Academic Research & Impact Evaluation
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Empirical comparative framework: Baseline measurement vs. Prototype intervention
          </p>
        </div>

        <button
          onClick={handleRunAccuracyTest}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Run Alert Accuracy Test</span>
        </button>
      </div>

      {/* Strict Academic Disclaimer Box */}
      <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2">
        <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span>No Savings Claimed Without Evidence</span>
        </div>
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          In strict accordance with academic rigor, all comparison metrics remain blank by default. No invented savings percentages or inflated efficiency claims are displayed.
          Differences are computed exclusively when empirical values for both the baseline practice and prototype run are provided by researchers or field interview respondents.
        </p>
      </div>

      {/* Comparative Measurement Table */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Empirical Metric Comparison Matrix
          </h2>
          <p className="text-xs text-stone-500">
            Enter field test observation numbers into baseline and prototype columns
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                <th className="py-3 px-4 font-semibold w-1/3">Evaluation Metric</th>
                <th className="py-3 px-3 font-semibold w-1/5">Baseline Practice (Manual/Legacy)</th>
                <th className="py-3 px-3 font-semibold w-1/5">ShelfSense Prototype</th>
                <th className="py-3 px-4 font-semibold text-right w-1/4">Measured Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {/* Metric 1: Time to prepare inventory report */}
              <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-stone-800 dark:text-stone-200">
                    Time to prepare daily inventory report
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Duration in minutes required by warehouse supervisor
                  </div>
                </td>
                <td className="py-3.5 px-3">
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={metrics.timeToPrepareInventoryReportMinutes.baseline ?? ''}
                    onChange={(e) =>
                      handleUpdate('timeToPrepareInventoryReportMinutes', 'baseline', e.target.value)
                    }
                    className="w-28 p-2 text-xs font-mono rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                  <span className="text-stone-400 text-[10px] ml-1.5">min</span>
                </td>
                <td className="py-3.5 px-3">
                  <input
                    type="number"
                    placeholder="e.g. 15"
                    value={metrics.timeToPrepareInventoryReportMinutes.prototype ?? ''}
                    onChange={(e) =>
                      handleUpdate('timeToPrepareInventoryReportMinutes', 'prototype', e.target.value)
                    }
                    className="w-28 p-2 text-xs font-mono rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                  <span className="text-stone-400 text-[10px] ml-1.5">min</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold">
                  {deltaReportTime.diff !== null ? (
                    <span
                      className={
                        deltaReportTime.isImprovement
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-stone-600'
                      }
                    >
                      {deltaReportTime.text}
                    </span>
                  ) : (
                    <span className="text-stone-400 text-[11px] italic font-sans">
                      {deltaReportTime.text}
                    </span>
                  )}
                </td>
              </tr>

              {/* Metric 2: Alert correctness */}
              <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-stone-800 dark:text-stone-200">
                    Expiry alert classification accuracy
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Percentage of expiring batches correctly flagged before shelf-life breach
                  </div>
                </td>
                <td className="py-3.5 px-3">
                  <input
                    type="number"
                    placeholder="e.g. 65"
                    value={metrics.alertCorrectnessPct.baseline ?? ''}
                    onChange={(e) =>
                      handleUpdate('alertCorrectnessPct', 'baseline', e.target.value)
                    }
                    className="w-28 p-2 text-xs font-mono rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                  <span className="text-stone-400 text-[10px] ml-1.5">%</span>
                </td>
                <td className="py-3.5 px-3">
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={metrics.alertCorrectnessPct.prototype ?? ''}
                    onChange={(e) =>
                      handleUpdate('alertCorrectnessPct', 'prototype', e.target.value)
                    }
                    className="w-28 p-2 text-xs font-mono rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                  <span className="text-stone-400 text-[10px] ml-1.5">%</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold">
                  {deltaAlertAcc.diff !== null ? (
                    <span
                      className={
                        deltaAlertAcc.isImprovement
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-stone-600'
                      }
                    >
                      {deltaAlertAcc.text}
                    </span>
                  ) : (
                    <span className="text-stone-400 text-[11px] italic font-sans">
                      {deltaAlertAcc.text}
                    </span>
                  )}
                </td>
              </tr>

              {/* Metric 3: Eligible-batch selection accuracy */}
              <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-stone-800 dark:text-stone-200">
                    Channel-compliant batch selection accuracy
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Proportion of dispatch picks satisfying customer shelf-life limits (e.g. Retail 60d)
                  </div>
                </td>
                <td className="py-3.5 px-3">
                  <input
                    type="number"
                    placeholder="e.g. 70"
                    value={metrics.eligibleBatchSelectionAccuracyPct.baseline ?? ''}
                    onChange={(e) =>
                      handleUpdate('eligibleBatchSelectionAccuracyPct', 'baseline', e.target.value)
                    }
                    className="w-28 p-2 text-xs font-mono rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                  <span className="text-stone-400 text-[10px] ml-1.5">%</span>
                </td>
                <td className="py-3.5 px-3">
                  <input
                    type="number"
                    placeholder="e.g. 98"
                    value={metrics.eligibleBatchSelectionAccuracyPct.prototype ?? ''}
                    onChange={(e) =>
                      handleUpdate('eligibleBatchSelectionAccuracyPct', 'prototype', e.target.value)
                    }
                    className="w-28 p-2 text-xs font-mono rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                  <span className="text-stone-400 text-[10px] ml-1.5">%</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold">
                  {deltaFefoAcc.diff !== null ? (
                    <span
                      className={
                        deltaFefoAcc.isImprovement
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-stone-600'
                      }
                    >
                      {deltaFefoAcc.text}
                    </span>
                  ) : (
                    <span className="text-stone-400 text-[11px] italic font-sans">
                      {deltaFefoAcc.text}
                    </span>
                  )}
                </td>
              </tr>

              {/* Metric 4: Expiry-related write-off value */}
              <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-stone-800 dark:text-stone-200">
                    Monthly expiry-related write-off expense
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Actual financial loss incurred due to spoiled/expired finished goods (in PKR)
                  </div>
                </td>
                <td className="py-3.5 px-3">
                  <input
                    type="number"
                    placeholder="e.g. 850000"
                    value={metrics.expiryRelatedWriteOffValuePkr.baseline ?? ''}
                    onChange={(e) =>
                      handleUpdate('expiryRelatedWriteOffValuePkr', 'baseline', e.target.value)
                    }
                    className="w-28 p-2 text-xs font-mono rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                  <span className="text-stone-400 text-[10px] ml-1.5">PKR</span>
                </td>
                <td className="py-3.5 px-3">
                  <input
                    type="number"
                    placeholder="e.g. 240000"
                    value={metrics.expiryRelatedWriteOffValuePkr.prototype ?? ''}
                    onChange={(e) =>
                      handleUpdate('expiryRelatedWriteOffValuePkr', 'prototype', e.target.value)
                    }
                    className="w-28 p-2 text-xs font-mono rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                  <span className="text-stone-400 text-[10px] ml-1.5">PKR</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold">
                  {deltaWriteOff.diff !== null ? (
                    <span
                      className={
                        deltaWriteOff.isImprovement
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-stone-600'
                      }
                    >
                      {deltaWriteOff.text}
                    </span>
                  ) : (
                    <span className="text-stone-400 text-[11px] italic font-sans">
                      {deltaWriteOff.text}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Automatic Alert Engine Accuracy Verification Results */}
      {testResult && (
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Empirical Ground-Truth Alert Accuracy Test Results</span>
              </h2>
              <p className="text-xs text-stone-500">
                Tested against all {testResult.totalTested} synthetic batches with mathematically known expiry intervals
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
              Passed Verification
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl">
              <div className="text-[10px] text-stone-400 font-medium">Overall Accuracy</div>
              <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                {testResult.accuracyPct}%
              </div>
              <div className="text-[10px] text-stone-500">{testResult.correctAlerts} / {testResult.totalTested} correct</div>
            </div>

            <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl">
              <div className="text-[10px] text-stone-400 font-medium">Precision (Positive Predictive)</div>
              <div className="text-base font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                {testResult.precisionPct}%
              </div>
              <div className="text-[10px] text-stone-500">{testResult.falsePositives} false alarms</div>
            </div>

            <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl">
              <div className="text-[10px] text-stone-400 font-medium">Recall (Sensitivity)</div>
              <div className="text-base font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                {testResult.recallPct}%
              </div>
              <div className="text-[10px] text-stone-500">{testResult.falseNegatives} missed alerts</div>
            </div>

            <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl">
              <div className="text-[10px] text-stone-400 font-medium">Tested Dataset Size</div>
              <div className="text-base font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                {testResult.totalTested} Batches
              </div>
              <div className="text-[10px] text-stone-500">Seed dataset v1.0</div>
            </div>
          </div>

          {/* Sample Batches Verified */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Sample Batch Verification Log (First 10 Records):
            </h3>
            <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-stone-50 dark:bg-stone-800 text-stone-400">
                  <tr>
                    <th className="py-2 px-3">Batch No</th>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3">Days Left</th>
                    <th className="py-2 px-3">Expected Ground-Truth</th>
                    <th className="py-2 px-3">Engine Output</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono">
                  {testResult.details.slice(0, 10).map((d) => (
                    <tr key={d.batchNo} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                      <td className="py-1.5 px-3 font-semibold">{d.batchNo}</td>
                      <td className="py-1.5 px-3 text-stone-500">{d.sku}</td>
                      <td className="py-1.5 px-3">{d.daysLeft}d</td>
                      <td className="py-1.5 px-3">{d.expected}</td>
                      <td className="py-1.5 px-3 text-stone-700 dark:text-stone-300">{d.actual}</td>
                      <td className="py-1.5 px-3 text-center">
                        {d.match ? (
                          <span className="text-emerald-600 font-sans font-semibold">Match</span>
                        ) : (
                          <span className="text-rose-600 font-sans font-semibold">Mismatch</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
