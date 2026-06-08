'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';

export interface DateRange {
  from: string;
  to: string;
  label: string;
}

const PRESETS: { label: string; getDates: () => { from: string; to: string } }[] = [
  {
    label: 'Last 7d',
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 7);
      return { from: from.toISOString().split('T')[0]!, to: to.toISOString().split('T')[0]! };
    },
  },
  {
    label: 'Last 30d',
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from: from.toISOString().split('T')[0]!, to: to.toISOString().split('T')[0]! };
    },
  },
  {
    label: 'Last 90d',
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 90);
      return { from: from.toISOString().split('T')[0]!, to: to.toISOString().split('T')[0]! };
    },
  },
  {
    label: 'YTD',
    getDates: () => {
      const to = new Date();
      const from = new Date(to.getFullYear(), 0, 1);
      return { from: from.toISOString().split('T')[0]!, to: to.toISOString().split('T')[0]! };
    },
  },
  {
    label: 'All time',
    getDates: () => ({ from: '', to: '' }),
  },
];

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: Props) {
  const [custom, setCustom] = useState(false);

  function selectPreset(preset: (typeof PRESETS)[number]) {
    const dates = preset.getDates();
    onChange({ ...dates, label: preset.label });
    setCustom(false);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar size={14} className="text-slate-400 hidden sm:block" />

      {/* Preset buttons */}
      {PRESETS.map(p => (
        <button
          key={p.label}
          onClick={() => selectPreset(p)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            value.label === p.label && !custom
              ? 'bg-indigo-600 text-white border-indigo-500'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {p.label}
        </button>
      ))}

      {/* Custom range toggle */}
      <button
        onClick={() => setCustom(c => !c)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
          custom
            ? 'bg-indigo-600 text-white border-indigo-500'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        Custom
      </button>

      {/* Custom date inputs */}
      {custom && (
        <div className="flex items-center gap-2 mt-1 w-full sm:w-auto sm:mt-0">
          <input
            type="date"
            value={value.from}
            onChange={e => onChange({ ...value, from: e.target.value, label: 'custom' })}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-400"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={value.to}
            onChange={e => onChange({ ...value, to: e.target.value, label: 'custom' })}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-400"
          />
        </div>
      )}
    </div>
  );
}
