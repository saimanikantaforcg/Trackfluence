import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Megaphone,
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  BarChart3,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function fetchCampaignStats(id: string) {
  try {
    const res = await fetch(`${API}/api/v1/campaigns/${id}/stats`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface CampaignStats {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  budget: string | null;
  currency: string;
  creatorIds: string[];
  spend: number;
  remaining: number | null;
  roi: number | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
};

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'indigo',
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-500',
    blue: 'bg-blue-50 text-blue-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorMap[color] ?? colorMap.indigo}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign: CampaignStats | null = await fetchCampaignStats(id);
  if (!campaign) notFound();

  const budget = Number(campaign.budget ?? 0);
  const spendPct = budget > 0 ? Math.min((campaign.spend / budget) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-3">
            <Megaphone className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
            {campaign.description && (
              <p className="text-sm text-slate-500 mt-0.5">{campaign.description}</p>
            )}
          </div>
        </div>
        <span
          className={`mt-1 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize ${
            STATUS_COLORS[campaign.status] ?? STATUS_COLORS.active
          }`}
        >
          {campaign.status}
        </span>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Calendar className="h-4 w-4" />
        <span>
          {fmtDate(campaign.startDate)}
          {campaign.endDate ? ` → ${fmtDate(campaign.endDate)}` : ' · Ongoing'}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Budget"
          value={budget > 0 ? fmt(budget, campaign.currency) : '—'}
          color="indigo"
        />
        <StatCard
          icon={BarChart3}
          label="Spend"
          value={fmt(campaign.spend, campaign.currency)}
          sub={budget > 0 ? `${spendPct.toFixed(0)}% of budget` : undefined}
          color="amber"
        />
        <StatCard
          icon={DollarSign}
          label="Remaining"
          value={campaign.remaining !== null ? fmt(campaign.remaining, campaign.currency) : '—'}
          color={campaign.remaining !== null && campaign.remaining < 0 ? 'red' : 'emerald'}
        />
        <StatCard
          icon={TrendingUp}
          label="ROI"
          value={campaign.roi !== null ? `${campaign.roi.toFixed(1)}%` : '—'}
          color={campaign.roi !== null && campaign.roi > 0 ? 'emerald' : 'red'}
        />
      </div>

      {/* Budget progress bar */}
      {budget > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700">Budget Utilisation</p>
            <p className="text-sm font-semibold text-slate-900">{spendPct.toFixed(1)}%</p>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                spendPct >= 90 ? 'bg-red-500' : spendPct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${spendPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>Spent: {fmt(campaign.spend, campaign.currency)}</span>
            <span>Budget: {fmt(budget, campaign.currency)}</span>
          </div>
        </div>
      )}

      {/* Creator roster */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-indigo-600" />
          <h2 className="text-base font-semibold text-slate-900">Creator Roster</h2>
          <span className="ml-auto text-xs text-slate-400">{campaign.creatorIds.length} creator{campaign.creatorIds.length !== 1 ? 's' : ''}</span>
        </div>
        {campaign.creatorIds.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            No creators assigned to this campaign.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {campaign.creatorIds.map((cid) => (
              <Link
                key={cid}
                href={`/creators/${cid}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                <Users className="h-3 w-3" />
                {cid.slice(0, 8)}…
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Campaign Details</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Campaign ID</dt>
            <dd className="font-mono text-slate-700 text-xs mt-0.5">{campaign.id}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Currency</dt>
            <dd className="font-medium text-slate-700">{campaign.currency}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="text-slate-700">{fmtDate(campaign.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="capitalize font-medium text-slate-700">{campaign.status}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
