'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useDateRange, type DatePreset } from '@/lib/date-range-context';

const PRESETS: { label: string; value: Exclude<DatePreset, 'custom'> }[] = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Last 6 months', value: '180d' },
  { label: 'Year to date', value: 'ytd' },
  { label: 'All time', value: 'all' },
];

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DateRangePicker() {
  const { range, setPreset } = useDateRange();
  const [open, setOpen] = useState(false);

  const activeLabel = PRESETS.find((p) => p.value === range.preset)?.label ?? 'Custom range';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
      >
        <Calendar className="h-4 w-4 text-slate-400" />
        <span>{activeLabel}</span>
        <span className="text-slate-400 text-xs hidden sm:inline">
          ({fmtDate(range.from)} – {fmtDate(range.to)})
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setPreset(p.value); setOpen(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                  range.preset === p.value
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
