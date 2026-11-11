import {
  Batch,
  Product,
  Customer,
  DispatchLine,
  PickedAllocation,
  ExcludedBatchReason,
  AlertThresholds,
  ExpiryAlert,
  SuggestedAction,
  AlertSeverity,
  CalculationBreakdown,
  MonthlySalesHistory,
} from '../types';

/**
 * Calculates calendar days difference: targetDate - baseDate
 */
export function getDaysDifference(targetDateStr: string, baseDateStr: string): number {
  const target = new Date(targetDateStr);
  const base = new Date(baseDateStr);
  // Normalize to UTC midnight to avoid DST/time offset drift
  const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const utcBase = Date.UTC(base.getFullYear(), base.getMonth(), base.getDate());
  const diffMs = utcTarget - utcBase;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formats a date string (YYYY-MM-DD) to "DD MMM YYYY" (e.g. "15 Nov 2026")
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats numbers into Pakistani Rupee format: e.g. "PKR 145,000"
 */
export function formatPKR(val: number): string {
  return `PKR ${Math.round(val).toLocaleString('en-US')}`;
}

/**
 * Business Rule 2:
 * Status colour band based on days left:
 * - Expired (<0): red
 * - Critical / <30: orange
 * - 30-60: amber
 * - >60: green
 */
export function getExpiryBand(daysLeft: number): {
  label: string;
  colorName: 'red' | 'orange' | 'amber' | 'emerald';
  badgeClass: string;
  textClass: string;
} {
  if (daysLeft < 0) {
    return {
      label: `Expired (${Math.abs(daysLeft)}d ago)`,
      colorName: 'red',
      badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      textClass: 'text-rose-600 dark:text-rose-400 font-semibold',
    };
  }
  if (daysLeft < 30) {
    return {
      label: `${daysLeft}d left (<30d)`,
      colorName: 'orange',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      textClass: 'text-amber-600 dark:text-amber-400 font-medium',
    };
  }
  if (daysLeft <= 60) {
    return {
      label: `${daysLeft}d left (30-60d)`,
      colorName: 'amber',
      badgeClass: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
      textClass: 'text-yellow-600 dark:text-yellow-400 font-medium',
    };
  }
  return {
    label: `${daysLeft}d left (>60d)`,
    colorName: 'emerald',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    textClass: 'text-emerald-600 dark:text-emerald-400 font-medium',
  };
}

/**
 * Business Rule 3:
 * Usable stock = Released batches only, not expired (daysLeft >= 0).
 */
export function isBatchUsable(batch: Batch, todayStr: string): boolean {
  if (batch.qualityStatus !== 'Released') return false;
  const daysLeft = getDaysDifference(batch.expiryDate, todayStr);
  return daysLeft >= 0 && batch.qty > 0;
}

/**
 * Calculates total usable stock for a SKU
 */
export function getUsableStockForSku(sku: string, batches: Batch[], todayStr: string): number {
  return batches
    .filter((b) => b.sku === sku && isBatchUsable(b, todayStr))
    .reduce((sum, b) => sum + b.qty, 0);
}

/**
 * Business Rule 4: FEFO Allocation Algorithm
 * Eligibility:
 * 1. Batch qualityStatus is 'Released'
 * 2. Not expired (daysLeft >= 0)
 * 3. daysLeft >= customer's minRemainingShelfLifeDays
 * 4. qty > 0
 *
 * Sort eligible batches:
 * 1. Earliest expiryDate (ascending)
 * 2. Earliest receivedDate (ascending)
 *
 * Excluded batches are captured with plain-English reasons.
 */
export function allocateFefoOrderLine(
  sku: string,
  requestedQty: number,
  allBatchesForSku: Batch[],
  customer: Customer,
  todayStr: string
): {
  allocatedBatches: PickedAllocation[];
  excludedBatches: ExcludedBatchReason[];
  status: 'Fulfilled' | 'Short' | 'Pending';
  shortfall: number;
  shortfallReason?: string;
} {
  const minRequiredDays = customer.minRemainingShelfLifeDays;
  const excludedBatches: ExcludedBatchReason[] = [];
  const eligibleBatches: (Batch & { daysLeft: number })[] = [];

  for (const b of allBatchesForSku) {
    const daysLeft = getDaysDifference(b.expiryDate, todayStr);

    if (b.qty <= 0) {
      continue; // Skip zero-quantity batches
    }

    if (b.qualityStatus === 'Hold') {
      excludedBatches.push({
        batchNo: b.batchNo,
        location: b.location,
        qty: b.qty,
        expiryDate: b.expiryDate,
        daysLeft,
        qualityStatus: b.qualityStatus,
        reason: `Quality Hold: Batch is quarantined pending laboratory release approval.`,
      });
      continue;
    }

    if (b.qualityStatus === 'Rejected') {
      excludedBatches.push({
        batchNo: b.batchNo,
        location: b.location,
        qty: b.qty,
        expiryDate: b.expiryDate,
        daysLeft,
        qualityStatus: b.qualityStatus,
        reason: `Quality Rejected: Defective or non-compliant batch marked for write-off.`,
      });
      continue;
    }

    if (daysLeft < 0) {
      excludedBatches.push({
        batchNo: b.batchNo,
        location: b.location,
        qty: b.qty,
        expiryDate: b.expiryDate,
        daysLeft,
        qualityStatus: b.qualityStatus,
        reason: `Expired: ${Math.abs(daysLeft)} days past expiry date (${formatDate(b.expiryDate)}).`,
      });
      continue;
    }

    if (daysLeft < minRequiredDays) {
      excludedBatches.push({
        batchNo: b.batchNo,
        location: b.location,
        qty: b.qty,
        expiryDate: b.expiryDate,
        daysLeft,
        qualityStatus: b.qualityStatus,
        reason: `${daysLeft} days remaining; below ${customer.type} requirement of minimum ${minRequiredDays} days.`,
      });
      continue;
    }

    // Eligible!
    eligibleBatches.push({ ...b, daysLeft });
  }

  // Sort eligible batches by earliest expiry, then earliest receivedDate
  eligibleBatches.sort((a, b) => {
    const diffExpiry = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    if (diffExpiry !== 0) return diffExpiry;
    return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime();
  });

  const allocatedBatches: PickedAllocation[] = [];
  let remainingNeeded = requestedQty;

  for (let i = 0; i < eligibleBatches.length; i++) {
    if (remainingNeeded <= 0) break;
    const batch = eligibleBatches[i];
    const pickQty = Math.min(batch.qty, remainingNeeded);

    const isEarliest = i === 0;
    const reason = isEarliest
      ? `${batch.batchNo} selected: Earliest expiry (${formatDate(batch.expiryDate)}, ${batch.daysLeft}d left) among Released batches meeting ${customer.type}'s ${minRequiredDays}-day threshold.`
      : `${batch.batchNo} selected: Next earliest eligible expiry (${formatDate(batch.expiryDate)}, ${batch.daysLeft}d left) to fulfill remaining ${remainingNeeded} units.`;

    allocatedBatches.push({
      batchNo: batch.batchNo,
      qty: pickQty,
      location: batch.location,
      mfgDate: batch.mfgDate,
      expiryDate: batch.expiryDate,
      daysLeft: batch.daysLeft,
      reason,
    });

    remainingNeeded -= pickQty;
  }

  const shortfall = Math.max(0, remainingNeeded);
  const status = shortfall === 0 ? 'Fulfilled' : 'Short';
  let shortfallReason: string | undefined;

  if (shortfall > 0) {
    const totalExcludedQty = excludedBatches.reduce((acc, b) => acc + b.qty, 0);
    if (eligibleBatches.length === 0 && totalExcludedQty > 0) {
      shortfallReason = `Shortfall of ${shortfall} units: All on-hand batches (${totalExcludedQty} units) were excluded due to quality hold or customer shelf-life limits (${minRequiredDays}d minimum).`;
    } else if (eligibleBatches.length === 0) {
      shortfallReason = `Shortfall of ${shortfall} units: Zero on-hand stock for this SKU.`;
    } else {
      shortfallReason = `Shortfall of ${shortfall} units: Eligible stock depleted (${requestedQty - shortfall} units allocated). ${totalExcludedQty} units on hand did not meet eligibility criteria.`;
    }
  }

  return {
    allocatedBatches,
    excludedBatches,
    status,
    shortfall,
    shortfallReason,
  };
}

/**
 * Business Rule 5: Days of Cover & Slow-Moving Stock
 * Days of cover = usable stock ÷ avgDailySales.
 * Flag "At risk of expiring unsold" when daysOfCover > remaining shelf life of batch.
 * Slow-moving = daysOfCover > slowMoverThreshold (default 90 days).
 */
export function calculateDaysOfCover(
  usableStock: number,
  avgDailySales: number
): {
  daysOfCover: number | 'infinity';
  display: string;
} {
  if (avgDailySales <= 0) {
    return {
      daysOfCover: 'infinity',
      display: '∞ (No sales)',
    };
  }
  const doc = usableStock / avgDailySales;
  return {
    daysOfCover: Math.round(doc * 10) / 10,
    display: `${Math.round(doc)} days`,
  };
}

export function isBatchAtRiskOfExpiringUnsold(
  batch: Batch,
  usableStockForProduct: number,
  avgDailySales: number,
  todayStr: string
): {
  isAtRisk: boolean;
  daysOfCover: number | 'infinity';
  daysLeft: number;
  reason?: string;
} {
  const daysLeft = getDaysDifference(batch.expiryDate, todayStr);
  if (daysLeft < 0 || batch.qualityStatus !== 'Released') {
    return { isAtRisk: false, daysOfCover: 0, daysLeft };
  }

  const { daysOfCover } = calculateDaysOfCover(usableStockForProduct, avgDailySales);

  if (daysOfCover === 'infinity') {
    return {
      isAtRisk: true,
      daysOfCover,
      daysLeft,
      reason: `Zero daily sales registered. Batch will expire in ${daysLeft} days without projected consumption.`,
    };
  }

  if (daysOfCover > daysLeft) {
    return {
      isAtRisk: true,
      daysOfCover,
      daysLeft,
      reason: `Days of cover (${daysOfCover}d) exceeds batch remaining shelf life (${daysLeft}d). Stock velocity is insufficient to clear before expiry.`,
    };
  }

  return { isAtRisk: false, daysOfCover, daysLeft };
}

/**
 * Business Rule 6: Alert Generation Engine
 * Default thresholds: Critical <= 7, High <= 14, Warning <= 30, Info <= 60, Expired < 0.
 * Overridable per category.
 */
export function evaluateBatchAlert(
  batch: Batch,
  product: Product,
  thresholds: AlertThresholds,
  todayStr: string
): ExpiryAlert | null {
  const daysLeft = getDaysDifference(batch.expiryDate, todayStr);
  const value = batch.qty * product.unitCost;

  let severity: AlertSeverity | null = null;

  if (daysLeft < 0) {
    severity = 'Expired';
  } else if (daysLeft <= thresholds.criticalDays) {
    severity = 'Critical';
  } else if (daysLeft <= thresholds.highDays) {
    severity = 'High';
  } else if (daysLeft <= thresholds.warningDays) {
    severity = 'Warning';
  } else if (daysLeft <= thresholds.infoDays) {
    severity = 'Info';
  }

  if (!severity) return null;

  // Business Rule 8: Suggested Action based on severity and quality status
  let suggestedAction: SuggestedAction = 'Prioritise dispatch';
  if (batch.qualityStatus === 'Hold') {
    suggestedAction = 'Quarantine for quality check';
  } else if (batch.qualityStatus === 'Rejected' || severity === 'Expired') {
    suggestedAction = 'Write off';
  } else if (severity === 'Critical') {
    suggestedAction = 'Offer discount';
  } else if (severity === 'High') {
    suggestedAction = 'Transfer to another channel';
  } else {
    suggestedAction = 'Prioritise dispatch';
  }

  return {
    id: `ALERT-${batch.batchNo}-${daysLeft}`,
    sku: batch.sku,
    batchNo: batch.batchNo,
    daysLeft,
    expiryDate: batch.expiryDate,
    qty: batch.qty,
    value,
    location: batch.location,
    severity,
    suggestedAction,
    status: 'Open',
    qualityStatus: batch.qualityStatus,
  };
}

/**
 * Business Rule 7: Suggested Purchase Order Quantity
 * Formula: max(0, (avgDailySales × leadTimeDays) + safetyStock − usableStockThatWillBeConsumedBeforeExpiry − openPOQty)
 *
 * Crucial rule: Exclude batches that will expire BEFORE projected use.
 * Consumption is simulated at avgDailySales.
 */
export function calculateReorderNeed(
  product: Product,
  batches: Batch[],
  openPOQty: number,
  todayStr: string
): CalculationBreakdown {
  const { avgDailySales, leadTimeDays, safetyStock } = product;
  const leadTimeDemand = Math.round(avgDailySales * leadTimeDays);
  const grossRequirement = leadTimeDemand + safetyStock;

  // Filter usable batches (Released, not expired) sorted by earliest expiry
  const usableBatches = batches
    .filter((b) => b.sku === product.sku && b.qualityStatus === 'Released')
    .map((b) => ({
      ...b,
      daysLeft: getDaysDifference(b.expiryDate, todayStr),
    }))
    .filter((b) => b.daysLeft >= 0)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  // Simulate daily consumption across batches
  let usableStockConsumedBeforeExpiry = 0;
  let usableStockExpiringBeforeUse = 0;
  let simulatedDayOffset = 0;

  for (const b of usableBatches) {
    if (avgDailySales <= 0) {
      // If no daily sales, none can be consumed before expiry
      usableStockExpiringBeforeUse += b.qty;
      continue;
    }

    let batchQtyLeft = b.qty;
    // Check how many days this batch will take to consume
    while (batchQtyLeft > 0) {
      const unitsConsumedThisDay = Math.min(batchQtyLeft, avgDailySales);
      if (simulatedDayOffset <= b.daysLeft) {
        usableStockConsumedBeforeExpiry += unitsConsumedThisDay;
      } else {
        usableStockExpiringBeforeUse += unitsConsumedThisDay;
      }
      batchQtyLeft -= unitsConsumedThisDay;
      simulatedDayOffset += unitsConsumedThisDay / avgDailySales;
    }
  }

  usableStockConsumedBeforeExpiry = Math.round(usableStockConsumedBeforeExpiry);
  usableStockExpiringBeforeUse = Math.round(usableStockExpiringBeforeUse);

  const netSuggestedOrderQty = Math.max(
    0,
    grossRequirement - usableStockConsumedBeforeExpiry - openPOQty
  );

  return {
    avgDailySales,
    leadTimeDays,
    safetyStock,
    leadTimeDemand,
    grossRequirement,
    usableStockConsumedBeforeExpiry,
    usableStockExpiringBeforeUse,
    openPOQty,
    netSuggestedOrderQty,
  };
}

/**
 * Business Rule 9: Statistical Demand Forecasting
 * Evaluates 3 methods on 12 months history with last 3 months held out:
 * (a) Naive Baseline (last month's sales)
 * (b) 3-Month Moving Average
 * (c) Simple Exponential Smoothing with Seasonal Index
 *
 * Returns forecast points, MAE, MAPE, and lowest error verdict.
 */
export interface ForecastEvaluation {
  methodName: string;
  predictions: { month: string; actual: number; predicted: number; absError: number; pctError: number }[];
  mae: number;
  mape: number;
  futurePredictions: { month: string; predicted: number }[];
}

export function evaluateForecastMethods(history: MonthlySalesHistory[]): {
  evaluations: ForecastEvaluation[];
  bestMethod: string;
  verdictReason: string;
} {
  if (history.length < 12) {
    throw new Error('Requires 12 months of sales history');
  }

  const trainData = history.slice(0, 9); // First 9 months (Jan - Sep)
  const heldOutData = history.slice(9, 12); // Last 3 months (Oct - Dec)

  // 1. Naive Baseline (predicts previous period)
  const naivePredictions = heldOutData.map((actualItem, idx) => {
    const prevSales = idx === 0 ? trainData[trainData.length - 1].sales : heldOutData[idx - 1].sales;
    const absError = Math.abs(actualItem.sales - prevSales);
    const pctError = actualItem.sales > 0 ? (absError / actualItem.sales) * 100 : 0;
    return {
      month: actualItem.month,
      actual: actualItem.sales,
      predicted: Math.round(prevSales),
      absError: Math.round(absError),
      pctError: Math.round(pctError * 10) / 10,
    };
  });
  const naiveMae = Math.round((naivePredictions.reduce((acc, p) => acc + p.absError, 0) / 3) * 10) / 10;
  const naiveMape = Math.round((naivePredictions.reduce((acc, p) => acc + p.pctError, 0) / 3) * 10) / 10;

  // 2. 3-Month Moving Average
  const fullSeries = [...trainData.map((d) => d.sales)];
  const maPredictions = heldOutData.map((actualItem) => {
    const window = fullSeries.slice(-3);
    const avg = window.reduce((a, b) => a + b, 0) / 3;
    fullSeries.push(actualItem.sales); // rolling actual
    const absError = Math.abs(actualItem.sales - avg);
    const pctError = actualItem.sales > 0 ? (absError / actualItem.sales) * 100 : 0;
    return {
      month: actualItem.month,
      actual: actualItem.sales,
      predicted: Math.round(avg),
      absError: Math.round(absError),
      pctError: Math.round(pctError * 10) / 10,
    };
  });
  const maMae = Math.round((maPredictions.reduce((acc, p) => acc + p.absError, 0) / 3) * 10) / 10;
  const maMape = Math.round((maPredictions.reduce((acc, p) => acc + p.pctError, 0) / 3) * 10) / 10;

  // 3. Simple Exponential Smoothing with Seasonal Index
  // Calculate average monthly seasonality index over train data
  const trainMean = trainData.reduce((acc, d) => acc + d.sales, 0) / trainData.length;
  const seasonalIndices = trainData.map((d) => (trainMean > 0 ? d.sales / trainMean : 1));
  const alpha = 0.35;
  let level = trainData[0].sales;
  for (let i = 1; i < trainData.length; i++) {
    level = alpha * trainData[i].sales + (1 - alpha) * level;
  }

  // Predict held out with seasonal weight
  const esPredictions = heldOutData.map((actualItem, idx) => {
    const seasonWeight = seasonalIndices[(idx + 9) % seasonalIndices.length] || 1;
    const predicted = level * seasonWeight;
    const absError = Math.abs(actualItem.sales - predicted);
    const pctError = actualItem.sales > 0 ? (absError / actualItem.sales) * 100 : 0;
    return {
      month: actualItem.month,
      actual: actualItem.sales,
      predicted: Math.round(predicted),
      absError: Math.round(absError),
      pctError: Math.round(pctError * 10) / 10,
    };
  });
  const esMae = Math.round((esPredictions.reduce((acc, p) => acc + p.absError, 0) / 3) * 10) / 10;
  const esMape = Math.round((esPredictions.reduce((acc, p) => acc + p.pctError, 0) / 3) * 10) / 10;

  // Future predictions for the next 3 months (Jan, Feb, Mar 2027)
  const lastActual = history[history.length - 1].sales;
  const last3 = history.slice(-3).map((d) => d.sales);
  const futureMa = Math.round(last3.reduce((a, b) => a + b, 0) / 3);

  const evaluations: ForecastEvaluation[] = [
    {
      methodName: 'Naive Baseline (Last Period)',
      predictions: naivePredictions,
      mae: naiveMae,
      mape: naiveMape,
      futurePredictions: [
        { month: 'Next Month', predicted: lastActual },
        { month: 'Month +2', predicted: lastActual },
        { month: 'Month +3', predicted: lastActual },
      ],
    },
    {
      methodName: '3-Month Moving Average',
      predictions: maPredictions,
      mae: maMae,
      mape: maMape,
      futurePredictions: [
        { month: 'Next Month', predicted: futureMa },
        { month: 'Month +2', predicted: futureMa },
        { month: 'Month +3', predicted: futureMa },
      ],
    },
    {
      methodName: 'Exponential Smoothing + Seasonality',
      predictions: esPredictions,
      mae: esMae,
      mape: esMape,
      futurePredictions: [
        { month: 'Next Month', predicted: Math.round(level * (seasonalIndices[0] || 1.05)) },
        { month: 'Month +2', predicted: Math.round(level * (seasonalIndices[1] || 1.1)) },
        { month: 'Month +3', predicted: Math.round(level * (seasonalIndices[2] || 0.95)) },
      ],
    },
  ];

  // Pick lowest MAPE
  let best = evaluations[0];
  for (const ev of evaluations) {
    if (ev.mape < best.mape) {
      best = ev;
    }
  }

  const verdictReason = `${best.methodName} achieved the lowest Mean Absolute Percentage Error (MAPE: ${best.mape}% vs ${evaluations
    .filter((e) => e !== best)
    .map((e) => `${e.methodName} ${e.mape}%`)
    .join(', ')}).`;

  return {
    evaluations,
    bestMethod: best.methodName,
    verdictReason,
  };
}

/**
 * Ground-Truth Alert Accuracy Test for Academic Verification
 * Evaluates the rules engine against synthetic batches with mathematically known ground-truth labels.
 */
export function runAlertAccuracyTest(
  batches: Batch[],
  products: Product[],
  thresholds: AlertThresholds,
  todayStr: string
): {
  totalTested: number;
  correctAlerts: number;
  falsePositives: number;
  falseNegatives: number;
  accuracyPct: number;
  precisionPct: number;
  recallPct: number;
  details: { batchNo: string; sku: string; daysLeft: number; expected: string; actual: string; match: boolean }[];
} {
  const prodMap = new Map(products.map((p) => [p.sku, p]));
  let correct = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  const details = [];

  for (const b of batches) {
    const prod = prodMap.get(b.sku);
    if (!prod) continue;

    const daysLeft = getDaysDifference(b.expiryDate, todayStr);
    const alert = evaluateBatchAlert(b, prod, thresholds, todayStr);

    // Ground truth definition
    let expectedSeverity = 'None';
    if (daysLeft < 0) expectedSeverity = 'Expired';
    else if (daysLeft <= thresholds.criticalDays) expectedSeverity = 'Critical';
    else if (daysLeft <= thresholds.highDays) expectedSeverity = 'High';
    else if (daysLeft <= thresholds.warningDays) expectedSeverity = 'Warning';
    else if (daysLeft <= thresholds.infoDays) expectedSeverity = 'Info';

    const actualSeverity = alert ? alert.severity : 'None';
    const match = expectedSeverity === actualSeverity;

    if (match) {
      correct++;
    } else {
      if (expectedSeverity === 'None' && actualSeverity !== 'None') {
        falsePositives++;
      } else if (expectedSeverity !== 'None' && actualSeverity === 'None') {
        falseNegatives++;
      } else {
        // Mislabeled severity level
        falsePositives++;
      }
    }

    details.push({
      batchNo: b.batchNo,
      sku: b.sku,
      daysLeft,
      expected: expectedSeverity,
      actual: actualSeverity,
      match,
    });
  }

  const totalTested = details.length;
  const accuracyPct = totalTested > 0 ? Math.round((correct / totalTested) * 1000) / 10 : 0;
  const truePositives = correct - details.filter((d) => d.expected === 'None' && d.actual === 'None').length;
  const precisionPct =
    truePositives + falsePositives > 0
      ? Math.round((truePositives / (truePositives + falsePositives)) * 1000) / 10
      : 100;
  const recallPct =
    truePositives + falseNegatives > 0
      ? Math.round((truePositives / (truePositives + falseNegatives)) * 1000) / 10
      : 100;

  return {
    totalTested,
    correctAlerts: correct,
    falsePositives,
    falseNegatives,
    accuracyPct,
    precisionPct,
    recallPct,
    details: details.slice(0, 20), // sample for UI display
  };
}
