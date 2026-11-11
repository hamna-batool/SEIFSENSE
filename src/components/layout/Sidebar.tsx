import React from 'react';
import { useApp, PageId } from '../../context/AppContext';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  AlertTriangle,
  Hourglass,
  ShoppingCart,
  TrendingUp,
  FileText,
  Gauge,
  GitPullRequest,
  Users,
  X,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: PageId;
  label: string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: (state: any, alertsCount: number) => number | string | null;
  relevantRoles: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { state, setActivePage, unacknowledgedAlertCount } = useApp();

  const pendingPrCount = state.purchaseRequests.filter((pr) => pr.status === 'Pending approval').length;

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      relevantRoles: ['Manager', 'Warehouse', 'Procurement', 'Sales', 'Quality', 'Finance'],
    },
    {
      id: 'inventory',
      label: 'Batch Inventory',
      icon: Boxes,
      badge: (s) => s.batches.length,
      relevantRoles: ['Warehouse', 'Quality', 'Manager', 'Procurement'],
    },
    {
      id: 'dispatch',
      label: 'FEFO Dispatch',
      icon: Truck,
      sublabel: 'Allocation engine',
      relevantRoles: ['Warehouse', 'Sales', 'Manager'],
    },
    {
      id: 'alerts',
      label: 'Expiry Alerts',
      icon: AlertTriangle,
      badge: () => (unacknowledgedAlertCount > 0 ? unacknowledgedAlertCount : null),
      relevantRoles: ['Quality', 'Warehouse', 'Sales', 'Manager'],
    },
    {
      id: 'slow-moving',
      label: 'Slow-Moving Stock',
      icon: Hourglass,
      sublabel: 'Days-of-cover risk',
      relevantRoles: ['Procurement', 'Sales', 'Finance', 'Manager'],
    },
    {
      id: 'purchasing',
      label: 'Purchase Recs',
      icon: ShoppingCart,
      badge: () => (pendingPrCount > 0 ? pendingPrCount : null),
      relevantRoles: ['Procurement', 'Manager', 'Finance'],
    },
    {
      id: 'forecast',
      label: 'Forecast (statistical)',
      icon: TrendingUp,
      sublabel: 'Synthetic data',
      relevantRoles: ['Sales', 'Procurement', 'Manager'],
    },
    {
      id: 'writeoffs',
      label: 'Write-offs & Finance',
      icon: FileText,
      sublabel: 'Loss accounting',
      relevantRoles: ['Finance', 'Quality', 'Manager'],
    },
    {
      id: 'impact',
      label: 'Impact Metrics',
      icon: Gauge,
      sublabel: 'Evaluation test',
      relevantRoles: ['Manager', 'Finance'],
    },
    {
      id: 'workflow',
      label: 'Workflow Map',
      icon: GitPullRequest,
      sublabel: 'Pain-point triage',
      relevantRoles: ['Manager', 'Warehouse', 'Quality'],
    },
    {
      id: 'roles',
      label: 'Roles & Interviews',
      icon: Users,
      sublabel: 'Field study notes',
      relevantRoles: ['Manager', 'Warehouse', 'Procurement', 'Sales', 'Quality', 'Finance'],
    },
  ];

  const handleNav = (id: PageId) => {
    setActivePage(id);
    if (mobileOpen) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-[85px] z-40 lg:z-10 h-screen lg:h-[calc(100vh-85px)] w-64 bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col justify-between transition-transform duration-200 ease-in-out shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 mb-2 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between lg:hidden">
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Navigation
            </span>
            <button
              onClick={onCloseMobile}
              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-3 py-1 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
            Operational Modules
          </div>

          {navItems.map((item) => {
            const isActive = state.currentPage === item.id;
            const isRelevant = item.relevantRoles.includes(state.role);
            const badgeValue = item.badge ? item.badge(state, unacknowledgedAlertCount) : null;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : isRelevant
                    ? 'text-stone-800 dark:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800/80'
                    : 'text-stone-500 dark:text-stone-400 hover:bg-stone-200/40 dark:hover:bg-stone-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-white'
                        : isRelevant
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-stone-400 dark:text-stone-500'
                    }`}
                  />
                  <div className="text-left truncate">
                    <div className="truncate font-medium">{item.label}</div>
                    {item.sublabel && (
                      <div
                        className={`text-[10px] leading-none truncate ${
                          isActive ? 'text-emerald-200' : 'text-stone-400 dark:text-stone-500'
                        }`}
                      >
                        {item.sublabel}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {badgeValue !== null && (
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : typeof badgeValue === 'number' && item.id === 'alerts' && badgeValue > 0
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : typeof badgeValue === 'number' && item.id === 'purchasing' && badgeValue > 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {badgeValue}
                    </span>
                  )}
                  {isRelevant && !isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                      title="Relevant to current role"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer Info Card */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/40 text-[11px]">
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
            <span className="font-semibold text-stone-900 dark:text-stone-200">{state.role}</span>
            <span>· Active Role</span>
          </div>
          <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 leading-tight">
            Role controls approval privileges and emphasis flags.
          </div>
        </div>
      </aside>
    </>
  );
};
