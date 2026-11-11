import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { WriteOffReason } from '../../types';
import { formatDate, formatPKR } from '../../rules/rulesEngine';
import {
  FileText,
  Plus,
  Download,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Receipt,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export const WriteOffsFinancePage: React.FC = () => {
  const { state, dispatch, addToast } = useApp();

  // Log write-off modal
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedBatchNo, setSelectedBatchNo] = useState(state.batches[0]?.batchNo || '');
  const [writeOffQty, setWriteOffQty] = useState(10);
  const [writeOffReason, setWriteOffReason] = useState<WriteOffReason>('Expired');
  const [writeOffNotes, setWriteOffNotes] = useState('');

  // Invoice simulation verification state
  const [invoiceStatus, setInvoiceStatus] = useState<Record<string, 'Matched' | 'Discrepancy' | 'Pending'>>({
    'INV-2026-901': 'Matched',
    'INV-2026-902': 'Matched',
    'INV-2026-903': 'Discrepancy',
    'INV-2026-904': 'Matched',
  });

  const prodMap = useMemo(() => new Map(state.products.map((p) => [p.sku, p])), [state.products]);
  const batchMap = useMemo(() => new Map(state.batches.map((b) => [b.batchNo, b])), [state.batches]);

  // Aggregate monthly write-off totals
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; expired: number; damaged: number; rejected: number; returned: number; total: number }>();

    for (const wo of state.writeOffs) {
      const monthKey = wo.date.slice(0, 7); // YYYY-MM
      const existing = map.get(monthKey) || {
        month: monthKey,
        expired: 0,
        damaged: 0,
        rejected: 0,
        returned: 0,
        total: 0,
      };

      if (wo.reason === 'Expired') existing.expired += wo.value;
      else if (wo.reason === 'Damaged') existing.damaged += wo.value;
      else if (wo.reason === 'Quality rejection') existing.rejected += wo.value;
      else if (wo.reason === 'Returned unsaleable') existing.returned += wo.value;

      existing.total += wo.value;
      map.set(monthKey, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [state.writeOffs]);

  // Stock valuation by category
  const valuationByCategory = useMemo(() => {
    const map = new Map<string, { category: string; batchCount: number; totalQty: number; totalValue: number }>();
    for (const b of state.batches) {
      const prod = prodMap.get(b.sku);
      if (!prod) continue;
      const val = b.qty * prod.unitCost;
      const existing = map.get(prod.category) || {
        category: prod.category,
        batchCount: 0,
        totalQty: 0,
        totalValue: 0,
      };
      existing.batchCount += 1;
      existing.totalQty += b.qty;
      existing.totalValue += val;
      map.set(prod.category, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [state.batches, prodMap]);

  // Total written-off value
  const totalWriteOffValue = useMemo(() => {
    return state.writeOffs.reduce((acc, wo) => acc + wo.value, 0);
  }, [state.writeOffs]);

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Batch No', 'SKU', 'Product Name', 'Quantity', 'Unit Cost (PKR)', 'Total Value (PKR)', 'Reason', 'Approved By', 'Notes'];
    const rows = state.writeOffs.map((wo) => {
      const prod = prodMap.get(wo.sku);
      return [
        wo.id,
        wo.date,
        wo.batchNo,
        wo.sku,
        `"${(prod?.name || '').replace(/"/g, '""')}"`,
        wo.qty,
        wo.unitCost,
        wo.value,
        wo.reason,
        `"${wo.approvedBy.replace(/"/g, '""')}"`,
        `"${wo.notes.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ShelfSense_WriteOffs_${state.today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSV Exported', `Exported ${state.writeOffs.length} write-off records.`, 'success');
  };

  // Submit write-off form
  const handleLogWriteOff = (e: React.FormEvent) => {
    e.preventDefault();
    const batch = batchMap.get(selectedBatchNo);
    if (!batch) return;

    if (writeOffQty <= 0 || writeOffQty > batch.qty) {
      addToast('Invalid Quantity', `Quantity must be between 1 and available ${batch.qty}.`, 'error');
      return;
    }
    if (!writeOffNotes.trim()) {
      addToast('Notes Required', 'Audit reason is mandatory for inventory shrinkage write-off.', 'warning');
      return;
    }

    dispatch({
      type: 'CREATE_WRITE_OFF',
      payload: {
        batchNo: selectedBatchNo,
        qty: Number(writeOffQty),
        reason: writeOffReason,
        notes: writeOffNotes.trim(),
        approvedBy: `${state.role} Controller`,
      },
    });

    addToast('Write-Off Logged', `Logged write-off for ${writeOffQty} units of ${selectedBatchNo}.`, 'success');
    setLogModalOpen(false);
    setWriteOffNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Inventory Write-Offs & Financial Control
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Loss accounting, category stock valuation, and supplier invoice discrepancy reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setLogModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Log Write-Off</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] text-stone-400 font-medium">Cumulative Write-Off Value</div>
          <div className="text-lg font-bold text-rose-700 dark:text-rose-400 font-mono mt-1">
            {formatPKR(totalWriteOffValue)}
          </div>
          <div className="text-[10px] text-stone-500 mt-1">
            {state.writeOffs.length} approved disposal events
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] text-stone-400 font-medium">Total On-Hand Inventory Asset</div>
          <div className="text-lg font-bold text-stone-900 dark:text-stone-100 font-mono mt-1">
            {formatPKR(valuationByCategory.reduce((a, b) => a + b.totalValue, 0))}
          </div>
          <div className="text-[10px] text-stone-500 mt-1">
            Across {state.batches.length} active batches
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] text-stone-400 font-medium">Expiry-Related Write-Off Share</div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-400 font-mono mt-1">
            {totalWriteOffValue > 0
              ? `${Math.round(
                  (state.writeOffs.filter((w) => w.reason === 'Expired').reduce((a, b) => a + b.value, 0) /
                    totalWriteOffValue) *
                    100
                )}%`
              : '0%'}
          </div>
          <div className="text-[10px] text-stone-500 mt-1">
            Expired stock vs damage & returns
          </div>
        </div>
      </div>

      {/* Monthly Write-Off Loss Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Monthly Write-Off Value by Reason
            </h2>
            <p className="text-xs text-stone-500">
              Breakdown of inventory shrinkage across Expired, Damaged, Quality rejection, and Returns
            </p>
          </div>
          <span className="text-xs font-mono text-stone-400">Values in PKR</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#a8a29e" />
              <YAxis tick={{ fontSize: 11 }} stroke="#a8a29e" tickFormatter={(v) => `${v / 1000}k`} />
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
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="expired" name="Expired" fill="#e11d48" stackId="a" />
              <Bar dataKey="damaged" name="Handling Damage" fill="#f59e0b" stackId="a" />
              <Bar dataKey="rejected" name="Quality Rejection" fill="#9333ea" stackId="a" />
              <Bar dataKey="returned" name="Returned Unsaleable" fill="#64748b" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stock Valuation by Category Table */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Stock Valuation by Category Ledger
          </h2>
          <p className="text-xs text-stone-500">
            Current balance sheet valuation based on actual batch costs
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                <th className="py-2.5 px-4 font-semibold">Category</th>
                <th className="py-2.5 px-3 font-semibold text-right">Active Batches</th>
                <th className="py-2.5 px-3 font-semibold text-right">Total Units</th>
                <th className="py-2.5 px-4 font-semibold text-right">Total Inventory Valuation (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {valuationByCategory.map((vc) => (
                <tr key={vc.category} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                  <td className="py-2.5 px-4 font-semibold text-stone-800 dark:text-stone-200">
                    {vc.category}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-stone-700 dark:text-stone-300">
                    {vc.batchCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-stone-700 dark:text-stone-300">
                    {vc.totalQty.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                    {formatPKR(vc.totalValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Verification Checklist (Simulated POs vs Invoices) */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-700" />
              <span>Supplier Invoice 3-Way Match Verification Checklist</span>
            </h2>
            <p className="text-xs text-stone-500">
              Cross-checks received supplier invoices against simulated PO quantities and GRN acceptance
            </p>
          </div>
          <span className="text-xs text-stone-400">Finance Controls</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                <th className="py-2.5 px-4 font-semibold">Invoice No</th>
                <th className="py-2.5 px-3 font-semibold">Simulated PO Ref</th>
                <th className="py-2.5 px-3 font-semibold">Supplier</th>
                <th className="py-2.5 px-3 font-semibold text-right">Billed Amount</th>
                <th className="py-2.5 px-3 font-semibold">Match Status</th>
                <th className="py-2.5 px-4 font-semibold">Discrepancy Notes</th>
                <th className="py-2.5 px-3 font-semibold text-center">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                <td className="py-2.5 px-4 font-mono font-semibold">INV-2026-901</td>
                <td className="py-2.5 px-3 font-mono text-emerald-700">PO-2026-0941</td>
                <td className="py-2.5 px-3">Multan Flour & Agro Mills</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold">PKR 612,000</td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Matched (Qty & Rate)
                  </span>
                </td>
                <td className="py-2.5 px-4 text-stone-500 text-[11px]">
                  120 bags Maida received & verified in WH3.
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="text-[11px] font-semibold text-stone-400">Passed to AP</span>
                </td>
              </tr>

              <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/40 bg-rose-50/20 dark:bg-rose-950/10">
                <td className="py-2.5 px-4 font-mono font-semibold">INV-2026-903</td>
                <td className="py-2.5 px-3 font-mono text-stone-500">PO-2026-0948</td>
                <td className="py-2.5 px-3">Packages Ltd Lahore</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">PKR 465,000</td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                    <XCircle className="w-3.5 h-3.5" /> Rate Discrepancy
                  </span>
                </td>
                <td className="py-2.5 px-4 text-rose-600 dark:text-rose-400 text-[11px]">
                  Billed at PKR 15,500/roll vs PO contract price PKR 14,500/roll (+PKR 30,000 difference).
                </td>
                <td className="py-2.5 px-3 text-center">
                  <button
                    onClick={() => addToast('Discrepancy Escalated', 'Debit note request sent to Packages Ltd accounting.', 'warning')}
                    className="px-2 py-1 text-[11px] rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold"
                  >
                    Raise Debit Note
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Write-Offs Table */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Detailed Write-Off Ledger ({state.writeOffs.length} Records)
          </h2>
          <p className="text-xs text-stone-500">
            Immutable audit log of all scrap, expired disposal, and damage writes
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                <th className="py-2.5 px-4 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold">Batch No</th>
                <th className="py-2.5 px-3 font-semibold">SKU & Product</th>
                <th className="py-2.5 px-3 font-semibold text-right">Written-Off Qty</th>
                <th className="py-2.5 px-3 font-semibold text-right">Financial Value</th>
                <th className="py-2.5 px-3 font-semibold">Reason</th>
                <th className="py-2.5 px-4 font-semibold">Approved By & Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {state.writeOffs.map((wo) => {
                const prod = prodMap.get(wo.sku);
                return (
                  <tr key={wo.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="py-2.5 px-4 whitespace-nowrap text-stone-600 dark:text-stone-400">
                      {formatDate(wo.date)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                      {wo.batchNo}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-stone-800 dark:text-stone-200">{prod?.name}</div>
                      <div className="font-mono text-[10px] text-stone-400">{wo.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-stone-900 dark:text-stone-100">
                      {wo.qty} {prod?.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatPKR(wo.value)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {wo.reason}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[11px] text-stone-500">
                      <span className="font-medium text-stone-700 dark:text-stone-300">{wo.approvedBy}:</span>{' '}
                      &quot;{wo.notes}&quot;
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Write-Off Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-2xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 text-xs">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Log Inventory Write-Off Event
            </h2>
            <form onSubmit={handleLogWriteOff} className="space-y-3">
              <div>
                <label className="block text-stone-600 dark:text-stone-400 mb-1">Select Batch to Write Off</label>
                <select
                  value={selectedBatchNo}
                  onChange={(e) => {
                    setSelectedBatchNo(e.target.value);
                    const b = batchMap.get(e.target.value);
                    if (b) setWriteOffQty(Math.min(10, b.qty));
                  }}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                >
                  {state.batches
                    .filter((b) => b.qty > 0)
                    .map((b) => (
                      <option key={b.batchNo} value={b.batchNo}>
                        {b.batchNo} ({b.sku}) — {b.qty} on hand (Loc: {b.location})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={batchMap.get(selectedBatchNo)?.qty || 100}
                    required
                    value={writeOffQty}
                    onChange={(e) => setWriteOffQty(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 dark:text-stone-400 mb-1">Accounting Reason</label>
                  <select
                    value={writeOffReason}
                    onChange={(e) => setWriteOffReason(e.target.value as WriteOffReason)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  >
                    <option value="Expired">Expired</option>
                    <option value="Damaged">Damaged in Handling</option>
                    <option value="Quality rejection">Quality Rejection</option>
                    <option value="Returned unsaleable">Returned Unsaleable</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-600 dark:text-stone-400 mb-1">
                  Mandatory Audit Notes <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Moisture detected in corner pallet during quarterly stocktake..."
                  value={writeOffNotes}
                  onChange={(e) => setWriteOffNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              </div>

              <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-[11px] font-mono text-stone-500">
                Calculated Write-Off Expense: {formatPKR(writeOffQty * (prodMap.get(batchMap.get(selectedBatchNo)?.sku || '')?.unitCost || 0))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Confirm & Write Off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
