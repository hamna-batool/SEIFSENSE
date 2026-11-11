export type ProductCategory =
  | 'Biscuits'
  | 'Wafers'
  | 'Confectionery'
  | 'Pasta'
  | 'Sauces'
  | 'Snacks'
  | 'Ingredients'
  | 'Packaging';

export type ProductUnit = 'carton' | 'kg' | 'bag' | 'roll' | 'pack' | 'box';

export type QualityStatus = 'Released' | 'Hold' | 'Rejected';

export type CustomerType = 'Retail chain' | 'Wholesaler' | 'Distributor' | 'Export';

export type UserRole =
  | 'Manager'
  | 'Warehouse'
  | 'Procurement'
  | 'Sales'
  | 'Quality'
  | 'Finance';

export type AlertSeverity = 'Expired' | 'Critical' | 'High' | 'Warning' | 'Info';

export type AlertStatus = 'Open' | 'Acknowledged' | 'Resolved';

export type SuggestedAction =
  | 'Prioritise dispatch'
  | 'Offer discount'
  | 'Transfer to another channel'
  | 'Quarantine for quality check'
  | 'Write off';

export type WriteOffReason =
  | 'Expired'
  | 'Damaged'
  | 'Quality rejection'
  | 'Returned unsaleable';

export type PurchaseRequestStatus =
  | 'Draft'
  | 'Pending approval'
  | 'Approved'
  | 'Rejected';

export interface Product {
  sku: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  shelfLifeDays: number;
  unitCost: number; // in PKR
  unitPrice: number; // in PKR
  avgDailySales: number; // units/day
  leadTimeDays: number;
  safetyStock: number;
  supplier: string;
  description?: string;
}

export interface Batch {
  batchNo: string;
  sku: string;
  qty: number;
  location: string; // e.g. WH1-A-03
  mfgDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  receivedDate: string; // YYYY-MM-DD
  qualityStatus: QualityStatus;
  note?: string;
  statusChangeHistory?: {
    date: string;
    from: QualityStatus;
    to: QualityStatus;
    reason: string;
    changedBy: string;
  }[];
}

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  minRemainingShelfLifeDays: number; // Retail: 60, Wholesaler: 30, Distributor: 45, Export: 120
  city: string;
  contactPerson: string;
}

export interface PickedAllocation {
  batchNo: string;
  qty: number;
  location: string;
  mfgDate: string;
  expiryDate: string;
  daysLeft: number;
  reason: string;
  isOverride?: boolean;
  overrideReason?: string;
}

export interface ExcludedBatchReason {
  batchNo: string;
  location: string;
  qty: number;
  expiryDate: string;
  daysLeft: number;
  qualityStatus: QualityStatus;
  reason: string;
}

export interface DispatchLine {
  id: string;
  sku: string;
  requestedQty: number;
  allocatedBatches: PickedAllocation[];
  excludedBatches: ExcludedBatchReason[];
  status: 'Fulfilled' | 'Short' | 'Pending';
  shortfall: number;
  shortfallReason?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  date: string;
  lines: DispatchLine[];
  status: 'Pending' | 'Dispatched' | 'Partial';
  totalQty: number;
  totalValue: number;
  dispatchedAt?: string;
  dispatchedBy?: string;
}

export interface OverrideLog {
  id: string;
  timestamp: string;
  orderNo: string;
  sku: string;
  systemBatchNo: string;
  overriddenBatchNo: string;
  reason: string;
  role: UserRole;
  user: string;
}

export interface WriteOff {
  id: string;
  date: string;
  batchNo: string;
  sku: string;
  qty: number;
  unitCost: number;
  value: number; // qty * unitCost in PKR
  reason: WriteOffReason;
  approvedBy: string;
  notes: string;
}

export interface CalculationBreakdown {
  avgDailySales: number;
  leadTimeDays: number;
  safetyStock: number;
  leadTimeDemand: number;
  grossRequirement: number;
  usableStockConsumedBeforeExpiry: number;
  usableStockExpiringBeforeUse: number;
  openPOQty: number;
  netSuggestedOrderQty: number;
}

export interface PurchaseRequest {
  id: string;
  prNumber: string;
  sku: string;
  requestedQty: number;
  estimatedCost: number;
  status: PurchaseRequestStatus;
  requestedBy: string;
  date: string;
  approverComment?: string;
  approver?: string;
  approvedDate?: string;
  simulatedPO?: string;
  calculationBreakdown: CalculationBreakdown;
}

export interface SupplierQuotation {
  id: string;
  sku: string;
  supplier: string;
  city: string;
  pricePerUnit: number; // PKR
  leadTimeDays: number;
  moq: number; // Minimum Order Qty
  paymentTerms: string; // e.g. "Net 30 days", "Advance 50%", "Cash on Delivery"
  notes: string;
  isBestValue?: boolean;
  bestValueReason?: string;
}

export interface AlertThresholds {
  criticalDays: number; // default 7
  highDays: number; // default 14
  warningDays: number; // default 30
  infoDays: number; // default 60
}

export interface CategoryThresholdOverride {
  [category: string]: AlertThresholds;
}

export interface ExpiryAlert {
  id: string;
  sku: string;
  batchNo: string;
  daysLeft: number;
  expiryDate: string;
  qty: number;
  value: number;
  location: string;
  severity: AlertSeverity;
  suggestedAction: SuggestedAction;
  status: AlertStatus;
  assignedTo?: string;
  notes?: string;
  qualityStatus: QualityStatus;
}

export interface MonthlySalesHistory {
  month: string; // "Jan 2026", etc.
  sales: number;
}

export interface ProductSalesHistory {
  sku: string;
  history: MonthlySalesHistory[]; // 12 months
}

export interface ImpactMetricsState {
  timeToPrepareInventoryReportMinutes: { baseline: number | null; prototype: number | null };
  alertCorrectnessPct: { baseline: number | null; prototype: number | null };
  eligibleBatchSelectionAccuracyPct: { baseline: number | null; prototype: number | null };
  expiryRelatedWriteOffValuePkr: { baseline: number | null; prototype: number | null };
}

export interface InterviewNotes {
  [role: string]: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}
