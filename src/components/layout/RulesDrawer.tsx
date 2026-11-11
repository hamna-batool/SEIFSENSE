import React from 'react';
import { X, BookOpen, AlertCircle, CheckCircle2, ShieldCheck, Calculator, ArrowRight } from 'lucide-react';

interface RulesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesDrawer: React.FC<RulesDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-xl bg-white dark:bg-stone-900 h-full shadow-2xl flex flex-col border-l border-stone-200 dark:border-stone-800 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-800 dark:text-emerald-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                How Rules Work (Business Logic Engine)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Explicit deterministic rules — no probabilistic AI black box
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close rules drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm text-stone-700 dark:text-stone-300">
          {/* Academic Integrity Box */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/70">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-medium mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Academic Evaluation Integrity Note
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Expiry alerts, FEFO allocations, days-of-cover, and reorder suggestions are governed by explicit, verifiable mathematical rules.
              Only the Demand Forecast module implements statistical extrapolation (evaluated on synthetic historical sales).
            </p>
          </div>

          {/* Rule 1 & 2 */}
          <section className="space-y-2">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-center font-bold">1</span>
              Days Left & Status Bands
            </h3>
            <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-lg font-mono text-xs text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800">
              Days Left = Expiry Date (UTC) − Today Date (UTC)
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Colour bands are strictly evaluated against calendar day differences:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
                <span className="font-semibold">&lt; 0 days:</span> Expired (Red)
              </div>
              <div className="p-2 rounded border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                <span className="font-semibold">&lt; 30 days:</span> Critical / Short (Orange)
              </div>
              <div className="p-2 rounded border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-300">
                <span className="font-semibold">30 – 60 days:</span> Warning (Amber)
              </div>
              <div className="p-2 rounded border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold">&gt; 60 days:</span> Healthy (Green)
              </div>
            </div>
          </section>

          {/* Rule 3 */}
          <section className="space-y-2">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-center font-bold">2</span>
              Usable Stock Definition
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Inventory is classified as <strong className="text-stone-800 dark:text-stone-200">Usable Stock</strong> if and only if:
            </p>
            <ul className="list-disc list-inside text-xs text-stone-600 dark:text-stone-400 space-y-1 pl-1">
              <li>Quality Status is strictly <span className="font-semibold text-emerald-700 dark:text-emerald-400">Released</span>.</li>
              <li>Days Left &ge; 0 (not expired).</li>
              <li>Batch on-hand quantity &gt; 0.</li>
            </ul>
            <p className="text-xs text-stone-500 italic">
              Batches on Quality Hold or Rejected are never included in usable stock or FEFO allocation.
            </p>
          </section>

          {/* Rule 4 */}
          <section className="space-y-2">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-center font-bold">3</span>
              FEFO Dispatch Algorithm & Exclusions
            </h3>
            <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-lg text-xs space-y-1.5 border border-stone-200 dark:border-stone-800">
              <p className="font-mono text-stone-800 dark:text-stone-200">
                1. Filter: Released AND DaysLeft &ge; Customer.MinShelfLifeDays
              </p>
              <p className="font-mono text-stone-800 dark:text-stone-200">
                2. Sort: Earliest ExpiryDate ASC, then Earliest ReceivedDate ASC
              </p>
              <p className="font-mono text-stone-800 dark:text-stone-200">
                3. Allocate pick quantity sequentially across sorted eligible batches
              </p>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Customer shelf-life minimums enforced:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 dark:text-stone-300">
              <div className="p-2 bg-stone-100 dark:bg-stone-800 rounded">
                <strong>Retail Chains:</strong> &ge; 60 days
              </div>
              <div className="p-2 bg-stone-100 dark:bg-stone-800 rounded">
                <strong>Distributors:</strong> &ge; 45 days
              </div>
              <div className="p-2 bg-stone-100 dark:bg-stone-800 rounded">
                <strong>Wholesalers:</strong> &ge; 30 days
              </div>
              <div className="p-2 bg-stone-100 dark:bg-stone-800 rounded">
                <strong>Export Shipments:</strong> &ge; 120 days
              </div>
            </div>
            <p className="text-xs text-stone-500 italic">
              Any batch with fewer days left than the customer minimum is excluded, and the shortfall reason is logged.
            </p>
          </section>

          {/* Rule 5 */}
          <section className="space-y-2">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-center font-bold">4</span>
              Days of Cover & Slow-Moving Stock
            </h3>
            <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-lg font-mono text-xs text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800">
              Days of Cover = Usable Stock / Average Daily Sales
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Two critical conditions are tracked:
            </p>
            <ul className="list-disc list-inside text-xs text-stone-600 dark:text-stone-400 space-y-1">
              <li>
                <strong className="text-rose-700 dark:text-rose-400">At Risk of Expiring Unsold:</strong> When Days of Cover &gt; Remaining Shelf Life of the batch.
              </li>
              <li>
                <strong className="text-amber-700 dark:text-amber-400">Slow Moving:</strong> When Days of Cover &gt; 90 days (configurable parameter).
              </li>
              <li>
                <strong className="text-stone-500">Zero Sales:</strong> If average daily sales = 0, system displays &quot;&infin; (No sales)&quot;.
              </li>
            </ul>
          </section>

          {/* Rule 6 */}
          <section className="space-y-2">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-center font-bold">5</span>
              Suggested Reorder Calculation
            </h3>
            <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-lg text-xs font-mono text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800 leading-relaxed">
              Order Qty = MAX(0, (AvgDailySales &times; LeadTime) + SafetyStock &minus; UsableStockConsumedBeforeExpiry &minus; OpenPOQty)
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              <strong className="text-stone-800 dark:text-stone-200">Expiry Simulation:</strong> The engine simulates day-by-day consumption at the average daily sales rate.
              Batches that will pass their expiry date before they can be consumed are subtracted from usable stock!
            </p>
          </section>

          {/* Rule 7 */}
          <section className="space-y-2">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-center font-bold">6</span>
              Human Governance & Role Permissions
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              All engine outputs are structured recommendations. Crucial actions require explicit human input:
            </p>
            <ul className="list-disc list-inside text-xs text-stone-600 dark:text-stone-400 space-y-1">
              <li>
                <strong>Quality Hold &rarr; Released:</strong> Restricted to <em>Quality</em> or <em>Manager</em> roles with mandatory reason.
              </li>
              <li>
                <strong>Purchase Order Approval:</strong> Restricted to <em>Manager</em> or <em>Procurement</em> roles.
              </li>
              <li>
                <strong>FEFO Batch Override:</strong> Warehouse staff may override a suggested batch only after inputting an audit explanation.
              </li>
              <li>
                <strong>Write-Offs:</strong> Value calculated automatically; requires typed notes and logged authorizer.
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-emerald-800 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Close Rules Guide
          </button>
        </div>
      </div>
    </div>
  );
};
