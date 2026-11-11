import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  PackageCheck,
  FlaskConical,
  Warehouse,
  ShoppingCart,
  Truck,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const WorkflowMapPage: React.FC = () => {
  const { setActivePage } = useApp();

  const workflowSteps = [
    {
      id: 'step-1',
      stepNumber: '01',
      title: 'Inbound Receiving',
      role: 'Warehouse Team (Rashid Minhas)',
      icon: PackageCheck,
      systemFeature: 'Batch Entry & Receiving Form',
      targetPage: 'inventory' as const,
      painPoint:
        'Potential pain point (to be validated by interviews): Inbound delivery challans from local mill suppliers often lack clear printed batch numbers or manufacturing dates, forcing manual guesswork.',
      inputs: 'Supplier Delivery Challan, Truck Seal, Gate Pass',
      outputs: 'New Batch record generated in system with "Hold" or "Released" status',
    },
    {
      id: 'step-2',
      stepNumber: '02',
      title: 'Quality Quarantine & Release',
      role: 'QA / Lab Officer (Dr. Asad Malik)',
      icon: FlaskConical,
      systemFeature: 'Quality Hold / Release Audit Trail',
      targetPage: 'inventory' as const,
      painPoint:
        'Potential pain point (to be validated by interviews): Physical yellow quarantine tags get damaged on pallets during high-speed forklift movements, creating risk of premature dispatch without digital lockdown.',
      inputs: 'Moisture assay, microbiological swab, seal integrity check',
      outputs: 'System-enforced transition from "Hold" to "Released" with mandatory reason log',
    },
    {
      id: 'step-3',
      stepNumber: '03',
      title: 'Warehouse Storage & Rotation',
      role: 'Forklift Operators & Bin Keepers',
      icon: Warehouse,
      systemFeature: 'Aisle Bin Locator & Expiry Alerts',
      targetPage: 'alerts' as const,
      painPoint:
        'Potential pain point (to be validated by interviews): Front-rack accessibility bias: warehouse operators pick the nearest pallet in aisle WH1 regardless of expiry date because older stock is stacked behind new arrivals.',
      inputs: 'Bin assignment (e.g. WH1-A-03), Ambient temperature log',
      outputs: 'Automated 60/30/14/7-day alert triggers and daily sales burn tracking',
    },
    {
      id: 'step-4',
      stepNumber: '04',
      title: 'Material Purchasing & Reorder',
      role: 'Procurement Specialist (Nabeel Tariq)',
      icon: ShoppingCart,
      systemFeature: 'Algorithmic Reorder Engine & Quote Matrix',
      targetPage: 'purchasing' as const,
      painPoint:
        'Potential pain point (to be validated by interviews): Purchasing raw ingredients based on temporary vendor spot discounts rather than shelf-life consumption models, leading to surplus raw material expiry.',
      inputs: 'Simulated daily sales, supplier lead times, quotation MOQ',
      outputs: 'Digital Purchase Requisitions (Draft &rarr; Approved) excluding expiring stock',
    },
    {
      id: 'step-5',
      stepNumber: '05',
      title: 'FEFO Order Allocation & Pick',
      role: 'Sales Ops & Warehouse Dispatchers',
      icon: Truck,
      systemFeature: 'FEFO Engine & Customer Shelf-Life Filters',
      targetPage: 'dispatch' as const,
      painPoint:
        'Potential pain point (to be validated by interviews): Large retail chains (Metro, Imtiaz) reject shipments arriving with fewer than 60 days shelf life at their regional DC gate, triggering heavy return freight penalties.',
      inputs: 'Customer channel profile (Retail 60d, Wholesaler 30d, Export 120d)',
      outputs: 'Optimized pick list, shortfall reason explanation, and override logging',
    },
    {
      id: 'step-6',
      stepNumber: '06',
      title: 'Disposal, Returns & Loss Accounting',
      role: 'Finance Controller (Sajjad Haider)',
      icon: RotateCcw,
      systemFeature: 'Write-Off Ledger & Invoice Verification',
      targetPage: 'writeoffs' as const,
      painPoint:
        'Potential pain point (to be validated by interviews): Write-off write-downs are currently recorded at standard cost rather than Net Realisable Value (NRV), causing late audit disputes during fiscal close.',
      inputs: 'Damaged/expired pallet quarantine log, customer RMA notes',
      outputs: 'General ledger write-off provisions and supplier debit notes',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            End-to-End Plant Inventory Workflow Map
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Operational pipeline from raw material receiving to dispatch and loss accounting, mapped to field interview hypotheses
          </p>
        </div>

        <div className="text-xs text-stone-500 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
          <span>Interactive: Click any stage to open its module</span>
        </div>
      </div>

      {/* Visual Pipeline Strip */}
      <div className="hidden lg:grid grid-cols-6 gap-2 p-3 bg-stone-100 dark:bg-stone-900/60 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs">
        {workflowSteps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              onClick={() => setActivePage(step.targetPage)}
              className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 cursor-pointer hover:border-emerald-600 hover:shadow-sm transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-stone-400 text-[10px] font-mono">
                <span>{step.stepNumber}</span>
                {idx < 5 && <ArrowRight className="w-3 h-3 text-stone-300 group-hover:text-emerald-600 transition-colors" />}
              </div>
              <div className="my-2">
                <Icon className="w-5 h-5 text-emerald-800 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <div className="font-bold text-stone-800 dark:text-stone-200 mt-1 truncate">
                  {step.title}
                </div>
              </div>
              <div className="text-[10px] text-stone-500 truncate">
                {step.role.split('(')[0]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Workflow Stage Cards */}
      <div className="space-y-4">
        {workflowSteps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs hover:border-stone-300 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold font-mono shrink-0">
                    {step.stepNumber}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                      {step.title}
                    </h2>
                    <div className="text-xs text-stone-500 font-medium">
                      Responsible Actor: <strong className="text-stone-700 dark:text-stone-300">{step.role}</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActivePage(step.targetPage)}
                  className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-700 text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                >
                  <span>Open {step.systemFeature}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Technical Flow: Inputs, Feature, Outputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-stone-400 mb-1">
                    Stage Inbound Data
                  </div>
                  <div className="text-stone-700 dark:text-stone-300 font-medium">
                    {step.inputs}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-stone-400 mb-1">
                    ShelfSense System Feature
                  </div>
                  <div className="text-emerald-800 dark:text-emerald-400 font-semibold">
                    {step.systemFeature}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-stone-400 mb-1">
                    Enforced Output / Status
                  </div>
                  <div className="text-stone-700 dark:text-stone-300 font-medium">
                    {step.outputs}
                  </div>
                </div>
              </div>

              {/* Potential Pain Point Callout (to be validated by interviews) */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">{step.painPoint.split(':')[0]}:</span>
                  <span>{step.painPoint.split(':')[1]}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
