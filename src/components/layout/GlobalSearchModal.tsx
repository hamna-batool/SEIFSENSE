import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, X, Box, Layers, Users, Calendar, ArrowRight } from 'lucide-react';
import { formatDate, getExpiryBand } from '../../rules/rulesEngine';

export const GlobalSearchModal: React.FC = () => {
  const { state, setSearchModal, setActivePage } = useApp();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return { products: [], batches: [], customers: [] };
    const q = query.toLowerCase().trim();

    const matchedProducts = state.products
      .filter((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .slice(0, 5);

    const matchedBatches = state.batches
      .filter((b) => b.batchNo.toLowerCase().includes(q) || b.sku.toLowerCase().includes(q) || b.location.toLowerCase().includes(q))
      .slice(0, 8);

    const matchedCustomers = state.customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.type.toLowerCase().includes(q))
      .slice(0, 4);

    return { products: matchedProducts, batches: matchedBatches, customers: matchedCustomers };
  }, [query, state.products, state.batches, state.customers]);

  if (!state.searchModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-start justify-center pt-16 px-4">
      <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-stone-400" />
          <input
            type="text"
            autoFocus
            placeholder="Search by SKU (e.g. SKU-BIS-001), Batch (e.g. B-SOOP), customer, or location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 px-2 py-1"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setSearchModal(false)}
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {query.length < 2 ? (
            <div className="py-8 text-center text-xs text-stone-400">
              Type at least 2 characters to search SKUs, Batches, or Customers.
            </div>
          ) : results.products.length === 0 && results.batches.length === 0 && results.customers.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-500">
              No matching products, batches, or customers found for &quot;{query}&quot;.
            </div>
          ) : (
            <>
              {/* Products */}
              {results.products.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5" /> Products ({results.products.length})
                  </h4>
                  <div className="space-y-1">
                    {results.products.map((prod) => (
                      <button
                        key={prod.sku}
                        onClick={() => {
                          setSearchModal(false);
                          setActivePage('inventory', { sku: prod.sku });
                        }}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/60 flex items-center justify-between text-xs transition-colors group"
                      >
                        <div>
                          <div className="font-medium text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                            {prod.name}
                          </div>
                          <div className="text-stone-500 font-mono text-[11px]">
                            {prod.sku} · {prod.category} · PKR {prod.unitPrice.toLocaleString()}/{prod.unit}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Batches */}
              {results.batches.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Batches ({results.batches.length})
                  </h4>
                  <div className="space-y-1">
                    {results.batches.map((b) => {
                      const diff = Math.round(
                        (new Date(b.expiryDate).getTime() - new Date(state.today).getTime()) / (1000 * 60 * 60 * 24)
                      );
                      const band = getExpiryBand(diff);
                      return (
                        <button
                          key={b.batchNo}
                          onClick={() => {
                            setSearchModal(false);
                            setActivePage('inventory', { sku: b.sku });
                          }}
                          className="w-full text-left p-2.5 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/60 flex items-center justify-between text-xs transition-colors group"
                        >
                          <div>
                            <div className="font-mono font-medium text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                              {b.batchNo} ({b.sku})
                            </div>
                            <div className="text-stone-500 text-[11px] mt-0.5">
                              Qty: {b.qty} · Location: {b.location} · Status: {b.qualityStatus} · Expiry: {formatDate(b.expiryDate)}
                            </div>
                          </div>
                          <span className={`text-[11px] font-medium ${band.textClass}`}>
                            {diff < 0 ? `Expired ${Math.abs(diff)}d ago` : `${diff}d left`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Customers */}
              {results.customers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Customers ({results.customers.length})
                  </h4>
                  <div className="space-y-1">
                    {results.customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSearchModal(false);
                          setActivePage('dispatch');
                        }}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/60 flex items-center justify-between text-xs transition-colors group"
                      >
                        <div>
                          <div className="font-medium text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                            {c.name}
                          </div>
                          <div className="text-stone-500 text-[11px]">
                            {c.type} · {c.city} · Min shelf-life: {c.minRemainingShelfLifeDays} days
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-500 flex justify-between items-center">
          <span>Press ESC or click outside to dismiss</span>
          <span>Tip: Click any item to jump directly to inventory or dispatch</span>
        </div>
      </div>
    </div>
  );
};
