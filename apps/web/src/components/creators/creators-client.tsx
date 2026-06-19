'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Search, Plus, Instagram, Youtube, X, ChevronDown, Download, GitCompare } from 'lucide-react';
import type { Creator, CreatorScore } from '@/lib/api';
import { exportCsv } from '@/lib/export-csv';
import { CompareDrawer } from '@/components/creators/compare-drawer';
import OnboardingWizard from '@/components/creators/onboarding-wizard';

const PLATFORMS = ['All', 'instagram', 'youtube', 'tiktok', 'twitter', 'linkedin'];

const PLATFORM_BADGE: Record<string, string> = {
  instagram: 'bg-pink-50 text-pink-700 border-pink-100',
  youtube: 'bg-red-50 text-red-700 border-red-100',
  tiktok: 'bg-slate-900 text-white border-slate-700',
  twitter: 'bg-sky-50 text-sky-700 border-sky-100',
  linkedin: 'bg-blue-50 text-blue-700 border-blue-100',
};

const TIER_STYLE: Record<string, string> = {
  platinum: 'bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-300',
  gold: 'bg-amber-50 text-amber-700 border-amber-200',
  silver: 'bg-slate-100 text-slate-600 border-slate-200',
  bronze: 'bg-orange-50 text-orange-600 border-orange-200',
};

const TIER_LABEL: Record<string, string> = {
  platinum: '✦ Platinum',
  gold: '★ Gold',
  silver: '◆ Silver',
  bronze: '● Bronze',
};

const SORT_OPTIONS = [
  { value: 'score', label: 'Performance Score' },
  { value: 'revenue', label: 'Attributed Revenue' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'links', label: 'Tracking Links' },
];

interface CreateCreatorModalProps {
  onClose: () => void;
  onCreated: (creator: Creator) => void;
  token: string | null;
}

function CreateCreatorModal({ onClose, onCreated, token }: CreateCreatorModalProps) {
  const [form, setForm] = useState({ name: '', handle: '', platform: 'instagram', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/creators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated(await res.json());
    } catch (err: any) {
      setError(err.message ?? 'Failed to create creator');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Add Creator</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} required
              placeholder="Emma Chen" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Handle</label>
            <input value={form.handle} onChange={(e) => set('handle', e.target.value)}
              placeholder="@emmachen" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Platform</label>
            <div className="relative">
              <select value={form.platform} onChange={(e) => set('platform', e.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 px-3 pr-8 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white">
                {PLATFORMS.filter((p) => p !== 'All').map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input value={form.email} onChange={(e) => set('email', e.target.value)} type="email"
              placeholder="creator@email.com" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
              {loading ? 'Creating…' : 'Create Creator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CreatorsClientProps {
  initialCreators: Creator[];
  scores: CreatorScore[];
  token: string | null;
}

export function CreatorsClient({ initialCreators, scores, token }: CreatorsClientProps) {
  const [creators, setCreators] = useState(initialCreators);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('All');
  const [sortBy, setSortBy] = useState('score');
  const [showCreate, setShowCreate] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const router = useRouter();

  // Build score map keyed by creator id
  const scoreMap = useMemo(() => {
    const map = new Map<string, CreatorScore>();
    scores.forEach((s) => map.set(s.creatorId, s));
    return map;
  }, [scores]);

  const filtered = useMemo(() => {
    const base = creators.filter((c) => {
      const matchSearch = !search || [c.name, c.handle, c.email].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
      const matchPlatform = platform === 'All' || c.platform === platform;
      return matchSearch && matchPlatform;
    });

    return [...base].sort((a, b) => {
      const sa = scoreMap.get(a.id);
      const sb = scoreMap.get(b.id);
      if (sortBy === 'score') return (sb?.score ?? 0) - (sa?.score ?? 0);
      if (sortBy === 'revenue') return (sb?.attributedRevenue ?? 0) - (sa?.attributedRevenue ?? 0);
      if (sortBy === 'conversions') return (sb?.conversions ?? 0) - (sa?.conversions ?? 0);
      if (sortBy === 'links') return b._count.trackingLinks - a._count.trackingLinks;
      return 0;
    });
  }, [creators, search, platform, sortBy, scoreMap]);

  function handleCreated(creator: Creator) {
    setCreators((prev) => [creator, ...prev]);
    setShowCreate(false);
  }

  return (
    <div className="space-y-6">
      {showCreate && (
        <OnboardingWizard
          onClose={() => setShowCreate(false)}
          onCreated={(c) => handleCreated(c as Creator)}
        />
      )}
      {showCompare && <CompareDrawer creators={creators} scoreMap={scoreMap} onClose={() => setShowCompare(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Creators</h1>
          <p className="text-sm text-slate-500 mt-0.5">{creators.length} creator{creators.length !== 1 ? 's' : ''} in your network</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCsv(filtered.map((c) => ({ name: c.name, handle: c.handle ?? '', email: c.email ?? '', platform: c.platform ?? '', links: c._count.trackingLinks, conversions: c._count.attributions })), 'creators')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => setShowCompare(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <GitCompare className="h-4 w-4" /> Compare
          </button>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Add Creator
          </button>
        </div>
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search creators…"
            className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          {PLATFORMS.map((p) => (
            <button key={p} onClick={() => setPlatform(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${platform === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <div className="relative ml-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-7 py-1 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 && creators.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <TrendingUp className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No creators yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Add creators to start tracking their performance and attributing revenue</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add your first creator
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No creators match your filters</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or platform filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((creator) => {
            const initials = creator.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
            const badgeClass = PLATFORM_BADGE[creator.platform ?? ''] ?? 'bg-slate-100 text-slate-600 border-slate-200';
            const score = scoreMap.get(creator.id);
            return (
              <button key={creator.id} onClick={() => router.push(`/creators/${creator.id}`)}
                className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-indigo-300 hover:shadow-md transition-all group">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-base font-bold text-indigo-700 flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{creator.name}</p>
                      {creator.platform && (
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                          {creator.platform}
                        </span>
                      )}
                    </div>
                    {creator.handle && <p className="text-xs text-slate-400 mt-0.5">{creator.handle}</p>}
                  </div>
                  {score && (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TIER_STYLE[score.tier]}`}>
                        {TIER_LABEL[score.tier]}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{score.score}/100</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{creator._count.trackingLinks}</p>
                    <p className="text-xs text-slate-400">Links</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{creator._count.attributions}</p>
                    <p className="text-xs text-slate-400">Converts</p>
                  </div>
                  <div className="flex items-center justify-end">
                    {score && score.attributedRevenue > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">
                          ${score.attributedRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[10px] text-slate-400">attributed</p>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
