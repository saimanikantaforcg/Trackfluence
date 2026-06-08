import { api } from '@/lib/api';
import { notFound } from 'next/navigation';
import { Link2, BarChart2, ArrowLeft, TrendingUp, Hash, DollarSign, Users, MousePointerClick } from 'lucide-react';
import Link from 'next/link';
import CreatorRevenueChart from '@/components/creators/creator-revenue-chart';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function fetchCreator(id: string) {
  try {
    const res = await fetch(`${API}/api/v1/creators/${id}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchCreatorRevenue(id: string) {
  try {
    const res = await fetch(`${API}/api/v1/revenue-intelligence/roas`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.creatorBreakdown?.find((c: any) => c.creatorId === id) ?? null;
  } catch {
    return null;
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PLATFORM_BADGE: Record<string, string> = {
  instagram: 'bg-pink-50 text-pink-700 border-pink-100',
  youtube: 'bg-red-50 text-red-700 border-red-100',
  tiktok: 'bg-slate-900 text-white border-slate-700',
  twitter: 'bg-sky-50 text-sky-700 border-sky-100',
  linkedin: 'bg-blue-50 text-blue-700 border-blue-100',
};

export default async function CreatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [creator, revenue] = await Promise.all([fetchCreator(id), fetchCreatorRevenue(id)]);
  if (!creator) notFound();

  const totalClicks = creator.trackingLinks?.reduce((s: number, l: any) => s + l.clickCount, 0) ?? 0;
  const attributedRevenue: number = revenue?.attributedRevenue ?? 0;
  const conversions: number = creator._count?.attributions ?? 0;
  const convRate = totalClicks > 0 ? ((conversions / totalClicks) * 100).toFixed(1) : '0';
  const badgeClass = PLATFORM_BADGE[creator.platform ?? ''] ?? 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/creators" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Creators
      </Link>

      {/* Hero */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-700 flex-shrink-0">
            {creator.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{creator.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {creator.handle && (
                <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                  <Hash className="h-3.5 w-3.5" />{creator.handle}
                </span>
              )}
              {creator.platform && (
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${badgeClass}`}>
                  {creator.platform}
                </span>
              )}
              {creator.email && <span className="text-sm text-slate-400">{creator.email}</span>}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{attributedRevenue > 0 ? fmt(attributedRevenue) : '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1"><DollarSign className="h-3 w-3" />Attributed Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{conversions}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1"><Users className="h-3 w-3" />Conversions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{totalClicks.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1"><MousePointerClick className="h-3 w-3" />Total Clicks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{convRate}%</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1"><TrendingUp className="h-3 w-3" />Conv. Rate</p>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <CreatorRevenueChart
        trackingLinks={creator.trackingLinks ?? []}
        attributedRevenue={attributedRevenue}
        conversions={conversions}
      />

      {/* Tracking Links */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-indigo-600" />
          <h2 className="text-base font-semibold text-slate-900">Tracking Links</h2>
        </div>
        {!creator.trackingLinks?.length ? (          <div className="px-6 py-10 text-center text-sm text-slate-400">No tracking links yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Short Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Destination</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Campaign</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {creator.trackingLinks.map((link: any) => (
                <tr key={link.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600">/{link.shortCode}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{link.type}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[200px]">{link.destinationUrl}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{link.utmCampaign ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                      <BarChart2 className="h-3.5 w-3.5 text-slate-400" />
                      {link.clickCount.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
