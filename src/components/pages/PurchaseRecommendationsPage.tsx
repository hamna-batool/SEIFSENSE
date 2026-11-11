import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  calculateReorderNeed,
  formatPKR,
  formatDate,
} from '../../rules/rulesEngine';
import {
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Plus,
  HelpCircle,
  Award,
  Clock,
  DollarSign,
  AlertCircle,
  Building2,
} from 'lucide-react';

export const PurchaseRecommendationsPage: React.FC = () => {
  const { state, dispatch, addToast } = useApp();

  // Expanded calculation breakdowns per row
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Approval Modal
  const [approveModalPrId, setApproveModalPrId] = useState<string | null>(null);
  const [rejectModalPrId, setRejectModalPrId] = useState<string | null>(null);
  const [approverComment, setApproverComment] = useState('');

  // Create new PR modal
  const [createPrOpen, setCreatePrOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState(
    state.products.find((p) => p.category === 'Ingredients' || p.category === 'Packaging')?.sku || state.products[0].sku
  );
  const [prQty, setPrQty] = useState(100);

  const prodMap = useMemo(() => new Map(state.products.map((p) => [p.sku, p])), [state.products]);

  // Ingredients and Packaging SKUs evaluated against reorder rule
  const reorderEvaluations = useMemo(() => {
    const rawItems = state.products.filter(
      (p) => p.category === 'Ingredients' || p.category === 'Packaging'
    );

    return rawItems.map((prod) => {
      // Calculate open POs for this SKU
      const openPOs = state.purchaseRequests
        .filter((pr) => pr.sku === prod.sku && (pr.status === 'Pending approval' || pr.status === 'Approved'))
        .reduce((sum, pr) => sum + pr.requestedQty, 0);

      const breakdown = calculateReorderNeed(prod, state.batches, openPOs, state.today);
      return {
        product: prod,
        openPOs,
        breakdown,
        isReorderNeeded: breakdown.netSuggestedOrderQty > 0,
      };
    });
  }, [state.products, state.batches, state.purchaseRequests, state.today]);

  const toggleRow = (sku: string) => {
    setExpandedRows((prev) => ({ ...prev, [sku]: !prev[sku] }));
  };

  // Approval Action with Role Check
  const handleConfirmApproval = () => {
    if (!approveModalPrId) return;

    // Role check: Only Manager or Procurement
    if (state.role !== 'Manager' && state.role !== 'Procurement') {
      addToast(
        'Permission Restricted',
        `Only Plant Operations Manager or Procurement roles can approve purchase requisitions. Current role: ${state.role}`,
        'error'
      );
      setApproveModalPrId(null);
      return;
    }

    dispatch({
      type: 'APPROVE_PURCHASE_REQUEST',
      payload: {
        prId: approveModalPrId,
        comment: approverComment.trim() || 'Approved based on algorithmic consumption requirements.',
        approver: `${state.role} Specialist`,
      },
    });

    addToast('Purchase Request Approved', 'Simulated PO generated and dispatched to supplier.', 'success');
    setApproveModalPrId(null);
    setApproverComment('');
  };

  // Reject Action
  const handleConfirmReject = () => {
    if (!rejectModalPrId) return;

    if (state.role !== 'Manager' && state.role !== 'Procurement') {
      addToast(
        'Permission Restricted',
        `Only Plant Operations Manager or Procurement roles can reject purchase requisitions. Current role: ${state.role}`,
        'error'
      );
      setRejectModalPrId(null);
      return;
    }

    if (!approverComment.trim()) {
      addToast('Reason Required', 'Please provide a typed rejection reason for procurement records.', 'warning');
      return;
    }

    dispatch({
      type: 'REJECT_PURCHASE_REQUEST',
      payload: {
        prId: rejectModalPrId,
        comment: approverComment.trim(),
        approver: `${state.role} Specialist`,
      },
    });

    addToast('Purchase Request Rejected', 'PR marked as rejected with comments.', 'info');
    setRejectModalPrId(null);
    setApproverComment('');
  };

  // Create PR
  const handleCreatePr = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = prodMap.get(selectedSku);
    if (!prod) return;

    dispatch({
      type: 'CREATE_PURCHASE_REQUEST',
      payload: {
        sku: selectedSku,
        qty: Number(prQty),
        requestedBy: `${state.role} Planner`,
      },
    });

    addToast('Requisition Created', `PR submitted for ${prQty} ${prod.unit} of ${prod.name}.`, 'success');
    setCreatePrOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Purchase Recommendations & Material Replenishment
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Algorithmic reorder calculation excluding inventory that will expire prior to simulated production consumption
          </p>
        </div>

        <button
          onClick={() => setCreatePrOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Requisition</span>
        </button>
      </div>

      {/* Reorder Needs Table with Line-by-Line Breakdown */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Raw Ingredients & Packaging Reorder Status
            </h2>
            <p className="text-xs text-stone-500">
              Formula: MAX(0, (AvgDailySales &times; LeadTime) + SafetyStock &minus; UsableStockConsumedBeforeExpiry &minus; OpenPOs)
            </p>
          </div>
          <span className="text-xs font-mono text-stone-400">
            {reorderEvaluations.filter((r) => r.isReorderNeeded).length} items below safety target
          </span>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {reorderEvaluations.map(({ product, breakdown, openPOs, isReorderNeeded }) => {
            const isExpanded = !!expandedRows[product.sku];
            return (
              <div key={product.sku} className="p-4 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900 dark:text-stone-100 text-xs">
                        {product.name}
                      </span>
                      <span className="font-mono text-[11px] text-stone-400">({product.sku})</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                        {product.category}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-3 flex-wrap font-mono">
                      <span>Daily Burn: {breakdown.avgDailySales} {product.unit}/day</span>
                      <span>Lead Time: {breakdown.leadTimeDays}d</span>
                      <span>Safety Stock: {breakdown.safetyStock}</span>
                      <span>Usable Prior-Expiry: {breakdown.usableStockConsumedBeforeExpiry}</span>
                      {breakdown.usableStockExpiringBeforeUse > 0 && (
                        <span className="text-rose-600 font-semibold">
                          ({breakdown.usableStockExpiringBeforeUse} units excluded: will expire before use!)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-stone-400">Suggested Order</div>
                      <div
                        className={`text-sm font-bold font-mono ${
                          isReorderNeeded ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {breakdown.netSuggestedOrderQty} {product.unit}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleRow(product.sku)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1 text-xs"
                    >
                      <span>{isExpanded ? 'Hide' : 'Breakdown'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Line-by-Line Breakdown Drawer */}
                {isExpanded && (
                  <div className="mt-3 p-3.5 rounded-xl bg-stone-100/70 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2 text-xs">
                    <div className="font-semibold text-stone-800 dark:text-stone-200 text-[11px] uppercase tracking-wider">
                      Line-by-Line Mathematical Calculation Breakdown:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 bg-white dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-800">
                        <span className="text-stone-400 block text-[10px]">1. Lead Time Demand:</span>
                        <span className="font-semibold">{breakdown.avgDailySales} &times; {breakdown.leadTimeDays}d = {breakdown.leadTimeDemand} {product.unit}</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-800">
                        <span className="text-stone-400 block text-[10px]">2. Gross Requirement:</span>
                        <span className="font-semibold">{breakdown.leadTimeDemand} + {breakdown.safetyStock} safety = {breakdown.grossRequirement} {product.unit}</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-800">
                        <span className="text-stone-400 block text-[10px]">3. Usable Before Expiry:</span>
                        <span className="font-semibold text-emerald-600">-{breakdown.usableStockConsumedBeforeExpiry} {product.unit}</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-800">
                        <span className="text-stone-400 block text-[10px]">4. Open POs In Flight:</span>
                        <span className="font-semibold">-{openPOs} {product.unit}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
                      <span>
                        Net Reorder Need: <strong>{breakdown.netSuggestedOrderQty} {product.unit}</strong> (Estimated Cost: {formatPKR(breakdown.netSuggestedOrderQty * product.unitCost)})
                      </span>
                      {isReorderNeeded && (
                        <button
                          onClick={() => {
                            setSelectedSku(product.sku);
                            setPrQty(breakdown.netSuggestedOrderQty);
                            setCreatePrOpen(true);
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-[11px]"
                        >
                          Generate Requisition &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Supplier Quotation Comparison Table */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>Supplier Quotation Comparison Matrix</span>
            </h2>
            <p className="text-xs text-stone-500">
              Evaluated on landed price, regional transit lead time, MOQ threshold, and working capital credit terms
            </p>
          </div>
          <span className="text-[11px] text-stone-400">Best-value quotes highlighted</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                <th className="py-3 px-4 font-semibold">Material SKU</th>
                <th className="py-3 px-3 font-semibold">Supplier Name & City</th>
                <th className="py-3 px-3 font-semibold text-right">Landed Price / Unit</th>
                <th className="py-3 px-3 font-semibold text-right">Lead Time</th>
                <th className="py-3 px-3 font-semibold text-right">MOQ</th>
                <th className="py-3 px-3 font-semibold">Payment Terms</th>
                <th className="py-3 px-4 font-semibold">Evaluation Verdict & Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {state.supplierQuotations.map((quot) => (
                <tr
                  key={quot.id}
                  className={
                    quot.isBestValue
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                  }
                >
                  <td className="py-3 px-4 font-mono font-bold text-stone-900 dark:text-stone-100">
                    {quot.sku}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-stone-800 dark:text-stone-200">{quot.supplier}</div>
                    <div className="text-[10px] text-stone-400">{quot.city}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                    {formatPKR(quot.pricePerUnit)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-stone-700 dark:text-stone-300">
                    {quot.leadTimeDays} days
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-stone-700 dark:text-stone-300">
                    {quot.moq} units
                  </td>
                  <td className="py-3 px-3 text-stone-600 dark:text-stone-300 font-medium">
                    {quot.paymentTerms}
                  </td>
                  <td className="py-3 px-4">
                    {quot.isBestValue ? (
                      <div className="text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
                        <Award className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                        <span className="text-[11px] font-medium leading-tight">{quot.bestValueReason}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-stone-500">{quot.notes}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Requisitions Approval Workflow */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Purchase Requisitions Workflow & Audit Trail
            </h2>
            <p className="text-xs text-stone-500">
              Draft &rarr; Pending approval &rarr; Approved / Rejected with digital sign-off
            </p>
          </div>
          <span className="text-xs text-stone-400">
            Permission: Only <strong>Manager</strong> & <strong>Procurement</strong> can authorize
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                <th className="py-3 px-4 font-semibold">PR Number</th>
                <th className="py-3 px-3 font-semibold">Item & SKU</th>
                <th className="py-3 px-3 font-semibold text-right">Requested Qty</th>
                <th className="py-3 px-3 font-semibold text-right">Est. Value</th>
                <th className="py-3 px-3 font-semibold">Requester & Date</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Approver Comments & Simulated PO</th>
                <th className="py-3 px-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {state.purchaseRequests.map((pr) => {
                const prod = prodMap.get(pr.sku);
                return (
                  <tr key={pr.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900 dark:text-stone-100">
                      {pr.prNumber}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-stone-800 dark:text-stone-200">{prod?.name}</div>
                      <div className="font-mono text-[10px] text-stone-400">{pr.sku}</div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-medium text-stone-900 dark:text-stone-100">
                      {pr.requestedQty} {prod?.unit}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-stone-900 dark:text-stone-100">
                      {formatPKR(pr.estimatedCost)}
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-stone-800 dark:text-stone-200">{pr.requestedBy}</div>
                      <div className="text-[10px] text-stone-400">{formatDate(pr.date)}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          pr.status === 'Approved'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : pr.status === 'Pending approval'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : pr.status === 'Draft'
                            ? 'bg-stone-100 text-stone-600 dark:text-stone-400'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {pr.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {pr.status === 'Approved' && (
                        <div>
                          <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                            {pr.simulatedPO}
                          </div>
                          <div className="text-[10px] text-stone-500 italic">
                            &quot;{pr.approverComment}&quot; — {pr.approver} ({formatDate(pr.approvedDate || '')})
                          </div>
                        </div>
                      )}
                      {pr.status === 'Rejected' && (
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 italic">
                          &quot;{pr.approverComment}&quot; — {pr.approver}
                        </div>
                      )}
                      {pr.status === 'Pending approval' && (
                        <span className="text-[11px] text-stone-400 italic">Awaiting procurement sign-off</span>
                      )}
                      {pr.status === 'Draft' && (
                        <span className="text-[11px] text-stone-400 italic">Draft requisition</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {pr.status === 'Pending approval' && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setApproveModalPrId(pr.id);
                              setApproverComment('');
                            }}
                            className="px-2 py-1 text-[11px] rounded bg-emerald-800 hover:bg-emerald-700 text-white font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectModalPrId(pr.id);
                              setApproverComment('');
                            }}
                            className="px-2 py-1 text-[11px] rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {pr.status === 'Draft' && (
                        <button
                          onClick={() => {
                            dispatch({
                              type: 'APPROVE_PURCHASE_REQUEST',
                              payload: {
                                prId: pr.id,
                                comment: 'Fast-tracked from draft state',
                                approver: `${state.role} Specialist`,
                              },
                            });
                          }}
                          className="px-2 py-1 text-[11px] rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100"
                        >
                          Submit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {approveModalPrId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-2xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-base">
              <CheckCircle2 className="w-5 h-5" />
              <span>Authorize Purchase Requisition</span>
            </div>
            <p className="text-stone-600 dark:text-stone-400">
              You are authorizing this material purchase requisition as <strong className="text-stone-800 dark:text-stone-200">{state.role}</strong>. A simulated PO will be cut immediately.
            </p>
            <div>
              <label className="block text-stone-500 mb-1">Approver Comment (Optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Approved under Southern Punjab agricultural supplier price lock..."
                value={approverComment}
                onChange={(e) => setApproverComment(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setApproveModalPrId(null)}
                className="px-3.5 py-1.5 rounded-lg text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                className="px-4 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalPrId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-2xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <XCircle className="w-5 h-5" />
              <span>Reject Purchase Requisition</span>
            </div>
            <p className="text-stone-600 dark:text-stone-400">
              Please enter mandatory justification notes for rejecting this material purchase request.
            </p>
            <div>
              <label className="block text-stone-500 mb-1">Rejection Reason <span className="text-rose-600">*</span></label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Existing stock velocity indicates sufficient raw materials for next 60 days..."
                value={approverComment}
                onChange={(e) => setApproverComment(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalPrId(null)}
                className="px-3.5 py-1.5 rounded-lg text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create PR Modal */}
      {createPrOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-2xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 text-xs">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Create Material Purchase Requisition
            </h2>
            <form onSubmit={handleCreatePr} className="space-y-3">
              <div>
                <label className="block text-stone-600 dark:text-stone-400 mb-1">Select Material SKU</label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                >
                  {state.products
                    .filter((p) => p.category === 'Ingredients' || p.category === 'Packaging')
                    .map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.name} ({p.sku}) — {p.category}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-600 dark:text-stone-400 mb-1">Requisition Quantity</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={prQty}
                  onChange={(e) => setPrQty(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                />
              </div>

              <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-[11px] text-stone-500 font-mono">
                Est. Landed Cost: {formatPKR(prQty * (prodMap.get(selectedSku)?.unitCost || 0))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreatePrOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-semibold"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
