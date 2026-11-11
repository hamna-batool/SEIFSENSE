import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Customer,
  Order,
  DispatchLine,
  PickedAllocation,
  ExcludedBatchReason,
  OverrideLog,
} from '../../types';
import {
  allocateFefoOrderLine,
  formatDate,
  formatPKR,
  getDaysDifference,
} from '../../rules/rulesEngine';
import { generatePickListPdf, PickListPdfData } from '../../utils/pdfGenerator';
import {
  Truck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  Boxes,
  HelpCircle,
  Printer,
  FileDown,
} from 'lucide-react';

interface OrderLineInput {
  id: string;
  sku: string;
  requestedQty: number;
}

export const FefoDispatchPage: React.FC = () => {
  const { state, dispatch, addToast, setActivePage } = useApp();

  // Active Customer Selection (Defaults to Metro Cash & Carry, Retail chain 60d limit)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    state.customers[0]?.id || ''
  );

  // Dynamic order line items
  const [lines, setLines] = useState<OrderLineInput[]>([
    {
      id: 'LINE-INIT-1',
      sku: 'SKU-BIS-001', // Sooper Classic (has 3 batches with different expiries)
      requestedQty: 100,
    },
    {
      id: 'LINE-INIT-2',
      sku: 'SKU-WAF-001', // Cocomo (has multiple batches)
      requestedQty: 120,
    },
  ]);

  // Override State: tracks manual overrides per line
  // { [lineId]: { batchNo: string; reason: string } }
  const [manualOverrides, setManualOverrides] = useState<
    Record<string, { batchNo: string; reason: string }>
  >({});

  // Collapsible toggle for excluded batches per line
  const [expandedExclusions, setExpandedExclusions] = useState<Record<string, boolean>>({});

  // Override dialog state
  const [overrideModal, setOverrideModal] = useState<{
    lineId: string;
    sku: string;
    originalBatchNo: string;
    availableBatches: { batchNo: string; location: string; qty: number; expiryDate: string; daysLeft: number }[];
  } | null>(null);
  const [selectedOverrideBatch, setSelectedOverrideBatch] = useState<string>('');
  const [overrideReasonInput, setOverrideReasonInput] = useState<string>('');

  const selectedCustomer = useMemo(
    () => state.customers.find((c) => c.id === selectedCustomerId) || state.customers[0],
    [selectedCustomerId, state.customers]
  );

  const prodMap = useMemo(() => new Map(state.products.map((p) => [p.sku, p])), [state.products]);

  // Compute FEFO Allocations for each line
  const fefoPlan = useMemo(() => {
    if (!selectedCustomer) return [];

    return lines.map((line) => {
      const prod = prodMap.get(line.sku);
      const allBatches = state.batches.filter((b) => b.sku === line.sku);

      // Run pure FEFO algorithm
      const allocationResult = allocateFefoOrderLine(
        line.sku,
        line.requestedQty,
        allBatches,
        selectedCustomer,
        state.today
      );

      // Check if user manually overrode this line's batch
      const override = manualOverrides[line.id];
      let finalAllocations: PickedAllocation[] = [...allocationResult.allocatedBatches];

      if (override) {
        const targetBatch = allBatches.find((b) => b.batchNo === override.batchNo);
        if (targetBatch) {
          const daysLeft = getDaysDifference(targetBatch.expiryDate, state.today);
          finalAllocations = [
            {
              batchNo: targetBatch.batchNo,
              qty: Math.min(targetBatch.qty, line.requestedQty),
              location: targetBatch.location,
              mfgDate: targetBatch.mfgDate,
              expiryDate: targetBatch.expiryDate,
              daysLeft,
              reason: `Manual Override Applied: ${override.reason}`,
              isOverride: true,
              overrideReason: override.reason,
            },
          ];
        }
      }

      return {
        lineId: line.id,
        sku: line.sku,
        requestedQty: line.requestedQty,
        product: prod,
        allocatedBatches: finalAllocations,
        excludedBatches: allocationResult.excludedBatches,
        status: allocationResult.status,
        shortfall: allocationResult.shortfall,
        shortfallReason: allocationResult.shortfallReason,
        isOverridden: !!override,
      };
    });
  }, [lines, selectedCustomer, state.batches, state.today, manualOverrides, prodMap]);

  // Order Totals
  const orderTotalQty = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.requestedQty) || 0), 0),
    [lines]
  );
  const orderTotalValue = useMemo(() => {
    return lines.reduce((sum, l) => {
      const prod = prodMap.get(l.sku);
      return sum + (Number(l.requestedQty) || 0) * (prod ? prod.unitPrice : 0);
    }, 0);
  }, [lines, prodMap]);

  // Add line
  const handleAddLine = () => {
    const availableSkus = state.products.filter(
      (p) => !lines.some((l) => l.sku === p.sku) && p.category !== 'Ingredients' && p.category !== 'Packaging'
    );
    const nextSku = availableSkus[0]?.sku || state.products[0]?.sku;
    setLines([...lines, { id: `LINE-${Date.now()}`, sku: nextSku, requestedQty: 50 }]);
  };

  // Remove line
  const handleRemoveLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
    const newOverrides = { ...manualOverrides };
    delete newOverrides[id];
    setManualOverrides(newOverrides);
  };

  // Update line SKU or Qty
  const handleUpdateLine = (id: string, field: 'sku' | 'requestedQty', value: any) => {
    setLines(
      lines.map((l) => {
        if (l.id !== id) return l;
        return { ...l, [field]: value };
      })
    );
    // Clear override if SKU changed
    if (field === 'sku') {
      const newOverrides = { ...manualOverrides };
      delete newOverrides[id];
      setManualOverrides(newOverrides);
    }
  };

  // Open override modal
  const handleOpenOverride = (lineId: string, sku: string, originalBatchNo: string) => {
    const candidateBatches = state.batches
      .filter((b) => b.sku === sku && b.qualityStatus === 'Released' && b.qty > 0)
      .map((b) => ({
        batchNo: b.batchNo,
        location: b.location,
        qty: b.qty,
        expiryDate: b.expiryDate,
        daysLeft: getDaysDifference(b.expiryDate, state.today),
      }))
      .filter((b) => b.batchNo !== originalBatchNo);

    if (candidateBatches.length === 0) {
      addToast('No Alternative Batches', 'There are no other active released batches available for this SKU.', 'info');
      return;
    }

    setOverrideModal({
      lineId,
      sku,
      originalBatchNo,
      availableBatches: candidateBatches,
    });
    setSelectedOverrideBatch(candidateBatches[0].batchNo);
    setOverrideReasonInput('');
  };

  // Submit override
  const handleConfirmOverride = () => {
    if (!overrideModal) return;
    if (!overrideReasonInput.trim()) {
      addToast(
        'Reason Required',
        'Academic integrity & QA compliance rule: Overriding FEFO requires a typed justification.',
        'warning'
      );
      return;
    }

    setManualOverrides({
      ...manualOverrides,
      [overrideModal.lineId]: {
        batchNo: selectedOverrideBatch,
        reason: overrideReasonInput.trim(),
      },
    });

    addToast(
      'Batch Override Staged',
      `Line overridden with ${selectedOverrideBatch}. Reason logged in dispatch audit.`,
      'info'
    );
    setOverrideModal(null);
  };

  // Clear single override
  const handleResetOverride = (lineId: string) => {
    const newOverrides = { ...manualOverrides };
    delete newOverrides[lineId];
    setManualOverrides(newOverrides);
    addToast('FEFO Restored', 'Reverted back to strict mathematical FEFO pick.', 'info');
  };

  // Export or Print FEFO Pick List as PDF
  const handleExportPdf = (action: 'download' | 'print' = 'download', customOrderNo?: string) => {
    if (lines.length === 0) {
      addToast('Empty Order', 'Please add at least one product line before generating a pick list.', 'error');
      return;
    }

    const orderNo = customOrderNo || `PICK-MLT-${Math.floor(1000 + Math.random() * 9000)}`;

    const pdfLines = fefoPlan.map((plan) => ({
      lineId: plan.lineId,
      sku: plan.sku,
      productName: plan.product?.name || plan.sku,
      category: plan.product?.category || 'General',
      unit: plan.product?.unit || 'carton',
      requestedQty: plan.requestedQty,
      allocatedBatches: plan.allocatedBatches,
      shortfall: plan.shortfall,
      shortfallReason: plan.shortfallReason,
    }));

    const pdfData: PickListPdfData = {
      orderNo,
      todayDate: state.today,
      customer: selectedCustomer,
      role: state.role,
      lines: pdfLines,
      totalQty: orderTotalQty,
      totalValue: orderTotalValue,
    };

    try {
      generatePickListPdf(pdfData, action);
      if (action === 'print') {
        addToast('Print Document Opened', `Pick list ${orderNo} opened in browser print view.`, 'info');
      } else {
        addToast('PDF Downloaded', `Pick list ${orderNo} saved as PDF document.`, 'success');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      addToast('PDF Error', 'Failed to generate pick list PDF document.', 'error');
    }
  };

  // Export historical order pick list as PDF
  const handleExportOrderPdf = (order: Order, action: 'download' | 'print' = 'download') => {
    const cust = state.customers.find((c) => c.id === order.customerId) || selectedCustomer;
    const pdfLines = order.lines.map((l) => {
      const prod = prodMap.get(l.sku);
      return {
        lineId: l.id,
        sku: l.sku,
        productName: prod?.name || l.sku,
        category: prod?.category || 'General',
        unit: prod?.unit || 'carton',
        requestedQty: l.requestedQty,
        allocatedBatches: l.allocatedBatches,
        shortfall: l.shortfall,
        shortfallReason: l.shortfallReason,
      };
    });

    const pdfData: PickListPdfData = {
      orderNo: order.orderNo,
      todayDate: order.date,
      customer: cust,
      role: order.dispatchedBy || `${state.role} Operator`,
      lines: pdfLines,
      totalQty: order.totalQty,
      totalValue: order.totalValue,
    };

    try {
      generatePickListPdf(pdfData, action);
      if (action === 'print') {
        addToast('Print Document Opened', `Pick list print view opened for ${order.orderNo}.`, 'info');
      } else {
        addToast('PDF Downloaded', `Pick list ${order.orderNo} downloaded as PDF document.`, 'success');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      addToast('PDF Error', 'Failed to generate historical order PDF.', 'error');
    }
  };

  // Confirm Dispatch
  const handleConfirmDispatch = () => {
    if (lines.length === 0) {
      addToast('Empty Order', 'Please add at least one product line before confirming dispatch.', 'error');
      return;
    }

    const deductedBatches: { batchNo: string; deductQty: number }[] = [];
    const dispatchLines: DispatchLine[] = [];
    const overrideLogs: OverrideLog[] = [];

    const orderNo = `SO-MLT-${Math.floor(1000 + Math.random() * 9000)}`;

    for (const plan of fefoPlan) {
      const allocated = plan.allocatedBatches;

      for (const alloc of allocated) {
        deductedBatches.push({
          batchNo: alloc.batchNo,
          deductQty: alloc.qty,
        });

        if (alloc.isOverride && alloc.overrideReason) {
          overrideLogs.push({
            id: `OVR-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toISOString(),
            orderNo,
            sku: plan.sku,
            systemBatchNo: plan.allocatedBatches[0]?.batchNo || 'None',
            overriddenBatchNo: alloc.batchNo,
            reason: alloc.overrideReason,
            role: state.role,
            user: `${state.role} Operator`,
          });
        }
      }

      dispatchLines.push({
        id: plan.lineId,
        sku: plan.sku,
        requestedQty: plan.requestedQty,
        allocatedBatches: plan.allocatedBatches,
        excludedBatches: plan.excludedBatches,
        status: plan.status,
        shortfall: plan.shortfall,
        shortfallReason: plan.shortfallReason,
      });
    }

    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      orderNo,
      customerId: selectedCustomer.id,
      date: state.today,
      lines: dispatchLines,
      status: 'Dispatched',
      totalQty: orderTotalQty,
      totalValue: orderTotalValue,
      dispatchedAt: state.today,
      dispatchedBy: `${state.role} Officer`,
    };

    dispatch({
      type: 'DISPATCH_ORDER',
      payload: {
        order: newOrder,
        overrideLogs,
        deductedBatches,
      },
    });

    addToast(
      'Dispatch Confirmed',
      `Order ${orderNo} dispatched for ${selectedCustomer.name} (${orderTotalQty} units, ${formatPKR(orderTotalValue)}). Inventory deducted.`,
      'success'
    );

    // Reset lines to blank or fresh demo state
    setLines([
      {
        id: `LINE-${Date.now()}-1`,
        sku: 'SKU-BIS-002',
        requestedQty: 40,
      },
    ]);
    setManualOverrides({});
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            FEFO Dispatch Allocation Engine
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Strict First-Expired-First-Out picking with channel shelf-life compliance and reason logging
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePage('inventory')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Check Inventory</span>
          </button>
        </div>
      </div>

      {/* Customer Selector & Channel Rules Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Target Customer & Channel Profile
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setManualOverrides({}); // clear overrides on customer change
              }}
              className="w-full md:w-96 p-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
            >
              {state.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.type} ({c.city})
                </option>
              ))}
            </select>
          </div>

          {/* Enforced Channel Threshold Indicator */}
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold font-mono">
              {selectedCustomer?.minRemainingShelfLifeDays}d
            </div>
            <div>
              <div className="font-semibold text-stone-900 dark:text-stone-100">
                Minimum Shelf-Life Required
              </div>
              <div className="text-stone-500 text-[11px]">
                {selectedCustomer?.type} standard: Any batch with &lt;{selectedCustomer?.minRemainingShelfLifeDays} days will be strictly excluded.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Lines Builder */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Order Line Items
            </h2>
            <p className="text-xs text-stone-500">
              Define product requirements to generate live FEFO pick allocations
            </p>
          </div>
          <button
            onClick={handleAddLine}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 text-xs font-medium text-emerald-800 dark:text-emerald-400"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product Line</span>
          </button>
        </div>

        {/* Input Rows */}
        <div className="space-y-3">
          {lines.map((line, idx) => (
            <div
              key={line.id}
              className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1 w-full">
                <span className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-xs flex items-center justify-center font-semibold">
                  {idx + 1}
                </span>

                <div className="flex-1">
                  <select
                    value={line.sku}
                    onChange={(e) => handleUpdateLine(line.id, 'sku', e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                  >
                    {state.products
                      .filter((p) => p.category !== 'Ingredients' && p.category !== 'Packaging')
                      .map((p) => (
                        <option key={p.sku} value={p.sku}>
                          {p.name} ({p.sku}) — {p.category}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-500">Requested:</span>
                  <input
                    type="number"
                    min={1}
                    value={line.requestedQty}
                    onChange={(e) => handleUpdateLine(line.id, 'requestedQty', Math.max(1, Number(e.target.value)))}
                    className="w-24 p-2 text-xs font-mono rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                  <span className="text-xs text-stone-400">cartons</span>
                </div>

                {lines.length > 1 && (
                  <button
                    onClick={() => handleRemoveLine(line.id)}
                    className="p-2 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700"
                    title="Remove line"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generated FEFO Pick List Output */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 gap-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Generated FEFO Pick List</span>
            </h2>
            <p className="text-xs text-stone-500">
              Allocated batches sorted by earliest expiry date meeting {selectedCustomer?.name}&apos;s {selectedCustomer?.minRemainingShelfLifeDays}-day requirement
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleExportPdf('print')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-200 shadow-xs transition-colors"
              title="Print pick list for floor clipboard"
            >
              <Printer className="w-3.5 h-3.5 text-stone-500" />
              <span>Print Slip</span>
            </button>

            <button
              onClick={() => handleExportPdf('download')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-xs font-semibold text-emerald-900 dark:text-emerald-300 shadow-xs transition-colors"
              title="Download pick list as PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Save PDF</span>
            </button>

            <div className="text-right text-xs pl-2 border-l border-stone-200 dark:border-stone-700">
              <span className="text-stone-400">Total: </span>
              <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                {formatPKR(orderTotalValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Lines Allocations Cards */}
        <div className="space-y-4">
          {fefoPlan.map((plan, pIdx) => (
            <div
              key={plan.lineId}
              className={`p-4 rounded-xl border ${
                plan.isOverridden
                  ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10'
                  : plan.shortfall > 0
                  ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/10'
                  : 'border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-800/20'
              } space-y-3`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 dark:text-stone-100 text-xs">
                      {plan.product?.name}
                    </span>
                    <span className="font-mono text-[11px] text-stone-400">({plan.sku})</span>
                    {plan.isOverridden && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-semibold">
                        Manual Override
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Order requirement: {plan.requestedQty} cartons · Allocated:{' '}
                    {plan.allocatedBatches.reduce((a, b) => a + b.qty, 0)} cartons
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {plan.isOverridden && (
                    <button
                      onClick={() => handleResetOverride(plan.lineId)}
                      className="text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1 underline"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset to FEFO</span>
                    </button>
                  )}
                  {plan.allocatedBatches.length > 0 && !plan.isOverridden && (
                    <button
                      onClick={() =>
                        handleOpenOverride(
                          plan.lineId,
                          plan.sku,
                          plan.allocatedBatches[0].batchNo
                        )
                      }
                      className="px-2.5 py-1 text-[11px] rounded-lg border border-stone-300 dark:border-stone-700 hover:border-amber-500 text-stone-700 dark:text-stone-300 font-medium"
                    >
                      Override Batch...
                    </button>
                  )}
                </div>
              </div>

              {/* Allocated Batch Pick Table */}
              {plan.allocatedBatches.length > 0 ? (
                <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-500 text-[11px]">
                        <th className="py-2 px-3 font-medium">Batch No</th>
                        <th className="py-2 px-3 font-medium">Pick Location</th>
                        <th className="py-2 px-3 font-medium text-right">Pick Qty</th>
                        <th className="py-2 px-3 font-medium">Expiry Date</th>
                        <th className="py-2 px-3 font-medium">Days Left</th>
                        <th className="py-2 px-3 font-medium">Algorithmic Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {plan.allocatedBatches.map((alloc) => (
                        <tr key={alloc.batchNo}>
                          <td className="py-2.5 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                            {alloc.batchNo}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-stone-600 dark:text-stone-400">
                            {alloc.location}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                            {alloc.qty}
                          </td>
                          <td className="py-2.5 px-3 text-stone-600 dark:text-stone-300">
                            {formatDate(alloc.expiryDate)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-stone-700 dark:text-stone-300">
                            {alloc.daysLeft}d left
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-stone-600 dark:text-stone-400 italic">
                            {alloc.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  {plan.shortfallReason || 'No eligible batches found for this product.'}
                </div>
              )}

              {/* Shortfall warning if any */}
              {plan.shortfall > 0 && plan.allocatedBatches.length > 0 && (
                <div className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Shortfall of {plan.shortfall} units: Eligible stock depleted before order could be fully filled.
                  </span>
                </div>
              )}

              {/* Collapsible Excluded Batches Panel */}
              {plan.excludedBatches.length > 0 && (
                <div>
                  <button
                    onClick={() =>
                      setExpandedExclusions({
                        ...expandedExclusions,
                        [plan.lineId]: !expandedExclusions[plan.lineId],
                      })
                    }
                    className="text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 flex items-center gap-1 font-medium"
                  >
                    {expandedExclusions[plan.lineId] ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {expandedExclusions[plan.lineId] ? 'Hide' : 'Show'} {plan.excludedBatches.length} Excluded Batches (Why skipped?)
                    </span>
                  </button>

                  {expandedExclusions[plan.lineId] && (
                    <div className="mt-2 bg-stone-100 dark:bg-stone-800/60 p-3 rounded-lg border border-stone-200 dark:border-stone-700 space-y-2">
                      <div className="text-[10px] uppercase font-bold text-stone-400">
                        Excluded Batches & Decision Log:
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {plan.excludedBatches.map((ex) => (
                          <div
                            key={ex.batchNo}
                            className="p-2 bg-white dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-800 flex items-start justify-between gap-2"
                          >
                            <div>
                              <div className="font-mono font-semibold text-stone-800 dark:text-stone-200">
                                {ex.batchNo} · {ex.qty} units (Loc: {ex.location})
                              </div>
                              <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                                Reason: {ex.reason}
                              </div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono text-stone-500">
                              Status: {ex.qualityStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Button: Confirm Dispatch, Save PDF, Print */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-200 dark:border-stone-800">
          <div className="text-xs text-stone-500">
            Confirming dispatch immediately deducts quantities from batch bins and logs full audit trail.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleExportPdf('print')}
              className="px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
              title="Print pick list for floor clipboard"
            >
              <Printer className="w-4 h-4 text-stone-500" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportPdf('download')}
              className="px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
              title="Download pick list as PDF"
            >
              <FileDown className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Save PDF</span>
            </button>
            <button
              onClick={handleConfirmDispatch}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>Confirm & Dispatch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Historical Dispatched Orders & Re-print Pick List */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              <span>Recent Dispatched Orders & Historical Pick Slips</span>
            </h2>
            <p className="text-xs text-stone-500">
              Re-print or download official pick lists for transport logistics and audit records
            </p>
          </div>
          <span className="text-xs font-mono text-stone-400">
            {state.orders.length} total orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                <th className="py-2.5 px-4 font-semibold">Order / Pick Slip</th>
                <th className="py-2.5 px-3 font-semibold">Customer Name</th>
                <th className="py-2.5 px-3 font-semibold">Dispatch Date</th>
                <th className="py-2.5 px-3 font-semibold text-right">Picked Qty</th>
                <th className="py-2.5 px-3 font-semibold text-right">Value (PKR)</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold text-center">Export Pick List</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {state.orders.slice(0, 6).map((order) => {
                const cust = state.customers.find((c) => c.id === order.customerId);
                return (
                  <tr key={order.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="py-2.5 px-4 font-mono font-bold text-stone-900 dark:text-stone-100">
                      {order.orderNo}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-stone-800 dark:text-stone-200">{cust?.name || 'Customer'}</div>
                      <div className="text-[10px] text-stone-400">{cust?.type} · {cust?.city}</div>
                    </td>
                    <td className="py-2.5 px-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">
                      {formatDate(order.date)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-stone-900 dark:text-stone-100">
                      {order.totalQty} units
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                      {formatPKR(order.totalValue)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {order.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleExportOrderPdf(order, 'print')}
                          className="p-1.5 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                          title="Print historical pick list"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExportOrderPdf(order, 'download')}
                          className="px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg flex items-center gap-1 transition-colors"
                          title="Download pick list PDF"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Dialog Modal */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <ShieldAlert className="w-6 h-6" />
              <div>
                <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                  Override FEFO Algorithm Pick
                </h3>
                <p className="text-xs text-stone-500">
                  Warning: Manually choosing a later batch skips an earlier-expiring batch
                </p>
              </div>
            </div>

            <div className="text-xs text-stone-600 dark:text-stone-400 space-y-2">
              <p>
                Original FEFO recommendation:{' '}
                <strong className="font-mono text-stone-900 dark:text-stone-100">
                  {overrideModal.originalBatchNo}
                </strong>
              </p>
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Choose Alternative Released Batch
                </label>
                <select
                  value={selectedOverrideBatch}
                  onChange={(e) => setSelectedOverrideBatch(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                >
                  {overrideModal.availableBatches.map((b) => (
                    <option key={b.batchNo} value={b.batchNo}>
                      {b.batchNo} (Qty: {b.qty}, {b.daysLeft}d left, Loc: {b.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Mandatory Operational Justification <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Earlier batch B-SOOP-2601 is physically blocked behind newly arrived export crates in WH1-A aisle..."
                  value={overrideReasonInput}
                  onChange={(e) => setOverrideReasonInput(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={() => setOverrideModal(null)}
                className="px-4 py-2 text-xs text-stone-600 hover:text-stone-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverride}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
