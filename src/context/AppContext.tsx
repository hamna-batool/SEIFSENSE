import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import {
  Product,
  Batch,
  Customer,
  Order,
  WriteOff,
  PurchaseRequest,
  SupplierQuotation,
  AlertThresholds,
  CategoryThresholdOverride,
  ExpiryAlert,
  UserRole,
  OverrideLog,
  ImpactMetricsState,
  InterviewNotes,
  ToastMessage,
  QualityStatus,
  WriteOffReason,
  SuggestedAction,
  ProductSalesHistory,
} from '../types';
import {
  BASE_TODAY,
  SEED_PRODUCTS,
  SEED_CUSTOMERS,
  generateSeedBatches,
  generateSeedOrders,
  SEED_WRITE_OFFS,
  SEED_PURCHASE_REQUESTS,
  SEED_SUPPLIER_QUOTATIONS,
  DEFAULT_ALERT_THRESHOLDS,
  DEFAULT_CATEGORY_OVERRIDES,
  SEED_INTERVIEW_NOTES,
  generateSalesHistory,
} from '../data/seedData';
import {
  evaluateBatchAlert,
  getDaysDifference,
  allocateFefoOrderLine,
  calculateReorderNeed,
  formatDate,
} from '../rules/rulesEngine';

const STORAGE_KEY = 'shelfsense_state_v1';

export type PageId =
  | 'dashboard'
  | 'inventory'
  | 'dispatch'
  | 'alerts'
  | 'slow-moving'
  | 'purchasing'
  | 'forecast'
  | 'writeoffs'
  | 'impact'
  | 'workflow'
  | 'roles';

export interface AppState {
  today: string;
  role: UserRole;
  currentPage: PageId;
  products: Product[];
  batches: Batch[];
  customers: Customer[];
  orders: Order[];
  writeOffs: WriteOff[];
  purchaseRequests: PurchaseRequest[];
  supplierQuotations: SupplierQuotation[];
  alertThresholds: AlertThresholds;
  categoryOverrides: CategoryThresholdOverride;
  alertUserOverrides: Record<string, { status: 'Open' | 'Acknowledged' | 'Resolved'; assignedTo?: string; action?: SuggestedAction; notes?: string }>;
  overrideLogs: OverrideLog[];
  salesHistory: ProductSalesHistory[];
  interviewNotes: InterviewNotes;
  impactMetrics: ImpactMetricsState;
  darkMode: boolean;
  toasts: ToastMessage[];
  searchModalOpen: boolean;
  rulesDrawerOpen: boolean;
  inventoryFilterParam?: { category?: string; status?: string; expiryBand?: string; sku?: string };
}

type Action =
  | { type: 'SET_ROLE'; payload: UserRole }
  | { type: 'SET_PAGE'; payload: PageId; filterParam?: AppState['inventoryFilterParam'] }
  | { type: 'SIMULATE_DAYS'; payload: { days: number } }
  | { type: 'RESET_DATA' }
  | { type: 'RECEIVE_BATCH'; payload: Batch }
  | { type: 'UPDATE_BATCH_STATUS'; payload: { batchNo: string; newStatus: QualityStatus; reason: string; user: string } }
  | { type: 'UPDATE_BATCH'; payload: Batch }
  | { type: 'CREATE_WRITE_OFF'; payload: { batchNo: string; qty: number; reason: WriteOffReason; notes: string; approvedBy: string } }
  | { type: 'DISPATCH_ORDER'; payload: { order: Order; overrideLogs: OverrideLog[]; deductedBatches: { batchNo: string; deductQty: number }[] } }
  | { type: 'UPDATE_ALERT'; payload: { alertId: string; status?: 'Open' | 'Acknowledged' | 'Resolved'; assignedTo?: string; action?: SuggestedAction; notes?: string } }
  | { type: 'UPDATE_THRESHOLDS'; payload: { thresholds: AlertThresholds; categoryOverrides: CategoryThresholdOverride } }
  | { type: 'CREATE_PURCHASE_REQUEST'; payload: { sku: string; qty: number; requestedBy: string } }
  | { type: 'APPROVE_PURCHASE_REQUEST'; payload: { prId: string; comment: string; approver: string } }
  | { type: 'REJECT_PURCHASE_REQUEST'; payload: { prId: string; comment: string; approver: string } }
  | { type: 'UPDATE_INTERVIEW_NOTE'; payload: { role: string; notes: string } }
  | { type: 'UPDATE_IMPACT_METRIC'; payload: { field: keyof ImpactMetricsState; metricType: 'baseline' | 'prototype'; value: number | null } }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'ADD_TOAST'; payload: Omit<ToastMessage, 'id' | 'timestamp'> }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'SET_SEARCH_MODAL'; payload: boolean }
  | { type: 'SET_RULES_DRAWER'; payload: boolean };

function getInitialState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure dark mode applies
      if (parsed.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return {
        ...parsed,
        toasts: [],
        searchModalOpen: false,
        rulesDrawerOpen: false,
      };
    }
  } catch (err) {
    console.warn('Could not parse localStorage, falling back to seed:', err);
  }

  return {
    today: BASE_TODAY,
    role: 'Warehouse', // default role
    currentPage: 'dashboard',
    products: SEED_PRODUCTS,
    batches: generateSeedBatches(),
    customers: SEED_CUSTOMERS,
    orders: generateSeedOrders(),
    writeOffs: SEED_WRITE_OFFS,
    purchaseRequests: SEED_PURCHASE_REQUESTS,
    supplierQuotations: SEED_SUPPLIER_QUOTATIONS,
    alertThresholds: DEFAULT_ALERT_THRESHOLDS,
    categoryOverrides: DEFAULT_CATEGORY_OVERRIDES,
    alertUserOverrides: {},
    overrideLogs: [],
    salesHistory: generateSalesHistory(),
    interviewNotes: SEED_INTERVIEW_NOTES,
    impactMetrics: {
      timeToPrepareInventoryReportMinutes: { baseline: null, prototype: null },
      alertCorrectnessPct: { baseline: null, prototype: null },
      eligibleBatchSelectionAccuracyPct: { baseline: null, prototype: null },
      expiryRelatedWriteOffValuePkr: { baseline: null, prototype: null },
    },
    darkMode: false,
    toasts: [],
    searchModalOpen: false,
    rulesDrawerOpen: false,
  };
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.payload };

    case 'SET_PAGE':
      return {
        ...state,
        currentPage: action.payload,
        inventoryFilterParam: action.filterParam,
      };

    case 'SIMULATE_DAYS': {
      const { days } = action.payload;
      const curDate = new Date(state.today);
      curDate.setDate(curDate.getDate() + days);
      const newToday = curDate.toISOString().split('T')[0];

      // Simulate daily sales consumption across released batches for active finished products
      let totalUnitsConsumed = 0;
      const updatedBatches = state.batches.map((b) => {
        // Only deplete released finished goods with remaining qty
        const prod = state.products.find((p) => p.sku === b.sku);
        if (!prod || b.qualityStatus !== 'Released' || b.qty <= 0) return b;
        if (prod.category === 'Ingredients' || prod.category === 'Packaging') return b;

        // Daily random consumption proportional to avgDailySales
        const expectedConsumption = Math.round(prod.avgDailySales * days * 0.25);
        if (expectedConsumption <= 0) return b;
        const actualDeduct = Math.min(b.qty, expectedConsumption);
        totalUnitsConsumed += actualDeduct;
        return {
          ...b,
          qty: b.qty - actualDeduct,
        };
      });

      return {
        ...state,
        today: newToday,
        batches: updatedBatches,
      };
    }

    case 'RESET_DATA': {
      localStorage.removeItem(STORAGE_KEY);
      const fresh = {
        today: BASE_TODAY,
        role: state.role,
        currentPage: 'dashboard' as PageId,
        products: SEED_PRODUCTS,
        batches: generateSeedBatches(),
        customers: SEED_CUSTOMERS,
        orders: generateSeedOrders(),
        writeOffs: SEED_WRITE_OFFS,
        purchaseRequests: SEED_PURCHASE_REQUESTS,
        supplierQuotations: SEED_SUPPLIER_QUOTATIONS,
        alertThresholds: DEFAULT_ALERT_THRESHOLDS,
        categoryOverrides: DEFAULT_CATEGORY_OVERRIDES,
        alertUserOverrides: {},
        overrideLogs: [],
        salesHistory: generateSalesHistory(),
        interviewNotes: SEED_INTERVIEW_NOTES,
        impactMetrics: {
          timeToPrepareInventoryReportMinutes: { baseline: null, prototype: null },
          alertCorrectnessPct: { baseline: null, prototype: null },
          eligibleBatchSelectionAccuracyPct: { baseline: null, prototype: null },
          expiryRelatedWriteOffValuePkr: { baseline: null, prototype: null },
        },
        darkMode: state.darkMode,
        toasts: [
          {
            id: String(Date.now()),
            title: 'Demo Data Reset',
            message: 'All synthetic batches, orders, and alert states have been reset to default baseline.',
            type: 'info' as const,
            timestamp: Date.now(),
          },
        ],
        searchModalOpen: false,
        rulesDrawerOpen: false,
      };
      return fresh;
    }

    case 'RECEIVE_BATCH': {
      return {
        ...state,
        batches: [action.payload, ...state.batches],
      };
    }

    case 'UPDATE_BATCH_STATUS': {
      const { batchNo, newStatus, reason, user } = action.payload;
      const updatedBatches = state.batches.map((b) => {
        if (b.batchNo !== batchNo) return b;
        const history = b.statusChangeHistory ? [...b.statusChangeHistory] : [];
        history.push({
          date: state.today,
          from: b.qualityStatus,
          to: newStatus,
          reason,
          changedBy: user,
        });
        return {
          ...b,
          qualityStatus: newStatus,
          statusChangeHistory: history,
        };
      });
      return {
        ...state,
        batches: updatedBatches,
      };
    }

    case 'UPDATE_BATCH': {
      const updatedBatches = state.batches.map((b) => (b.batchNo === action.payload.batchNo ? action.payload : b));
      return {
        ...state,
        batches: updatedBatches,
      };
    }

    case 'CREATE_WRITE_OFF': {
      const { batchNo, qty, reason, notes, approvedBy } = action.payload;
      const targetBatch = state.batches.find((b) => b.batchNo === batchNo);
      if (!targetBatch) return state;
      const prod = state.products.find((p) => p.sku === targetBatch.sku);
      const unitCost = prod ? prod.unitCost : 0;
      const value = qty * unitCost;

      const newWriteOff: WriteOff = {
        id: `WO-${Date.now()}`,
        date: state.today,
        batchNo,
        sku: targetBatch.sku,
        qty,
        unitCost,
        value,
        reason,
        approvedBy,
        notes,
      };

      // Deduct or zero out quantity from batch
      const updatedBatches = state.batches.map((b) => {
        if (b.batchNo !== batchNo) return b;
        return {
          ...b,
          qty: Math.max(0, b.qty - qty),
          qualityStatus: (b.qty - qty <= 0 && (reason === 'Quality rejection' || reason === 'Expired') ? 'Rejected' : b.qualityStatus) as QualityStatus,
        };
      });

      return {
        ...state,
        writeOffs: [newWriteOff, ...state.writeOffs],
        batches: updatedBatches,
      };
    }

    case 'DISPATCH_ORDER': {
      const { order, overrideLogs, deductedBatches } = action.payload;
      // Deduct stock from batches
      const deductMap = new Map(deductedBatches.map((d) => [d.batchNo, d.deductQty]));
      const updatedBatches = state.batches.map((b) => {
        const deduct = deductMap.get(b.batchNo);
        if (!deduct) return b;
        return {
          ...b,
          qty: Math.max(0, b.qty - deduct),
        };
      });

      return {
        ...state,
        orders: [order, ...state.orders],
        overrideLogs: [...overrideLogs, ...state.overrideLogs],
        batches: updatedBatches,
      };
    }

    case 'UPDATE_ALERT': {
      const { alertId, status, assignedTo, action: suggestedAction, notes } = action.payload;
      const current = state.alertUserOverrides[alertId] || { status: 'Open' };
      return {
        ...state,
        alertUserOverrides: {
          ...state.alertUserOverrides,
          [alertId]: {
            ...current,
            status: status || current.status,
            assignedTo: assignedTo !== undefined ? assignedTo : current.assignedTo,
            action: suggestedAction || current.action,
            notes: notes !== undefined ? notes : current.notes,
          },
        },
      };
    }

    case 'UPDATE_THRESHOLDS': {
      return {
        ...state,
        alertThresholds: action.payload.thresholds,
        categoryOverrides: action.payload.categoryOverrides,
      };
    }

    case 'CREATE_PURCHASE_REQUEST': {
      const { sku, qty, requestedBy } = action.payload;
      const prod = state.products.find((p) => p.sku === sku);
      if (!prod) return state;

      const calculation = calculateReorderNeed(prod, state.batches, 0, state.today);
      const newPr: PurchaseRequest = {
        id: `PR-${Date.now()}`,
        prNumber: `PR-MLT-${Math.floor(100 + Math.random() * 900)}`,
        sku,
        requestedQty: qty,
        estimatedCost: qty * prod.unitCost,
        status: 'Pending approval',
        requestedBy,
        date: state.today,
        calculationBreakdown: calculation,
      };

      return {
        ...state,
        purchaseRequests: [newPr, ...state.purchaseRequests],
      };
    }

    case 'APPROVE_PURCHASE_REQUEST': {
      const { prId, comment, approver } = action.payload;
      const updatedPrs = state.purchaseRequests.map((pr) => {
        if (pr.id !== prId) return pr;
        return {
          ...pr,
          status: 'Approved' as const,
          approver,
          approverComment: comment,
          approvedDate: state.today,
          simulatedPO: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        };
      });
      return {
        ...state,
        purchaseRequests: updatedPrs,
      };
    }

    case 'REJECT_PURCHASE_REQUEST': {
      const { prId, comment, approver } = action.payload;
      const updatedPrs = state.purchaseRequests.map((pr) => {
        if (pr.id !== prId) return pr;
        return {
          ...pr,
          status: 'Rejected' as const,
          approver,
          approverComment: comment,
          approvedDate: state.today,
        };
      });
      return {
        ...state,
        purchaseRequests: updatedPrs,
      };
    }

    case 'UPDATE_INTERVIEW_NOTE': {
      return {
        ...state,
        interviewNotes: {
          ...state.interviewNotes,
          [action.payload.role]: action.payload.notes,
        },
      };
    }

    case 'UPDATE_IMPACT_METRIC': {
      const { field, metricType, value } = action.payload;
      return {
        ...state,
        impactMetrics: {
          ...state.impactMetrics,
          [field]: {
            ...state.impactMetrics[field],
            [metricType]: value,
          },
        },
      };
    }

    case 'TOGGLE_DARK_MODE': {
      const newDark = !state.darkMode;
      if (newDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return {
        ...state,
        darkMode: newDark,
      };
    }

    case 'ADD_TOAST': {
      const newToast: ToastMessage = {
        ...action.payload,
        id: String(Date.now()) + Math.random(),
        timestamp: Date.now(),
      };
      return {
        ...state,
        toasts: [...state.toasts, newToast],
      };
    }

    case 'REMOVE_TOAST': {
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };
    }

    case 'SET_SEARCH_MODAL':
      return { ...state, searchModalOpen: action.payload };

    case 'SET_RULES_DRAWER':
      return { ...state, rulesDrawerOpen: action.payload };

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  computedAlerts: ExpiryAlert[];
  unacknowledgedAlertCount: number;
  setRole: (role: UserRole) => void;
  setActivePage: (pageId: PageId, filterParam?: AppState['inventoryFilterParam']) => void;
  simulateDays: (days: number) => void;
  resetDemoData: () => void;
  addToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  toggleDarkMode: () => void;
  setSearchModal: (open: boolean) => void;
  setRulesDrawer: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);

  // Sync state to localStorage on changes (excluding ephemeral UI dialogs)
  useEffect(() => {
    try {
      const { toasts, searchModalOpen, rulesDrawerOpen, ...persistable } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [state]);

  // Dynamically compute all alerts based on current batches, today, thresholds, and user overrides
  const prodMap = new Map(state.products.map((p) => [p.sku, p]));
  const computedAlerts: ExpiryAlert[] = [];

  for (const batch of state.batches) {
    const prod = prodMap.get(batch.sku);
    if (!prod) continue;
    const thresholds = state.categoryOverrides[prod.category] || state.alertThresholds;
    const alert = evaluateBatchAlert(batch, prod, thresholds, state.today);
    if (alert) {
      const userOverride = state.alertUserOverrides[alert.id];
      if (userOverride) {
        if (userOverride.status) alert.status = userOverride.status;
        if (userOverride.assignedTo) alert.assignedTo = userOverride.assignedTo;
        if (userOverride.action) alert.suggestedAction = userOverride.action;
        if (userOverride.notes) alert.notes = userOverride.notes;
      }
      computedAlerts.push(alert);
    }
  }

  // Count unacknowledged Critical and High alerts
  const unacknowledgedAlertCount = computedAlerts.filter(
    (a) => (a.severity === 'Critical' || a.severity === 'High') && a.status === 'Open'
  ).length;

  const setRole = (role: UserRole) => {
    dispatch({ type: 'SET_ROLE', payload: role });
  };

  const setActivePage = (pageId: PageId, filterParam?: AppState['inventoryFilterParam']) => {
    dispatch({ type: 'SET_PAGE', payload: pageId, filterParam });
  };

  const simulateDays = (days: number) => {
    dispatch({ type: 'SIMULATE_DAYS', payload: { days } });
    const curDate = new Date(state.today);
    curDate.setDate(curDate.getDate() + days);
    const newDateStr = formatDate(curDate.toISOString().split('T')[0]);

    // Count batches moving into critical
    let newlyCritical = 0;
    for (const b of state.batches) {
      const oldDiff = getDaysDifference(b.expiryDate, state.today);
      const newDiff = oldDiff - days;
      if (oldDiff > 7 && newDiff <= 7 && newDiff >= 0) {
        newlyCritical++;
      }
    }

    addToast(
      `Simulated +${days} Day${days > 1 ? 's' : ''}`,
      `Current date advanced to ${newDateStr}. Alerts recalculated${newlyCritical > 0 ? ` (${newlyCritical} batch moved to critical)` : ''}.`,
      'info'
    );
  };

  const resetDemoData = () => {
    dispatch({ type: 'RESET_DATA' });
  };

  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    dispatch({ type: 'ADD_TOAST', payload: { title, message, type } });
  };

  const removeToast = (id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  };

  const toggleDarkMode = () => {
    dispatch({ type: 'TOGGLE_DARK_MODE' });
  };

  const setSearchModal = (open: boolean) => {
    dispatch({ type: 'SET_SEARCH_MODAL', payload: open });
  };

  const setRulesDrawer = (open: boolean) => {
    dispatch({ type: 'SET_RULES_DRAWER', payload: open });
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        computedAlerts,
        unacknowledgedAlertCount,
        setRole,
        setActivePage,
        simulateDays,
        resetDemoData,
        addToast,
        removeToast,
        toggleDarkMode,
        setSearchModal,
        setRulesDrawer,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
