'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type DatePreset = '7d' | '30d' | '90d' | '180d' | 'ytd' | 'all' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
  preset: DatePreset;
}

function makeRange(preset: Exclude<DatePreset, 'custom'>): DateRange {
  const to = new Date();
  const from = new Date();
  if (preset === '7d') from.setDate(from.getDate() - 7);
  else if (preset === '30d') from.setDate(from.getDate() - 30);
  else if (preset === '90d') from.setDate(from.getDate() - 90);
  else if (preset === '180d') from.setDate(from.getDate() - 180);
  else if (preset === 'ytd') { from.setMonth(0); from.setDate(1); }
  else if (preset === 'all') { from.setFullYear(2020, 0, 1); } // epoch start
  return { from, to, preset };
}

interface DateRangeContextValue {
  range: DateRange;
  setPreset: (preset: Exclude<DatePreset, 'custom'>) => void;
  setCustom: (from: Date, to: Date) => void;
  fromISO: string;
  toISO: string;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DateRange>(makeRange('30d'));

  const setPreset = useCallback((preset: Exclude<DatePreset, 'custom'>) => {
    setRange(makeRange(preset));
  }, []);

  const setCustom = useCallback((from: Date, to: Date) => {
    setRange({ from, to, preset: 'custom' });
  }, []);

  return (
    <DateRangeContext.Provider value={{
      range,
      setPreset,
      setCustom,
      fromISO: range.from.toISOString(),
      toISO: range.to.toISOString(),
    }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error('useDateRange must be used within DateRangeProvider');
  return ctx;
}
