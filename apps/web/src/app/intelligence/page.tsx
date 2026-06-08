'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, Users, Link2, RefreshCw, Activity, Award, Loader2, Globe } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface DashboardMetrics {
  totalRevenue: number;
  attributedRevenue: number;
  attributionRate: number;
  orderCount: number;
  avgOrderValue: number;
  creatorAcquiredCustomers: number;
  attributionCount: number;
  totalClicks: number;
  clickToAttributionRate: number;
}

interface CreatorScore {
  creatorId: string;
  creatorName: string;
  score: number;
  tier: string;
  attributedRevenue: number;
  attributionCount: number;
  clickCount: number;
}

interface ConnectorStatus {
  id: string;
  platform: string;
  status: string;
  lastSyncAt: string | null;
  errorMessage: string | null;
}

interface CampaignBreakdown {
  campaignId: string;
  campaignName: string;
  attributedRevenue: number;
  attributionCount: number;
}

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  platinum: { label: 'Platinum', color: 'text-purple-400 bg-purple-900/30 border-purple-600' },
  gold: { label: 'Gold', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-600' },
  silver: { label: 'Silver', color: 'text-zinc-300 bg-zinc-700/50 border-zinc-500' },
  bronze: { label: 'Bronze', color: 'text-orange-400 bg-orange-900/30 border-orange-700' },
};

const SCORE_GRADIENT = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function MetricCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string;
  icon: React.FC<{ className?: string }>; color: string;
}) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function IntelligencePage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [scores, setScores] = useState<CreatorScore[]>([]);
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignBreakdown[]>([]);
  const [forecast, setForecast] = useState<Array<{ month: string; projected: number; isProjected: boolean }>>([]);
  const [currencies, setCurrencies] = useState<Array<{ currency: string; totalRevenue: number; orderCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState('LAST_TOUCH');

  const load = useCallback(async () => {
    const token = localStorage.getItem('tf_token');
    const auth: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    setLoading(true);
    try {
      const [m, sc, conn, camp, fc, curr] = await Promise.all([
        fetch(`${BASE}/api/v1/revenue-intelligence/dashboard?model=${model}`, { headers: auth }).then((r) => r.ok ? r.json() : null) as Promise<DashboardMetrics>,
        fetch(`${BASE}/api/v1/revenue-intelligence/creators/scores`, { headers: auth }).then((r) => r.ok ? r.json() : []) as Promise<CreatorScore[]>,
        fetch(`${BASE}/api/v1/revenue-intelligence/connectors/status`, { headers: auth }).then((r) => r.ok ? r.json() : []) as Promise<ConnectorStatus[]>,
        fetch(`${BASE}/api/v1/revenue-intelligence/campaigns`, { headers: auth }).then((r) => r.ok ? r.json() : []) as Promise<CampaignBreakdown[]>,
        fetch(`${BASE}/api/v1/revenue-intelligence/forecast?months=3`, { headers: auth }).then((r) => r.ok ? r.json() : []) as Promise<Array<{ month: string; projected: number; isProjected: boolean }>>,
        fetch(`${BASE}/api/v1/revenue-intelligence/currency-breakdown`, { headers: auth }).then((r) => r.ok ? r.json() : []) as Promise<Array<{ currency: string; totalRevenue: number; orderCount: number }>>,
      ]);
      setMetrics(m);
      setScores(sc ?? []);
      setConnectors(conn ?? []);
      setCampaigns((camp ?? []).slice(0, 10));
      setForecast(fc ?? []);
      setCurrencies(curr ?? []);
    } finally {
      setLoading(false);
    }
  }, [model]);

  useEffect(() => { load(); }, [load]);

  const topScores = [...scores].sort((a, b) => b.score - a.score).slice(0, 10);
  const topCampaigns = [...campaigns].sort((a, b) => b.attributedRevenue - a.attributedRevenue);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-400" /> Revenue Intelligence
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">Attribution analytics, creator scores, and connector health</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="FIRST_TOUCH">First Touch</option>
            <option value="LAST_TOUCH">Last Touch</option>
            <option value="LINEAR">Linear</option>
            <option value="TIME_DECAY">Time Decay</option>
          </select>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-300 font-medium transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI grid */}
          {metrics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Revenue" value={fmtMoney(metrics.totalRevenue)} sub={`${metrics.orderCount.toLocaleString()} orders`} icon={DollarSign} color="text-white" />
              <MetricCard label="Attributed Revenue" value={fmtMoney(metrics.attributedRevenue)} sub={`${(metrics.attributionRate * 100).toFixed(1)}% attribution rate`} icon={TrendingUp} color="text-indigo-400" />
              <MetricCard label="Avg Order Value" value={fmtMoney(metrics.avgOrderValue)} icon={Link2} color="text-emerald-400" />
              <MetricCard
                label="Click → Attribution CTR"
                value={`${(metrics.clickToAttributionRate * 100).toFixed(2)}%`}
                sub={`${metrics.totalClicks.toLocaleString()} total clicks · ${metrics.attributionCount} conversions`}
                icon={Users}
                color="text-purple-400"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Creator leaderboard */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-700">
                <Award className="h-4 w-4 text-yellow-400" />
                <h2 className="text-white font-semibold">Creator Leaderboard</h2>
                <span className="ml-auto text-zinc-500 text-xs">{scores.length} creators scored</span>
              </div>
              {topScores.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-10">No creator scores yet</p>
              ) : (
                <div className="divide-y divide-zinc-700/50">
                  {topScores.map((s, i) => {
                    const tier = TIER_CONFIG[s.tier] ?? TIER_CONFIG.bronze;
                    return (
                      <div key={s.creatorId} className="flex items-center gap-4 px-5 py-3">
                        <span className="text-zinc-600 text-xs font-mono w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{s.creatorName}</p>
                          <p className="text-zinc-500 text-xs">{fmtMoney(s.attributedRevenue)} attributed</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${tier.color}`}>{tier.label}</span>
                        <div className="text-right w-12">
                          <p className="text-white text-sm font-bold">{s.score}</p>
                          <p className="text-zinc-600 text-xs">score</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Mini bar chart of scores */}
              {topScores.length > 0 && (
                <div className="px-4 pb-4 pt-2 border-t border-zinc-700/50">
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={topScores.slice(0, 8)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="creatorName" tick={false} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#a1a1aa' }}
                        itemStyle={{ color: '#818cf8' }}
                      />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {topScores.slice(0, 8).map((_, index) => (
                          <Cell key={index} fill={SCORE_GRADIENT[Math.min(index, SCORE_GRADIENT.length - 1)]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Campaign breakdown */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-700">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                <h2 className="text-white font-semibold">Campaign Attribution</h2>
              </div>
              {topCampaigns.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-10">No campaign data yet</p>
              ) : (
                <>
                  <div className="px-4 pt-4 pb-2">
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={topCampaigns} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="campGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="campaignName" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                          formatter={(v: number) => [fmtMoney(v), 'Attributed Revenue']}
                        />
                        <Area type="monotone" dataKey="attributedRevenue" stroke="#6366f1" fill="url(#campGrad)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="divide-y divide-zinc-700/50">
                    {topCampaigns.slice(0, 5).map((c) => (
                      <div key={c.campaignId} className="flex items-center justify-between px-5 py-2.5">
                        <p className="text-zinc-300 text-sm truncate max-w-[60%]">{c.campaignName}</p>
                        <div className="text-right">
                          <p className="text-indigo-400 text-sm font-semibold">{fmtMoney(c.attributedRevenue)}</p>
                          <p className="text-zinc-600 text-xs">{c.attributionCount} attributions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Connector health */}
          {connectors.length > 0 && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-700">
                <Link2 className="h-4 w-4 text-zinc-400" />
                <h2 className="text-white font-semibold">Connector Health</h2>
              </div>
              <div className="divide-y divide-zinc-700/50">
                {connectors.map((c) => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-3">
                    <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${c.status === 'ACTIVE' ? 'bg-emerald-400' : c.status === 'ERROR' ? 'bg-red-400 animate-pulse' : 'bg-zinc-500'}`} />
                    <p className="text-zinc-300 text-sm font-medium capitalize">{c.platform.toLowerCase()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded border ${c.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-900/30 border-emerald-700' : c.status === 'ERROR' ? 'text-red-400 bg-red-900/30 border-red-700' : 'text-zinc-500 bg-zinc-800 border-zinc-600'}`}>
                      {c.status}
                    </span>
                    {c.lastSyncAt && (
                      <span className="text-zinc-600 text-xs ml-auto">
                        Last sync: {new Date(c.lastSyncAt).toLocaleString()}
                      </span>
                    )}
                    {c.errorMessage && (
                      <span className="text-red-400 text-xs truncate max-w-xs">{c.errorMessage}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue Forecast */}
          {forecast.length > 0 && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-700">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h2 className="text-white font-semibold">Revenue Forecast</h2>
                <span className="ml-auto text-zinc-500 text-xs">12-month history + 3-month projection</span>
              </div>
              <div className="px-4 pt-4 pb-4">
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={forecast} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number, name: string) => [fmtMoney(v), name === 'projected' ? 'Revenue' : 'Revenue']}
                      labelFormatter={(label: string) => label + (forecast.find(f => f.month === label)?.isProjected ? ' (projected)' : '')}
                    />
                    <ReferenceLine x={forecast.find(f => f.isProjected)?.month} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'Forecast →', fill: '#818cf8', fontSize: 10 }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
                    <Area type="monotone" dataKey="projected" stroke="#10b981" fill="url(#forecastGrad)" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Multi-currency breakdown */}
          {currencies.length > 1 && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-700">
                <Globe className="h-4 w-4 text-indigo-400" />
                <h2 className="text-white font-semibold">Revenue by Currency</h2>
              </div>
              <div className="divide-y divide-zinc-700/50">
                {currencies.map(c => (
                  <div key={c.currency} className="flex items-center gap-4 px-5 py-3">
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-900/30 border border-indigo-700 rounded px-2 py-0.5 w-14 text-center">{c.currency}</span>
                    <p className="text-white text-sm font-semibold flex-1">{fmtMoney(c.totalRevenue)}</p>
                    <p className="text-zinc-500 text-xs">{c.orderCount.toLocaleString()} orders</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
