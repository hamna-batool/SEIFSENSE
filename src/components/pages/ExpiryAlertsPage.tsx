import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertSeverity, AlertStatus, SuggestedAction } from '../../types';
import { formatDate, formatPKR, getExpiryBand } from '../../rules/rulesEngine';
import {
  AlertTriangle,
  Sliders,
  CheckCircle2,
  Filter,
  UserCheck,
  RotateCcw,
  ShieldCheck,
  Search,
  ExternalLink,
} from 'lucide-react';

export const ExpiryAlertsPage: React.FC = () => {
  const { state, dispatch, computedAlerts, addToast, setActivePage } = useApp();

  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('Open');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  // Threshold Settings Drawer/Modal
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempThresholds, setTempThresholds] = useState({ ...state.alertThresholds });
  const [selectedCatForOverride, setSelectedCatForOverride] = useState<string>('Snacks');
  const [tempCategoryOverrides, setTempCategoryOverrides] = useState({ ...state.categoryOverrides });

  const prodMap = useMemo(() => new Map(state.products.map((p) => [p.sku, p])), [state.products]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return computedAlerts.filter((a) => {
      if (severityFilter !== 'All' && a.severity !== severityFilter) return false;
      if (statusFilter !== 'All' && a.status !== statusFilter) return false;
      const prod = prodMap.get(a.sku);
      if (categoryFilter !== 'All' && prod && prod.category !== categoryFilter) return false;

      if (search) {
        const q = search.toLowerCase();
        const matchSku = a.sku.toLowerCase().includes(q);
        const matchBatch = a.batchNo.toLowerCase().includes(q);
        const matchProd = prod?.name.toLowerCase().includes(q);
        if (!matchSku && !matchBatch && !matchProd) return false;
      }

      return true;
    });
  }, [computedAlerts, severityFilter, statusFilter, categoryFilter, search, prodMap]);

  // Group by severity
  const groupedAlerts = useMemo(() => {
    const severities: AlertSeverity[] = ['Expired', 'Critical', 'High', 'Warning', 'Info'];
    const groups: Record<AlertSeverity, typeof filteredAlerts> = {
      Expired: [],
      Critical: [],
      High: [],
      Warning: [],
      Info: [],
    };

    filteredAlerts.forEach((a) => {
      groups[a.severity].push(a);
    });

    return severities.map((sev) => ({
      severity: sev,
      alerts: groups[sev],
    }));
  }, [filteredAlerts]);

  // Handle Save Threshold Settings
  const handleSaveSettings = () => {
    dispatch({
      type: 'UPDATE_THRESHOLDS',
      payload: {
        thresholds: tempThresholds,
        categoryOverrides: tempCategoryOverrides,
      },
    });
    addToast('Thresholds Updated', 'Alert trigger rules recalculated across all batches.', 'success');
    setSettingsOpen(false);
  };

  // Handle Acknowledge Alert
  const handleAcknowledge = (alertId: string, assignedTo: string) => {
    dispatch({
      type: 'UPDATE_ALERT',
      payload: {
        alertId,
        status: 'Acknowledged',
        assignedTo,
      },
    });
    addToast('Alert Acknowledged', `Assigned to ${assignedTo}.`, 'info');
  };

  // Handle Action Change
  const handleActionChange = (alertId: string, action: SuggestedAction) => {
    dispatch({
      type: 'UPDATE_ALERT',
      payload: {
        alertId,
        action,
      },
    });
    addToast('Suggested Action Updated', `Action set to: ${action}`, 'info');
  };

  // Handle Resolve
  const handleResolve = (alertId: string) => {
    dispatch({
      type: 'UPDATE_ALERT',
      payload: {
        alertId,
        status: 'Resolved',
      },
    });
    addToast('Alert Resolved', 'Batch action confirmed and archived from open alerts.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Expiry Alert Management
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Dynamic threshold-based risk triage, department assignment, and actionable interventions
          </p>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shadow-xs"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Configure Thresholds & Overrides</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Filter by SKU or Batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none"
            />
          </div>

          {/* Severity */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none font-medium"
          >
            <option value="All">All Severities</option>
            <option value="Expired">Expired (&lt;0d)</option>
            <option value="Critical">Critical (&le;7d)</option>
            <option value="High">High (&le;14d)</option>
            <option value="Warning">Warning (&le;30d)</option>
            <option value="Info">Info (&le;60d)</option>
          </select>

          {/* Alert Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open Only</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none font-medium"
          >
            <option value="All">All Categories</option>
            <option value="Biscuits">Biscuits</option>
            <option value="Wafers">Wafers</option>
            <option value="Confectionery">Confectionery</option>
            <option value="Pasta">Pasta</option>
            <option value="Sauces">Sauces</option>
            <option value="Snacks">Snacks</option>
            <option value="Ingredients">Ingredients</option>
            <option value="Packaging">Packaging</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
          <div>
            Showing <strong className="text-stone-800 dark:text-stone-200">{filteredAlerts.length}</strong> alerts matching criteria
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-stone-400">
              Active Global Thresholds: Critical &le;{state.alertThresholds.criticalDays}d · High &le;{state.alertThresholds.highDays}d · Warning &le;{state.alertThresholds.warningDays}d · Info &le;{state.alertThresholds.infoDays}d
            </span>
          </div>
        </div>
      </div>

      {/* Grouped Alert Cards List */}
      <div className="space-y-6">
        {groupedAlerts.map((group) => {
          if (group.alerts.length === 0) return null;

          let headerColor = 'text-stone-900 dark:text-stone-100';
          let badgeColor = 'bg-stone-100 text-stone-800';

          if (group.severity === 'Expired') {
            headerColor = 'text-rose-700 dark:text-rose-400';
            badgeColor = 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300';
          } else if (group.severity === 'Critical') {
            headerColor = 'text-rose-600 dark:text-rose-400';
            badgeColor = 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300';
          } else if (group.severity === 'High') {
            headerColor = 'text-amber-700 dark:text-amber-400';
            badgeColor = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300';
          } else if (group.severity === 'Warning') {
            headerColor = 'text-yellow-700 dark:text-yellow-400';
            badgeColor = 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300';
          } else if (group.severity === 'Info') {
            headerColor = 'text-blue-700 dark:text-blue-400';
            badgeColor = 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300';
          }

          return (
            <div key={group.severity} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className={`text-sm font-bold uppercase tracking-wider ${headerColor}`}>
                  {group.severity} Priority
                </h2>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                  {group.alerts.length}
                </span>
              </div>

              <div className="space-y-2">
                {group.alerts.map((alert) => {
                  const prod = prodMap.get(alert.sku);
                  const band = getExpiryBand(alert.daysLeft);

                  return (
                    <div
                      key={alert.id}
                      className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors hover:border-stone-300"
                    >
                      {/* Left: Product & Batch Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-stone-900 dark:text-stone-100 text-xs">
                            {alert.batchNo}
                          </span>
                          <span className="text-stone-400 text-xs">·</span>
                          <span className="font-semibold text-stone-800 dark:text-stone-200 text-xs">
                            {prod?.name}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${band.badgeClass}`}>
                            {alert.daysLeft < 0 ? `Expired ${Math.abs(alert.daysLeft)}d ago` : `${alert.daysLeft}d left`}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium">
                            Status: {alert.status}
                          </span>
                        </div>

                        <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-3 flex-wrap">
                          <span>SKU: {alert.sku}</span>
                          <span>Category: {prod?.category}</span>
                          <span>Quantity: {alert.qty} {prod?.unit}</span>
                          <span>Location: {alert.location}</span>
                          <span>Value: {formatPKR(alert.value)}</span>
                          <span>Expiry: {formatDate(alert.expiryDate)}</span>
                        </div>

                        {alert.assignedTo && (
                          <div className="mt-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Assigned to: {alert.assignedTo}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Suggested Action & Status Flow */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 w-full md:w-auto">
                        <div className="w-full sm:w-auto">
                          <label className="text-[10px] text-stone-400 block mb-0.5">Recommended Action</label>
                          <select
                            value={alert.suggestedAction}
                            onChange={(e) => handleActionChange(alert.id, e.target.value as SuggestedAction)}
                            className="w-full sm:w-48 py-1.5 px-2.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium"
                          >
                            <option value="Prioritise dispatch">Prioritise dispatch</option>
                            <option value="Offer discount">Offer discount (5–10%)</option>
                            <option value="Transfer to another channel">Transfer to wholesaler</option>
                            <option value="Quarantine for quality check">Quarantine for QA</option>
                            <option value="Write off">Write off / scrap</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2 pt-2 sm:pt-4">
                          {alert.status === 'Open' ? (
                            <button
                              onClick={() => handleAcknowledge(alert.id, `${state.role} Supervisor`)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white transition-colors"
                            >
                              Acknowledge
                            </button>
                          ) : alert.status === 'Acknowledged' ? (
                            <button
                              onClick={() => handleResolve(alert.id)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 dark:bg-stone-700 hover:bg-stone-700 text-white transition-colors"
                            >
                              Mark Resolved
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Closed</span>
                            </span>
                          )}

                          <button
                            onClick={() => setActivePage('inventory', { sku: alert.sku })}
                            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded"
                            title="Inspect batch in inventory"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Threshold Configuration Drawer / Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-xl w-full rounded-2xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Configure Alert Thresholds
                </h2>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Global Defaults */}
              <div>
                <h3 className="font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wider text-[11px] mb-2">
                  Global Standard Thresholds (Days remaining)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-stone-500 mb-1">Critical (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={tempThresholds.criticalDays}
                      onChange={(e) => setTempThresholds({ ...tempThresholds, criticalDays: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">High (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={tempThresholds.highDays}
                      onChange={(e) => setTempThresholds({ ...tempThresholds, highDays: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">Warning (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={tempThresholds.warningDays}
                      onChange={(e) => setTempThresholds({ ...tempThresholds, warningDays: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">Info (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={tempThresholds.infoDays}
                      onChange={(e) => setTempThresholds({ ...tempThresholds, infoDays: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Per Category Overrides */}
              <div className="pt-3 border-t border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wider text-[11px]">
                    Category-Specific Override
                  </h3>
                  <select
                    value={selectedCatForOverride}
                    onChange={(e) => setSelectedCatForOverride(e.target.value)}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                  >
                    <option value="Snacks">Snacks (Shorter shelf-life)</option>
                    <option value="Packaging">Packaging (Longer shelf-life)</option>
                    <option value="Sauces">Sauces</option>
                    <option value="Biscuits">Biscuits</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-stone-500 mb-1">Critical (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={tempCategoryOverrides[selectedCatForOverride]?.criticalDays || tempThresholds.criticalDays}
                      onChange={(e) => {
                        const cur = tempCategoryOverrides[selectedCatForOverride] || { ...tempThresholds };
                        setTempCategoryOverrides({
                          ...tempCategoryOverrides,
                          [selectedCatForOverride]: { ...cur, criticalDays: Number(e.target.value) },
                        });
                      }}
                      className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">High (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={tempCategoryOverrides[selectedCatForOverride]?.highDays || tempThresholds.highDays}
                      onChange={(e) => {
                        const cur = tempCategoryOverrides[selectedCatForOverride] || { ...tempThresholds };
                        setTempCategoryOverrides({
                          ...tempCategoryOverrides,
                          [selectedCatForOverride]: { ...cur, highDays: Number(e.target.value) },
                        });
                      }}
                      className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">Warning (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={tempCategoryOverrides[selectedCatForOverride]?.warningDays || tempThresholds.warningDays}
                      onChange={(e) => {
                        const cur = tempCategoryOverrides[selectedCatForOverride] || { ...tempThresholds };
                        setTempCategoryOverrides({
                          ...tempCategoryOverrides,
                          [selectedCatForOverride]: { ...cur, warningDays: Number(e.target.value) },
                        });
                      }}
                      className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">Info (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={tempCategoryOverrides[selectedCatForOverride]?.infoDays || tempThresholds.infoDays}
                      onChange={(e) => {
                        const cur = tempCategoryOverrides[selectedCatForOverride] || { ...tempThresholds };
                        setTempCategoryOverrides({
                          ...tempCategoryOverrides,
                          [selectedCatForOverride]: { ...cur, infoDays: Number(e.target.value) },
                        });
                      }}
                      className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 text-xs font-semibold bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
              >
                Apply & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
