'use client';

import { useEffect, useState, useRef } from 'react';
import { DollarSign, Users, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { useDateRange } from '@/lib/date-range-context';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { CreatorLeaderboard } from '@/components/dashboard/creator-leaderboard';
import type { DashboardMetrics, TimeSeriesPoint, CreatorPerformance, AttributionModel } from '@/lib/api';
import { ATTRIBUTION_MODELS } from '@/lib/api';
import { useRealtime } from '@/lib/use-realtime';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function DeltaChip({ value, suffix = '' }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
      {positive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, loading }: {
  label: string; value: string; sub: React.ReactNode; icon: React.ElementType; loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="rounded-lg bg-indigo-50 p-2"><Icon className="h-4 w-4 text-indigo-600" /></div>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-7 w-28 rounded bg-slate-200" />
          <div className="h-4 w-20 rounded bg-slate-100" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <div className="mt-1">{sub}</div>
        </>
      )}
    </div>
  );
}

interface DashboardClientProps {
  initial: {
    metrics: DashboardMetrics | null;
    timeSeries: TimeSeriesPoint[];
    creators: CreatorPerformance[];
  };
}

export function DashboardClient({ initial }: DashboardClientProps) {
  const { fromISO, toISO, range } = useDateRange();
  const [model, setModel] = useState<AttributionModel>('LAST_TOUCH');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(initial.metrics);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>(initial.timeSeries);
  const [creators, setCreators] = useState<CreatorPerformance[]>(initial.creators);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live attribution counter
  const [liveCount, setLiveCount] = useState(0);
  const [liveRevenue, setLiveRevenue] = useState(0);
  const [liveFlash, setLiveFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useRealtime({
    onEvent: {
      ATTRIBUTION_CREATED: (payload) => {
        setLiveCount((n) => n + 1);
        if (typeof payload.totalRevenue === 'number') {
          setLiveRevenue((r) => r + (payload.totalRevenue as number));
        }
        setLiveFlash(true);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setLiveFlash(false), 2000);
      },
    },
  });

  // Only refetch when date range or model changes (skip on mount — we have SSR data)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('tf_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    setLoading(true);
    setError(null);

    const base = `from=${fromISO}&to=${toISO}&model=${model}`;
    Promise.all([
      fetch(`${API}/api/v1/revenue-intelligence/dashboard?${base}`, { headers }).then((r) => r.json()),
      fetch(`${API}/api/v1/revenue-intelligence/timeseries?${base}`, { headers }).then((r) => r.json()),
      fetch(`${API}/api/v1/revenue-intelligence/creators/performance?limit=10&${base}`, { headers }).then((r) => r.json()),
    ])
      .then(([m, ts, c]) => { setMetrics(m); setTimeSeries(ts); setCreators(c); })
      .catch(() => setError('Failed to reload data for selected range'))
      .finally(() => setLoading(false));
  }, [fromISO, toISO, model, mounted]);

  const rate = metrics ? (metrics.attributionRate * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Revenue Intelligence</h1>
        <p className="text-sm text-slate-500 mt-1">Creator-attributed revenue overview and performance metrics</p>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div>
      )}

      {/* Attribution Model Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-500 mr-1">Attribution model:</span>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
          {ATTRIBUTION_MODELS.map((m) => (
            <button
              key={m.value}
              onClick={() => setModel(m.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                model === m.value
                  ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Attributed Revenue" icon={DollarSign} loading={loading}
          value={metrics ? fmt(metrics.attributedRevenue) : '$—'}
          sub={<DeltaChip value={parseFloat(rate)} suffix="% rate" />} />
        <KpiCard label="Creator-Acquired" icon={Users} loading={loading}
          value={metrics ? metrics.creatorAcquiredCustomers.toLocaleString() : '—'}
          sub={<span className="text-xs text-slate-400">{metrics?.attributionCount ?? 0} attributions</span>} />
        <KpiCard label="Total Revenue" icon={TrendingUp} loading={loading}
          value={metrics ? fmt(metrics.totalRevenue) : '$—'}
          sub={<span className="text-xs text-slate-400">{metrics?.orderCount ?? 0} orders</span>} />
        <KpiCard label="Click → Attribution CTR" icon={BarChart3} loading={loading}
          value={metrics?.clickToAttributionRate != null ? `${(metrics.clickToAttributionRate * 100).toFixed(2)}%` : '—'}
          sub={<span className="text-xs text-slate-400">{(metrics?.totalClicks ?? 0).toLocaleString()} clicks</span>} />
      </div>

      {/* Live attribution feed */}
      <div className={`rounded-xl border px-5 py-4 flex items-center gap-4 transition-all duration-300 ${liveFlash ? 'border-emerald-400 bg-emerald-50 shadow-sm shadow-emerald-200' : 'border-slate-200 bg-white'}`}>
        <div className={`rounded-full p-2 transition-colors ${liveFlash ? 'bg-emerald-100' : 'bg-slate-100'}`}>
          <Zap className={`h-5 w-5 transition-colors ${liveFlash ? 'text-emerald-600' : 'text-slate-400'}`} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Live Attributions (this session)</p>
          <p className={`text-xl font-bold ${liveFlash ? 'text-emerald-700' : 'text-slate-900'}`}>
            {liveCount.toLocaleString()} attribution{liveCount !== 1 ? 's' : ''}
            {liveRevenue > 0 && <span className="text-base font-semibold text-emerald-600 ml-2">+{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(liveRevenue)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${liveFlash ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
          <span className="text-xs text-slate-400">{liveFlash ? 'Live' : 'Listening…'}</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenue Over Time</h2>
          {loading ? <div className="h-64 animate-pulse rounded-lg bg-slate-100" /> : <RevenueChart data={timeSeries} />}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Creators</h2>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map((i) => <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />)}
            </div>
          ) : <CreatorLeaderboard creators={creators} />}
        </div>
      </div>
    </div>
  );
}
