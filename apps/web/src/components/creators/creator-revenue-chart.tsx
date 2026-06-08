'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface TrackingLink {
  id: string;
  clickCount: number;
  createdAt: string;
  utmCampaign?: string;
}

interface Props {
  trackingLinks: TrackingLink[];
  attributedRevenue: number;
  conversions: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function CreatorRevenueChart({ trackingLinks, attributedRevenue, conversions }: Props) {
  // Build monthly click distribution from tracking link creation dates
  const chartData = useMemo(() => {
    if (!trackingLinks.length) return [];

    // Group clicks by month of link creation (proxy for activity timeline)
    const byMonth = new Map<string, { clicks: number; links: number }>();
    for (const link of trackingLinks) {
      const month = link.createdAt.slice(0, 7); // "YYYY-MM"
      const existing = byMonth.get(month) ?? { clicks: 0, links: 0 };
      byMonth.set(month, {
        clicks: existing.clicks + link.clickCount,
        links: existing.links + 1,
      });
    }

    // Sort and distribute revenue proportionally by clicks
    const entries = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
    const totalClicks = entries.reduce((s, [, v]) => s + v.clicks, 0);

    return entries.map(([month, { clicks, links }]) => {
      const share = totalClicks > 0 ? clicks / totalClicks : 1 / entries.length;
      return {
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        clicks,
        links,
        revenue: Math.round(attributedRevenue * share),
        conversions: Math.round(conversions * share),
      };
    });
  }, [trackingLinks, attributedRevenue, conversions]);

  if (!chartData.length) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Performance Over Time</h2>
        </div>
        <p className="text-zinc-500 text-sm py-8 text-center">No tracking link data available yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Performance Over Time</h2>
        </div>
        <div className="flex items-center gap-5 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
            Attributed Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Clicks
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="rev"
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <YAxis
            yAxisId="clicks"
            orientation="right"
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, color: '#fff' }}
            formatter={(value, name) => {
              if (name === 'revenue') return [fmt(value as number), 'Revenue'];
              return [(value as number).toLocaleString(), name === 'clicks' ? 'Clicks' : String(name)];
            }}
          />
          <Area
            yAxisId="rev"
            type="monotone"
            dataKey="revenue"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#revGrad)"
            dot={false}
          />
          <Area
            yAxisId="clicks"
            type="monotone"
            dataKey="clicks"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#clickGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
