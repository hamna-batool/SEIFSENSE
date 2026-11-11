import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Batch, QualityStatus, WriteOffReason } from '../../types';
import {
  formatDate,
  formatPKR,
  getDaysDifference,
  getExpiryBand,
} from '../../rules/rulesEngine';
import {
  Search,
  Filter,
  Plus,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  History,
  AlertCircle,
  CheckCircle,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';

export const BatchInventoryPage: React.FC = () => {
  const { state, dispatch, addToast } = useApp();

  // Search & Filter States
  const [search, setSearch] = useState(state.inventoryFilterParam?.sku || '');
  const [categoryFilter, setCategoryFilter] = useState(state.inventoryFilterParam?.category || 'All');
  const [statusFilter, setStatusFilter] = useState(state.inventoryFilterParam?.status || 'All');
  const [expiryBandFilter, setExpiryBandFilter] = useState(state.inventoryFilterParam?.expiryBand || 'All');
  const [locationFilter, setLocationFilter] = useState('All');

  // Sorting
  const [sortField, setSortField] = useState<'daysLeft' | 'expiryDate' | 'qty' | 'value' | 'batchNo'>('daysLeft');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Selected Batch for Detail Drawer
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  // Receive Stock Modal State
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [newBatchForm, setNewBatchForm] = useState({
    sku: state.products[0]?.sku || '',
    batchNo: '',
    qty: 50,
    location: 'WH1-A-01',
    mfgDate: state.today,
    expiryDate: '',
    note: '',
    qualityStatus: 'Released' as QualityStatus,
  });

  // Change Status in Drawer
  const [changeStatusOpen, setChangeStatusOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<QualityStatus>('Hold');
  const [statusReason, setStatusReason] = useState('');

  // Write off dialog
  const [writeOffOpen, setWriteOffOpen] = useState(false);
  const [writeOffQty, setWriteOffQty] = useState(1);
  const [writeOffReason, setWriteOffReason] = useState<WriteOffReason>('Expired');
  const [writeOffNotes, setWriteOffNotes] = useState('');

  const prodMap = useMemo(() => new Map(state.products.map((p) => [p.sku, p])), [state.products]);

  // Unique locations list
  const uniqueLocations = useMemo(() => {
    const set = new Set(state.batches.map((b) => b.location.split('-')[0]));
    return Array.from(set).sort();
  }, [state.batches]);

  // Compute enriched list with daysLeft & value
  const enrichedBatches = useMemo(() => {
    return state.batches.map((b) => {
      const prod = prodMap.get(b.sku);
      const daysLeft = getDaysDifference(b.expiryDate, state.today);
      const value = b.qty * (prod ? prod.unitCost : 0);
      return {
        ...b,
        productName: prod ? prod.name : 'Unknown Product',
        category: prod ? prod.category : 'General',
        unit: prod ? prod.unit : 'unit',
        unitCost: prod ? prod.unitCost : 0,
        daysLeft,
        value,
      };
    });
  }, [state.batches, state.today, prodMap]);

  // Filtering
  const filteredBatches = useMemo(() => {
    return enrichedBatches.filter((b) => {
      if (search) {
        const q = search.toLowerCase();
        const matchSku = b.sku.toLowerCase().includes(q);
        const matchName = b.productName.toLowerCase().includes(q);
        const matchBatch = b.batchNo.toLowerCase().includes(q);
        const matchLoc = b.location.toLowerCase().includes(q);
        if (!matchSku && !matchName && !matchBatch && !matchLoc) return false;
      }

      if (categoryFilter !== 'All' && b.category !== categoryFilter) return false;
      if (statusFilter !== 'All' && b.qualityStatus !== statusFilter) return false;
      if (locationFilter !== 'All' && !b.location.startsWith(locationFilter)) return false;

      if (expiryBandFilter === 'Expired' && b.daysLeft >= 0) return false;
      if (expiryBandFilter === '<30' && (b.daysLeft < 0 || b.daysLeft >= 30)) return false;
      if (expiryBandFilter === '30-60' && (b.daysLeft < 30 || b.daysLeft > 60)) return false;
      if (expiryBandFilter === '>60' && b.daysLeft <= 60) return false;

      return true;
    });
  }, [enrichedBatches, search, categoryFilter, statusFilter, locationFilter, expiryBandFilter]);

  // Sorting
  const sortedBatches = useMemo(() => {
    return [...filteredBatches].sort((a, b) => {
      let diff = 0;
      if (sortField === 'daysLeft') diff = a.daysLeft - b.daysLeft;
      else if (sortField === 'expiryDate') diff = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      else if (sortField === 'qty') diff = a.qty - b.qty;
      else if (sortField === 'value') diff = a.value - b.value;
      else if (sortField === 'batchNo') diff = a.batchNo.localeCompare(b.batchNo);
      return sortAsc ? diff : -diff;
    });
  }, [filteredBatches, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedBatches.length / pageSize) || 1;
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedBatches.slice(start, start + pageSize);
  }, [sortedBatches, currentPage]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Batch No', 'SKU', 'Product Name', 'Category', 'Quantity', 'Unit', 'Location', 'Mfg Date', 'Expiry Date', 'Days Left', 'Quality Status', 'Cost (PKR)', 'Total Value (PKR)'];
    const rows = sortedBatches.map((b) => [
      b.batchNo,
      b.sku,
      `"${b.productName.replace(/"/g, '""')}"`,
      b.category,
      b.qty,
      b.unit,
      b.location,
      b.mfgDate,
      b.expiryDate,
      b.daysLeft,
      b.qualityStatus,
      b.unitCost,
      b.value,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ShelfSense_Batches_${state.today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSV Exported', `Exported ${sortedBatches.length} batch records.`, 'success');
  };

  // Handle Receive Stock Submit
  const handleReceiveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchForm.batchNo.trim()) {
      addToast('Validation Error', 'Batch number is required.', 'error');
      return;
    }
    // Check duplicate batch number
    if (state.batches.some((b) => b.batchNo.toLowerCase() === newBatchForm.batchNo.trim().toLowerCase())) {
      addToast('Validation Error', `Batch number ${newBatchForm.batchNo} already exists in inventory.`, 'error');
      return;
    }
    if (newBatchForm.qty <= 0) {
      addToast('Validation Error', 'Quantity must be greater than zero.', 'error');
      return;
    }
    if (!newBatchForm.expiryDate) {
      addToast('Validation Error', 'Expiry date is required.', 'error');
      return;
    }
    if (new Date(newBatchForm.expiryDate) <= new Date(newBatchForm.mfgDate)) {
      addToast('Validation Error', 'Expiry date must be after manufacture date.', 'error');
      return;
    }

    const newBatch: Batch = {
      batchNo: newBatchForm.batchNo.trim().toUpperCase(),
      sku: newBatchForm.sku,
      qty: Number(newBatchForm.qty),
      location: newBatchForm.location,
      mfgDate: newBatchForm.mfgDate,
      expiryDate: newBatchForm.expiryDate,
      receivedDate: state.today,
      qualityStatus: newBatchForm.qualityStatus,
      note: newBatchForm.note || 'Manually received stock',
    };

    dispatch({ type: 'RECEIVE_BATCH', payload: newBatch });
    addToast('Stock Received', `Batch ${newBatch.batchNo} (${newBatch.qty} units) added to inventory.`, 'success');
    setReceiveModalOpen(false);
    setNewBatchForm({
      sku: state.products[0]?.sku || '',
      batchNo: '',
      qty: 50,
      location: 'WH1-A-01',
      mfgDate: state.today,
      expiryDate: '',
      note: '',
      qualityStatus: 'Released',
    });
  };

  // Handle Status Change with Role Permission Check
  const handleStatusChangeSubmit = () => {
    if (!selectedBatch) return;
    if (!statusReason.trim()) {
      addToast('Reason Required', 'Please provide an audit explanation for this quality status transition.', 'warning');
      return;
    }

    // Role check: Only Quality or Manager can change Hold -> Released
    if (selectedBatch.qualityStatus === 'Hold' && targetStatus === 'Released') {
      if (state.role !== 'Quality' && state.role !== 'Manager') {
        addToast(
          'Permission Denied',
          `Only Quality Assurance Officers or Plant Managers can release quarantined batches. Current role: ${state.role}`,
          'error'
        );
        return;
      }
    }

    dispatch({
      type: 'UPDATE_BATCH_STATUS',
      payload: {
        batchNo: selectedBatch.batchNo,
        newStatus: targetStatus,
        reason: statusReason.trim(),
        user: `${state.role} User`,
      },
    });

    addToast(
      'Quality Status Updated',
      `Batch ${selectedBatch.batchNo} status changed from ${selectedBatch.qualityStatus} to ${targetStatus}.`,
      'success'
    );

    // Update local drawer state
    setSelectedBatch({
      ...selectedBatch,
      qualityStatus: targetStatus,
    });
    setChangeStatusOpen(false);
    setStatusReason('');
  };

  // Handle Write-Off
  const handleWriteOffSubmit = () => {
    if (!selectedBatch) return;
    if (writeOffQty <= 0 || writeOffQty > selectedBatch.qty) {
      addToast('Invalid Quantity', `Write-off quantity must be between 1 and ${selectedBatch.qty}.`, 'error');
      return;
    }
    if (!writeOffNotes.trim()) {
      addToast('Reason Required', 'Please provide mandatory notes for GL write-off audit.', 'warning');
      return;
    }

    dispatch({
      type: 'CREATE_WRITE_OFF',
      payload: {
        batchNo: selectedBatch.batchNo,
        qty: Number(writeOffQty),
        reason: writeOffReason,
        notes: writeOffNotes.trim(),
        approvedBy: `${state.role} Authorized`,
      },
    });

    addToast(
      'Write-Off Logged',
      `Successfully logged write-off of ${writeOffQty} units for batch ${selectedBatch.batchNo}.`,
      'success'
    );

    setSelectedBatch(null);
    setWriteOffOpen(false);
    setWriteOffNotes('');
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Batch Inventory Management
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Full physical warehouse ledger: shelf-life tracking, QA quarantine states, and bin locations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setReceiveModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Receive New Batch</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search by SKU, Product Name, Batch Number, or Location (e.g. WH1-A-01)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-stone-400 hover:text-stone-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-44 py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:outline-none"
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

          {/* Quality Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-36 py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Released">Released Only</option>
            <option value="Hold">On Hold</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Expiry Window Filter */}
          <select
            value={expiryBandFilter}
            onChange={(e) => {
              setExpiryBandFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-40 py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:outline-none"
          >
            <option value="All">All Expiry Windows</option>
            <option value="Expired">Expired (&lt;0d)</option>
            <option value="<30">Critical (&lt;30d)</option>
            <option value="30-60">Warning (30–60d)</option>
            <option value=">60">Healthy (&gt;60d)</option>
          </select>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-32 py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:outline-none"
          >
            <option value="All">All Warehouses</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Filter stats & clear action */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
          <div>
            Showing <strong className="text-stone-800 dark:text-stone-200">{filteredBatches.length}</strong> of{' '}
            {state.batches.length} total batches
          </div>
          {(search || categoryFilter !== 'All' || statusFilter !== 'All' || expiryBandFilter !== 'All' || locationFilter !== 'All') && (
            <button
              onClick={() => {
                setSearch('');
                setCategoryFilter('All');
                setStatusFilter('All');
                setExpiryBandFilter('All');
                setLocationFilter('All');
                setCurrentPage(1);
              }}
              className="text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                <th className="py-3 px-4 font-semibold">SKU & Product Name</th>
                <th
                  onClick={() => toggleSort('batchNo')}
                  className="py-3 px-3 font-semibold cursor-pointer hover:text-stone-800 dark:hover:text-stone-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Batch No</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('qty')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-stone-800 dark:hover:text-stone-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>On-Hand Qty</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 font-semibold">Location</th>
                <th className="py-3 px-3 font-semibold">Mfg Date</th>
                <th
                  onClick={() => toggleSort('expiryDate')}
                  className="py-3 px-3 font-semibold cursor-pointer hover:text-stone-800 dark:hover:text-stone-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Expiry Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('daysLeft')}
                  className="py-3 px-3 font-semibold cursor-pointer hover:text-stone-800 dark:hover:text-stone-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Days Left</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 font-semibold">Quality Status</th>
                <th
                  onClick={() => toggleSort('value')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-stone-800 dark:hover:text-stone-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Stock Value</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {paginatedBatches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-stone-400">
                    No batches match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedBatches.map((b) => {
                  const band = getExpiryBand(b.daysLeft);
                  return (
                    <tr
                      key={b.batchNo}
                      className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900 dark:text-stone-100 truncate max-w-xs">
                          {b.productName}
                        </div>
                        <div className="font-mono text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                          <span>{b.sku}</span>
                          <span>·</span>
                          <span>{b.category}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono font-semibold text-stone-800 dark:text-stone-200">
                        {b.batchNo}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-stone-900 dark:text-stone-100">
                        {b.qty.toLocaleString()} <span className="text-stone-400 text-[10px]">{b.unit}</span>
                      </td>

                      <td className="py-3 px-3 font-mono text-stone-600 dark:text-stone-300">
                        {b.location}
                      </td>

                      <td className="py-3 px-3 text-stone-500 whitespace-nowrap">
                        {formatDate(b.mfgDate)}
                      </td>

                      <td className="py-3 px-3 text-stone-800 dark:text-stone-200 font-medium whitespace-nowrap">
                        {formatDate(b.expiryDate)}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${band.badgeClass}`}>
                          {b.daysLeft < 0 ? `Expired (${Math.abs(b.daysLeft)}d)` : `${b.daysLeft}d left`}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            b.qualityStatus === 'Released'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : b.qualityStatus === 'Hold'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {b.qualityStatus}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                        {formatPKR(b.value)}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedBatch(b);
                            setTargetStatus(b.qualityStatus === 'Hold' ? 'Released' : 'Hold');
                          }}
                          className="px-2.5 py-1 text-[11px] rounded-lg border border-stone-200 dark:border-stone-700 hover:border-emerald-600 text-stone-700 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 flex items-center justify-between text-xs text-stone-500">
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-stone-800 dark:text-stone-200">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Batch Details Drawer */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 h-full shadow-2xl flex flex-col border-l border-stone-200 dark:border-stone-800 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-stone-400">
                  Batch Master Record
                </span>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono">
                  {selectedBatch.batchNo}
                </h2>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs text-stone-700 dark:text-stone-300">
              {/* Product Info */}
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                <div className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                  {prodMap.get(selectedBatch.sku)?.name}
                </div>
                <div className="text-stone-500 font-mono text-[11px] mt-0.5">
                  {selectedBatch.sku} · Category: {prodMap.get(selectedBatch.sku)?.category}
                </div>
              </div>

              {/* Status and Parameters */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-lg">
                  <div className="text-stone-400 text-[10px]">On-Hand Quantity</div>
                  <div className="text-sm font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                    {selectedBatch.qty} {prodMap.get(selectedBatch.sku)?.unit}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-lg">
                  <div className="text-stone-400 text-[10px]">Location Bin</div>
                  <div className="text-sm font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                    {selectedBatch.location}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-lg">
                  <div className="text-stone-400 text-[10px]">Manufacture Date</div>
                  <div className="font-medium text-stone-800 dark:text-stone-200 mt-0.5">
                    {formatDate(selectedBatch.mfgDate)}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-lg">
                  <div className="text-stone-400 text-[10px]">Expiry Date</div>
                  <div className="font-medium text-stone-800 dark:text-stone-200 mt-0.5">
                    {formatDate(selectedBatch.expiryDate)}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-lg">
                  <div className="text-stone-400 text-[10px]">Days Remaining</div>
                  <div className="font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                    {getDaysDifference(selectedBatch.expiryDate, state.today)} days
                  </div>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-lg">
                  <div className="text-stone-400 text-[10px]">Quality Status</div>
                  <div className="font-bold mt-0.5 text-emerald-700 dark:text-emerald-400">
                    {selectedBatch.qualityStatus}
                  </div>
                </div>
              </div>

              {/* Note */}
              {selectedBatch.note && (
                <div>
                  <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Inspection / Batch Note
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-lg text-stone-600 dark:text-stone-300 italic">
                    &quot;{selectedBatch.note}&quot;
                  </div>
                </div>
              )}

              {/* Status History */}
              {selectedBatch.statusChangeHistory && selectedBatch.statusChangeHistory.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> Quality Audit Trail
                  </div>
                  <div className="space-y-2">
                    {selectedBatch.statusChangeHistory.map((h, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 text-[11px]">
                        <div className="flex items-center justify-between text-stone-500">
                          <span>{formatDate(h.date)}</span>
                          <span className="font-semibold text-stone-700 dark:text-stone-300">{h.changedBy}</span>
                        </div>
                        <div className="mt-1 font-medium text-stone-800 dark:text-stone-200">
                          Status changed: {h.from} &rarr; {h.to}
                        </div>
                        <div className="text-stone-500 mt-0.5">&quot;{h.reason}&quot;</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Section */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
                <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Batch Operations
                </div>

                {/* Change Status Form */}
                {!changeStatusOpen ? (
                  <button
                    onClick={() => setChangeStatusOpen(true)}
                    className="w-full py-2 px-3 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-left flex items-center justify-between"
                  >
                    <span>Change Quality Status (Hold / Released / Rejected)</span>
                    <SlidersHorizontal className="w-4 h-4 text-stone-400" />
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2.5">
                    <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      Update Quality Status
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-500 block mb-1">New Target Status</label>
                      <select
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value as QualityStatus)}
                        className="w-full p-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                      >
                        <option value="Released">Released (Lab approval)</option>
                        <option value="Hold">Hold (Quarantine / Re-assay)</option>
                        <option value="Rejected">Rejected (Failed QA tests)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-500 block mb-1">Mandatory Audit Reason</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Laboratory moisture and microbial count passed spec..."
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setChangeStatusOpen(false)}
                        className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleStatusChangeSubmit}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-800 text-white rounded-lg hover:bg-emerald-700"
                      >
                        Confirm Status Update
                      </button>
                    </div>
                  </div>
                )}

                {/* Write-off Button */}
                {!writeOffOpen ? (
                  <button
                    onClick={() => {
                      setWriteOffOpen(true);
                      setWriteOffQty(selectedBatch.qty);
                    }}
                    className="w-full py-2 px-3 text-xs font-medium rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors text-left flex items-center justify-between"
                  >
                    <span>Log Inventory Write-Off</span>
                    <FileText className="w-4 h-4 text-rose-500" />
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 space-y-2.5">
                    <div className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                      Log Stock Write-Off
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-stone-500 block mb-1">Quantity to Write Off</label>
                        <input
                          type="number"
                          max={selectedBatch.qty}
                          min={1}
                          value={writeOffQty}
                          onChange={(e) => setWriteOffQty(Number(e.target.value))}
                          className="w-full p-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-stone-500 block mb-1">Accounting Reason</label>
                        <select
                          value={writeOffReason}
                          onChange={(e) => setWriteOffReason(e.target.value as WriteOffReason)}
                          className="w-full p-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                        >
                          <option value="Expired">Expired</option>
                          <option value="Damaged">Damaged in Handling</option>
                          <option value="Quality rejection">Quality Rejection</option>
                          <option value="Returned unsaleable">Returned Unsaleable</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-500 block mb-1">Audit Notes / Incident</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Damaged pallet during forklift transfer..."
                        value={writeOffNotes}
                        onChange={(e) => setWriteOffNotes(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                      />
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      Calculated Value: {formatPKR(writeOffQty * (prodMap.get(selectedBatch.sku)?.unitCost || 0))}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setWriteOffOpen(false)}
                        className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleWriteOffSubmit}
                        className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                      >
                        Confirm Write-Off
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex justify-end">
              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive New Stock Modal */}
      {receiveModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 mb-4">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Receive Stock / Add Batch
              </h2>
              <button
                onClick={() => setReceiveModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveStock} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                  Select Product (SKU)
                </label>
                <select
                  value={newBatchForm.sku}
                  onChange={(e) => {
                    const prod = prodMap.get(e.target.value);
                    const defExpiry = new Date(newBatchForm.mfgDate);
                    if (prod) {
                      defExpiry.setDate(defExpiry.getDate() + prod.shelfLifeDays);
                    }
                    setNewBatchForm({
                      ...newBatchForm,
                      sku: e.target.value,
                      expiryDate: defExpiry.toISOString().split('T')[0],
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                >
                  {state.products.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} ({p.sku}) — {p.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Batch Number (Unique)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B-MLT-2027"
                    value={newBatchForm.batchNo}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, batchNo: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Received Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newBatchForm.qty}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, qty: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Location Bin
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WH1-B-04"
                    value={newBatchForm.location}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, location: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Initial Quality Status
                  </label>
                  <select
                    value={newBatchForm.qualityStatus}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, qualityStatus: e.target.value as QualityStatus })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  >
                    <option value="Released">Released (Ready for dispatch)</option>
                    <option value="Hold">Hold (Quarantine QA inspection)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Manufacture Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newBatchForm.mfgDate}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, mfgDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newBatchForm.expiryDate}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, expiryDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                  Receiving Inspection Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pallet seal intact, temperature logged at 24C"
                  value={newBatchForm.note}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, note: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setReceiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Confirm & Receive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
