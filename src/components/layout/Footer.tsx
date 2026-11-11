import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../rules/rulesEngine';
import { ShieldCheck, BookOpen, MapPin, Clock } from 'lucide-react';

export const Footer: React.FC = () => {
  const { state, setRulesDrawer } = useApp();

  return (
    <footer className="mt-auto border-t border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-900/60 py-3.5 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs text-stone-500 dark:text-stone-400">
        {/* Mandatory Academic Prototype Notice */}
        <div className="flex items-center gap-2 text-center md:text-left">
          <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold text-stone-700 dark:text-stone-300">
            Academic prototype – synthetic data – decisions require human approval.
          </span>
        </div>

        {/* Facility Context & Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-stone-400" />
            <span>Demo Foods Pvt Ltd, Multan, Pakistan</span>
          </span>
          <span className="text-stone-300 dark:text-stone-700">·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>Simulated clock: {formatDate(state.today)}</span>
          </span>
          <span className="text-stone-300 dark:text-stone-700">·</span>
          <button
            onClick={() => setRulesDrawer(true)}
            className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
          >
            <BookOpen className="w-3 h-3" />
            <span>Rules documentation</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
