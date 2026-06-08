'use client';

import { useState, useEffect, useRef } from 'react';
import { DollarSign, TrendingUp, Target, BarChart3, Users, Download, Award } from 'lucide-react';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import type { TimeSeriesPoint, CreatorPerformance, CampaignBreakdown, CohortData, CreatorScore } from '@/lib/api';
import { useDateRange } from '@/lib/date-range-context';
import { exportCsv } from '@/lib/export-csv';

interface RoasData {
  totalAttributedRevenue: number;
  creatorBreakdown: { creatorId: string; creatorName: string; attributedRevenue: number }[];
}

interface RevenueClientProps {
  roas: RoasData | null;
  performance: CreatorPerformance[];
  timeSeries: TimeSeriesPoint[];
  campaigns: CampaignBreakdown[];
  cohorts: CohortData[];
  error: string | null;
}

const MODELS = ['First Touch', 'Last Touch'];
const TABS = ['Creator Attribution', 'Campaign Analytics', 'Cohort Analysis', 'Creator Leaderboard'];

const TIER_STYLE: Record<string, { badge: string; bar: string }> = {
  platinum: { badge: 'bg-violet-50 text-violet-700 border-violet-200', bar: 'bg-violet-500' },
  gold: { badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-400' },
  silver: { badge: 'bg-slate-100 text-slate-600 border-slate-200', bar: 'bg-slate-400' },
  bronze: { badge: 'bg-orange-50 text-orange-600 border-orange-200', bar: 'bg-orange-400' },
};

const TIER_LABEL: Record<string, string> = {
  platinum: '✦ Platinum',
  gold: '★ Gold',
  silver: '◆ Silver',
  bronze: '● Bronze',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export function RevenueClient({ roas: initialRoas, performance: initialPerf, timeSeries: initialTs, campaigns: initialCamp, cohorts: initialCoh, error: initialError }: RevenueClientProps) {
  const [model, setModel] = useState(0);
  const [tab, setTab] = useState(0);

  const [roas, setRoas] = useState(initialRoas);
  const [performance, setPerf] = useState(initialPerf);
  const [timeSeries, setTs] = useState(initialTs);
  const [campaigns, setCamp] = useState(initialCamp);
  const [cohorts, setCoh] = useState(initialCoh);
  const [error, setError] = useState(initialError);
  const [fetching, setFetching] = useState(false);
  // Creator leaderboard
  const [scores, setScores] = useState<CreatorScore[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const scoresLoaded = useRef(false);

  const { fromISO, toISO } = useDateRange();
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const token = typeof window !== 'undefined' ? localStorage.getItem('tf_token') : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const qs = `?from=${fromISO}&to=${toISO}`;
    setFetching(true);
    Promise.all([
      fetch(`${base}/api/v1/revenue-intelligence/roas${qs}`, { headers }).then((r) => r.json()),
      fetch(`${base}/api/v1/revenue-intelligence/creators/performance?limit=20`, { headers }).then((r) => r.json()),
      fetch(`${base}/api/v1/revenue-intelligence/timeseries${qs}`, { headers }).then((r) => r.json()),
      fetch(`${base}/api/v1/revenue-intelligence/campaigns${qs}`, { headers }).then((r) => r.json()),
      fetch(`${base}/api/v1/revenue-intelligence/cohorts?type=creator`, { headers }).then((r) => r.json()),
    ])
      .then(([r, p, ts, c, coh]) => {
        setRoas(r);
        setPerf(Array.isArray(p) ? p : []);
        setTs(Array.isArray(ts) ? ts : []);
        setCamp(Array.isArray(c) ? c : []);
        setCoh(Array.isArray(coh) ? coh : []);
        setError(null);
      })
      .catch(() => setError('Failed to refresh data'))
      .finally(() => setFetching(false));
  }, [fromISO, toISO]);

  const totalAttributed = roas?.totalAttributedRevenue ?? 0;
  const breakdown = roas?.creatorBreakdown ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Revenue Attribution</h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect creators directly to revenue with first-touch and last-touch models
          </p>
        </div>
        {fetching && <span className="text-xs text-slate-400 animate-pulse">Updating…</span>}
      </div>

      {/* Model selector */}
      <div className="flex gap-2 items-center">
        {MODELS.map((m, i) => (
          <button key={m} onClick={() => setModel(i)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${i === model ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {m}
          </button>
        ))}
        <span className="ml-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 border border-amber-200">
          Linear & Time Decay â€” Pro
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2"><DollarSign className="h-4 w-4 text-indigo-500" />Total Attributed Revenue</div>
          <p className="text-2xl font-bold text-slate-900">{fmt(totalAttributed)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2"><TrendingUp className="h-4 w-4 text-emerald-500" />Active Creators</div>
          <p className="text-2xl font-bold text-slate-900">{breakdown.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2"><Target className="h-4 w-4 text-purple-500" />Campaigns Tracked</div>
          <p className="text-2xl font-bold text-slate-900">{campaigns.length}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Attributed Revenue Over Time</h2>
        <RevenueChart data={timeSeries} />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {TABS.map((t, i) => (
            <button key={t} onClick={async () => {
              setTab(i);
              if (i === 3 && !scoresLoaded.current) {
                scoresLoaded.current = true;
                setScoresLoading(true);
                try {
                  const { api } = await import('@/lib/api');
                  const data = await api.getCreatorScores();
                  setScores(data);
                } catch { /* ignore */ }
                finally { setScoresLoading(false); }
              }
            }}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${tab === i ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Creator Attribution */}
      {tab === 0 && (
        breakdown.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16">
            <DollarSign className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No attribution data yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md text-center">Attribution is calculated when orders are matched to creator touchpoints.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Creator Attribution Breakdown</h2>
                <p className="text-xs text-slate-400 mt-0.5">{MODELS[model]} model</p>
              </div>
              <button
                onClick={() => exportCsv(performance.map((p) => ({ creator: p.creatorName, attributedRevenue: p.attributedRevenue, conversions: p.conversions })), 'creator-attribution')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Creator</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Attributed Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Conversions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Share</th>
                  <th className="px-6 py-3">Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {performance.map((p) => {
                  const share = totalAttributed > 0 ? (p.attributedRevenue / totalAttributed) * 100 : 0;
                  return (
                    <tr key={p.creatorId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-800">{p.creatorName}</td>
                      <td className="px-6 py-3 text-right font-semibold text-slate-900">{fmt(p.attributedRevenue)}</td>
                      <td className="px-6 py-3 text-right text-slate-600">{p.conversions}</td>
                      <td className="px-6 py-3 text-right text-slate-500">{share.toFixed(1)}%</td>
                      <td className="px-6 py-3 w-40">
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(share, 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Tab: Campaign Analytics */}
      {tab === 1 && (
        campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16">
            <BarChart3 className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No campaign data yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md text-center">Create tracking links with UTM campaign tags to see campaign-level attribution here.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Campaign Attribution</h2>
              <p className="text-xs text-slate-400 mt-0.5">Revenue grouped by UTM campaign tag</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Source / Medium</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Converts</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Creators</th>
                  <th className="px-6 py-3">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {campaigns.map((c) => (
                  <tr key={c.campaign} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800">{c.campaign}</td>
                    <td className="px-6 py-3 text-xs text-slate-500">{c.source} / {c.medium}</td>
                    <td className="px-6 py-3 text-right font-semibold text-slate-900">{fmt(c.attributedRevenue)}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{c.conversions}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{c.creatorCount}</td>
                    <td className="px-6 py-3 w-40">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(c.revenueShare * 100, 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Tab: Cohort Analysis */}
      {tab === 2 && (
        cohorts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16">
            <Users className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No cohort data yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md text-center">Creator-acquired customers will be grouped by acquisition month once orders are attributed.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Creator Acquisition Cohorts</h2>
              <p className="text-xs text-slate-400 mt-0.5">Customers grouped by month they were first acquired via a creator</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Cohort</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Customers</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Total Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Avg LTV</th>
                  <th className="px-6 py-3">Revenue Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(() => {
                  const maxRev = Math.max(...cohorts.map((c) => c.totalRevenue), 1);
                  return cohorts.map((c) => (
                    <tr key={c.period} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-800">{c.period}</td>
                      <td className="px-6 py-3 text-right text-slate-700">{c.customerCount}</td>
                      <td className="px-6 py-3 text-right font-semibold text-slate-900">{fmt(c.totalRevenue)}</td>
                      <td className="px-6 py-3 text-right text-slate-500">{c.customerCount > 0 ? fmt(c.totalRevenue / c.customerCount) : '—'}</td>
                      <td className="px-6 py-3 w-40">
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(c.totalRevenue / maxRev) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        )
      )}
      {/* Tab: Creator Leaderboard */}
      {tab === 3 && (
        scoresLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : scores.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16">
            <Award className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No creator scores yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md text-center">Creator tiers are computed once attributions exist for each creator.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Creator Performance Leaderboard</h2>
                <p className="text-xs text-slate-400 mt-0.5">Ranked by composite score (revenue × conversions × clicks)</p>
              </div>
              <button
                onClick={() => exportCsv(scores.map((s) => ({ creator: s.name, tier: s.tier, score: s.score, attributedRevenue: s.attributedRevenue, conversions: s.conversions, clicks: s.totalClicks })), 'creator-leaderboard')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Creator</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Tier</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Score</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Conversions</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Clicks</th>
                  <th className="px-4 py-3 w-32">Score Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(() => {
                  const maxScore = Math.max(...scores.map((s) => s.score), 1);
                  return scores.map((s, i) => {
                    const style = TIER_STYLE[s.tier] ?? TIER_STYLE.bronze;
                    return (
                      <tr key={s.creatorId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 text-xs font-mono">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{s.name}</p>
                          {s.handle && <p className="text-xs text-slate-400">@{s.handle}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
                            {TIER_LABEL[s.tier] ?? s.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{s.score.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{fmt(s.attributedRevenue)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{s.conversions}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{s.totalClicks.toLocaleString()}</td>
                        <td className="px-4 py-3 w-32">
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${(s.score / maxScore) * 100}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}