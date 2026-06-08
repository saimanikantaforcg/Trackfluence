'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TrendingUp, Link2, DollarSign, Award, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PortalCreator {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  platform: string | null;
  commissionRate: string | null;
  trackingLinks: Array<{ id: string; slug: string; destinationUrl: string; clickCount: number; createdAt: string }>;
  _count: { attributions: number; touchpoints: number };
}

interface PortalPayout {
  id: string;
  amount: string;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
}

interface PortalData {
  creator: PortalCreator;
  payouts: PortalPayout[];
  attributedRevenue: number;
  attributionCount: number;
}

interface TimeSeriesPoint {
  month: string;
  revenue: number;
}

const TIER_COLORS: Record<string, string> = {
  platinum: 'text-purple-400 bg-purple-900/30 border-purple-600',
  gold: 'text-yellow-400 bg-yellow-900/30 border-yellow-600',
  silver: 'text-zinc-300 bg-zinc-700/50 border-zinc-500',
  bronze: 'text-orange-400 bg-orange-900/30 border-orange-700',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
  APPROVED: 'text-blue-400 bg-blue-900/30 border-blue-700',
  PAID: 'text-emerald-400 bg-emerald-900/30 border-emerald-700',
  CANCELLED: 'text-zinc-500 bg-zinc-800 border-zinc-600',
};

export default function PortalClient() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('token');
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inviteToken) {
      setError('No invite token provided. Please use the link from your invitation email.');
      setLoading(false);
      return;
    }

    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

    // Resolve invite token → get creator portal data
    fetch(`${base}/api/v1/creators/portal?token=${inviteToken}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Invalid or expired invite link.');
        return res.json();
      })
      .then((data: PortalData) => {
        setPortalData(data);
        // Also fetch time-series (non-blocking)
        fetch(`${base}/api/v1/creators/portal/timeseries?token=${inviteToken}`, { cache: 'no-store' })
          .then((r) => r.ok ? r.json() : [])
          .then((ts: TimeSeriesPoint[]) => setTimeSeries(ts))
          .catch(() => {/* optional chart */});
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [inviteToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="h-14 w-14 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-6 w-6 text-red-400" />
          </div>
          <h1 className="text-white font-bold text-xl mb-2">Access Error</h1>
          <p className="text-zinc-400 text-sm">{error || 'Creator not found.'}</p>
        </div>
      </div>
    );
  }

  const { creator, payouts, attributedRevenue, attributionCount } = portalData;
  const totalClicks = creator.trackingLinks.reduce((s, l) => s + l.clickCount, 0);
  const totalEarned = payouts.filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);
  const commissionPct = creator.commissionRate ? (Number(creator.commissionRate) * 100).toFixed(1) : null;
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {creator.avatarUrl ? (
            <img src={creator.avatarUrl} alt={creator.name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-indigo-700 flex items-center justify-center font-bold text-sm">
              {creator.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-bold text-white">{creator.name}</h1>
            <p className="text-zinc-500 text-xs">
              {creator.handle ? `@${creator.handle}` : creator.platform ?? 'Creator'}
              {' · '}
              <span className="text-indigo-400">Creator Portal</span>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Tracking Links', value: creator.trackingLinks.length, icon: Link2, color: 'text-indigo-400' },
            { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: TrendingUp, color: 'text-blue-400' },
            { label: 'Attributed Revenue', value: fmtMoney(attributedRevenue), icon: DollarSign, color: 'text-emerald-400' },
            { label: 'Total Earned', value: fmtMoney(totalEarned), icon: Award, color: 'text-yellow-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
              <Icon className={`h-5 w-5 ${color} mb-2`} />
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Revenue time-series chart */}
        {timeSeries.length > 0 && timeSeries.some((p) => p.revenue > 0) && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" /> Attributed Revenue — Last 12 Months
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timeSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="portalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#52525b', fontSize: 10 }}
                  tickFormatter={(v: string) => v.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#52525b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Attributed']}
                  labelFormatter={(l: string) => `Month: ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  fill="url(#portalGrad)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Attribution summary card */}
        {attributionCount > 0 && (
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Your attributed revenue</p>
              <p className="text-white font-bold text-2xl mt-0.5">{fmtMoney(attributedRevenue)}</p>
              <p className="text-zinc-500 text-xs mt-1">from {attributionCount} conversion{attributionCount !== 1 ? 's' : ''}</p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-400 opacity-60" />
          </div>
        )}

        {/* Commission rate */}
        {commissionPct && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Your commission rate</p>
              <p className="text-white font-bold text-2xl mt-0.5">{commissionPct}%</p>
            </div>
            <Award className="h-8 w-8 text-indigo-400 opacity-60" />
          </div>
        )}

        {/* Tracking Links */}
        <div>
          <h2 className="text-white font-semibold mb-3">Your Tracking Links</h2>
          {creator.trackingLinks.length === 0 ? (
            <p className="text-zinc-500 text-sm">No tracking links yet.</p>
          ) : (
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-zinc-400">
                    <th className="px-5 py-3 font-medium">Slug</th>
                    <th className="px-5 py-3 font-medium">Destination</th>
                    <th className="px-5 py-3 font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {creator.trackingLinks.map((link) => (
                    <tr key={link.id} className="border-b border-zinc-700 last:border-0">
                      <td className="px-5 py-3 font-mono text-indigo-400 text-xs">{link.slug}</td>
                      <td className="px-5 py-3">
                        <a href={link.destinationUrl} target="_blank" rel="noreferrer"
                          className="text-zinc-400 hover:text-white text-xs flex items-center gap-1 max-w-xs truncate">
                          {link.destinationUrl}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="px-5 py-3 text-white font-medium">{link.clickCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payouts */}
        <div>
          <h2 className="text-white font-semibold mb-3">Payment History</h2>
          {payouts.length === 0 ? (
            <p className="text-zinc-500 text-sm">No payouts yet.</p>
          ) : (
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-zinc-400">
                    <th className="px-5 py-3 font-medium">Period</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-700 last:border-0">
                      <td className="px-5 py-3 text-zinc-400 text-xs">
                        {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-white font-semibold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency }).format(Number(p.amount))}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded border ${STATUS_COLORS[p.status] ?? ''}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-zinc-600 text-xs text-center pt-4">
          Powered by Trackfluence · This portal is for {creator.name} only
        </p>
      </div>
    </div>
  );
}
