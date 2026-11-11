import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { formatDate } from '../../rules/rulesEngine';
import {
  Calendar,
  FastForward,
  Play,
  RotateCcw,
  Search,
  Bell,
  BookOpen,
  Sun,
  Moon,
  ShieldAlert,
  ChevronDown,
  UserCheck,
  AlertTriangle,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebarMobile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebarMobile }) => {
  const {
    state,
    setRole,
    simulateDays,
    resetDemoData,
    toggleDarkMode,
    setSearchModal,
    setRulesDrawer,
    setActivePage,
    unacknowledgedAlertCount,
  } = useApp();

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const roles: { role: UserRole; title: string; desc: string }[] = [
    { role: 'Warehouse', title: 'Warehouse Supervisor', desc: 'Receiving, bin locations, FEFO pick dispatch' },
    { role: 'Quality', title: 'Quality Assurance Officer', desc: 'Batch Hold/Release tests & microbiological approval' },
    { role: 'Procurement', title: 'Procurement Specialist', desc: 'Reorder requirements & supplier quotations' },
    { role: 'Sales', title: 'Sales Coordinator', desc: 'Customer shelf-life constraints & orders' },
    { role: 'Finance', title: 'Finance Controller', desc: 'Write-off approvals & stock valuation' },
    { role: 'Manager', title: 'Plant Operations Manager', desc: 'Full administrative access & all approvals' },
  ];

  const currentRoleObj = roles.find((r) => r.role === state.role) || roles[0];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
      {/* Top Banner: Academic Integrity Notice */}
      <div className="bg-stone-100 dark:bg-stone-950 px-4 py-1.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
            Demo data – synthetic
          </span>
          <span className="text-stone-400">|</span>
          <span className="text-stone-600 dark:text-stone-300 font-medium">Demo Foods Pvt Ltd · Multan, Pakistan</span>
          <span className="hidden md:inline text-stone-400">·</span>
          <span className="hidden md:inline text-stone-500 text-[11px]">
            Academic evaluation prototype for food inventory and expiry risk control
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRulesDrawer(true)}
            className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>How rules work</span>
          </button>
          <span className="text-stone-300 dark:text-stone-700">|</span>
          <button
            onClick={() => setConfirmResetOpen(true)}
            className="flex items-center gap-1 text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            title="Reset to initial seed data"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset demo data</span>
          </button>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Mobile Menu + Wordmark & Facility Context */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebarMobile}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 lg:hidden hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-white font-bold tracking-tight text-sm shadow-xs">
              SS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-none">
                  ShelfSense
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                  Multan Plant
                </span>
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                Industrial Estate Phase II · Food & Agro Division
              </div>
            </div>
          </div>
        </div>

        {/* Center: Simulated Date Engine Controls */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-stone-700 dark:text-stone-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span className="text-stone-500 dark:text-stone-400 text-[11px]">System Today:</span>
            <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">{formatDate(state.today)}</span>
          </div>

          <button
            onClick={() => simulateDays(1)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 hover:text-emerald-700 dark:hover:text-emerald-400 shadow-xs hover:border-emerald-300 transition-all font-medium"
            title="Advance simulated clock by 1 calendar day"
          >
            <Play className="w-3 h-3 text-emerald-600" />
            <span>Simulate +1 Day</span>
          </button>

          <button
            onClick={() => simulateDays(7)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 hover:text-emerald-700 dark:hover:text-emerald-400 shadow-xs hover:border-emerald-300 transition-all font-medium"
            title="Advance simulated clock by 7 calendar days (1 week)"
          >
            <FastForward className="w-3 h-3 text-amber-600" />
            <span>+7 Days</span>
          </button>
        </div>

        {/* Right Action Controls: Search, Role Switcher, Alert Bell, Dark Mode */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <button
            onClick={() => setSearchModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:border-stone-300 transition-colors"
            title="Search SKUs, batches, customers (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline font-mono text-[10px] bg-stone-200 dark:bg-stone-700 px-1 rounded">⌘K</kbd>
          </button>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs hover:border-stone-300 transition-colors"
              aria-label="Switch active user role"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <div className="text-left hidden sm:block">
                <div className="text-[10px] text-stone-400 leading-none">Role</div>
                <div className="font-semibold text-stone-800 dark:text-stone-200 leading-tight">
                  {state.role}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-stone-900 shadow-xl border border-stone-200 dark:border-stone-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800">
                  <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                    Switch Active User Role
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Controls interface emphasis & permission enforcement
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {roles.map((r) => {
                    const isSelected = state.role === r.role;
                    return (
                      <button
                        key={r.role}
                        onClick={() => {
                          setRole(r.role);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/80 transition-colors ${
                          isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium' : 'text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isSelected ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'}`} />
                        <div>
                          <div className="font-semibold">{r.title}</div>
                          <div className="text-[11px] text-stone-500 leading-tight mt-0.5">{r.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Alert Notification Bell */}
          <button
            onClick={() => setActivePage('alerts')}
            className="relative p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:border-stone-300 transition-colors"
            title={`${unacknowledgedAlertCount} unacknowledged high/critical expiry alerts`}
            aria-label="View expiry alerts"
          >
            <Bell className="w-4 h-4" />
            {unacknowledgedAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                {unacknowledgedAlertCount}
              </span>
            )}
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            title={state.darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle theme"
          >
            {state.darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Reset Demo Data */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-2xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                Reset Demo Data to Baseline?
              </h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-6">
              This will restore all 40 SKUs, ~120 batches, 15 customers, historical dispatches, and initial alert thresholds back to the default synthetic seed baseline. Any batches added or dispatches confirmed during this session will be reset.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetDemoData();
                  setConfirmResetOpen(false);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
