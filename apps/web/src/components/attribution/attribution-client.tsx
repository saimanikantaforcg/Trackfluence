'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { Link2, Plus, X, Copy, Check, ExternalLink, BarChart2, Search, Clock, DollarSign } from 'lucide-react';
import { api, type TrackingLink, type Creator, type AttributionModel, ATTRIBUTION_MODELS, type OrderAttributionResult } from '@/lib/api';
import { useDateRange } from '@/lib/date-range-context';

interface CreateLinkModalProps {
  creators: Creator[];
  onClose: () => void;
  onCreated: (link: TrackingLink) => void;
}

const TRACKING_LINK_TYPES = [
  { value: 'STANDARD', label: 'Standard Link' },
  { value: 'PROMO_CODE', label: 'Promo Code' },
  { value: 'QR_CODE', label: 'QR Code' },
];

const UTM_SOURCES = ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'pinterest', 'email', 'other'];

function CreateLinkModal({ creators, onClose, onCreated }: CreateLinkModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    creatorId: creators[0]?.id ?? '',
    destinationUrl: '',
    type: 'STANDARD',
    utmSource: 'instagram',
    utmMedium: 'social',
    utmCampaign: '',
    promoCode: '',
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {
          creatorId: form.creatorId,
          destinationUrl: form.destinationUrl,
          type: form.type,
          utmSource: form.utmSource || undefined,
          utmMedium: form.utmMedium || undefined,
          utmCampaign: form.utmCampaign || undefined,
          promoCode: form.promoCode || undefined,
        };
        const link = await api.createTrackingLink(payload);
        onCreated(link);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create link');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Create Tracking Link</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Creator */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Creator *</label>
            <select
              required
              value={form.creatorId}
              onChange={(e) => set('creatorId', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {creators.length === 0 && <option value="">No creators yet — add one first</option>}
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.handle ? `(${c.handle})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Destination URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Destination URL *</label>
            <input
              type="url"
              required
              placeholder="https://yourstore.com/product"
              value={form.destinationUrl}
              onChange={(e) => set('destinationUrl', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Link Type</label>
            <div className="flex gap-2">
              {TRACKING_LINK_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('type', t.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    form.type === t.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* UTM params */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">UTM Source</label>
              <select
                value={form.utmSource}
                onChange={(e) => set('utmSource', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {UTM_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">UTM Medium</label>
              <input
                type="text"
                placeholder="social"
                value={form.utmMedium}
                onChange={(e) => set('utmMedium', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Campaign</label>
              <input
                type="text"
                placeholder="summer-2026"
                value={form.utmCampaign}
                onChange={(e) => set('utmCampaign', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {form.type === 'PROMO_CODE' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Promo Code *</label>
              <input
                type="text"
                required={form.type === 'PROMO_CODE'}
                placeholder="CREATOR20"
                value={form.promoCode}
                onChange={(e) => set('promoCode', e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !form.creatorId}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Creating…' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────

interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded p-1.5 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─────────────────────────────────────────────

interface AttributionClientProps {
  initialLinks: TrackingLink[];
  creators: Creator[];
}

export function AttributionClient({ initialLinks, creators }: AttributionClientProps) {
  const [links, setLinks] = useState<TrackingLink[]>(initialLinks);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [model, setModel] = useState<AttributionModel>('LAST_TOUCH');
  // Order drill-down
  const [orderId, setOrderId] = useState('');
  const [orderResult, setOrderResult] = useState<OrderAttributionResult | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const { fromISO, toISO } = useDateRange();
  const mounted = useRef(false);

  async function lookupOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId.trim()) return;
    setOrderLoading(true);
    setOrderError(null);
    setOrderResult(null);
    try {
      const result = await api.getOrderAttribution(orderId.trim());
      setOrderResult(result);
    } catch {
      setOrderError('Order not found or no attributions exist for this order ID.');
    } finally {
      setOrderLoading(false);
    }
  }

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setFetching(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('tf_token') : null;
    const params = new URLSearchParams({ from: fromISO, to: toISO });
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/attribution/tracking-links?${params}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
      .then((r) => r.json())
      .then((data) => setLinks(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [fromISO, toISO]);

  const tabs = ['Tracking Links', 'Promo Codes', 'QR Codes'];

  const filteredLinks = links.filter((l) => {
    if (activeTab === 0) return l.type !== 'PROMO_CODE' && l.type !== 'QR_CODE';
    if (activeTab === 1) return l.type === 'PROMO_CODE';
    if (activeTab === 2) return l.type === 'QR_CODE';
    return true;
  });

  const shortUrl = (code: string) => `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/attribution/r/${code}`;

  return (
    <>
      {showModal && (
        <CreateLinkModal
          creators={creators}
          onClose={() => setShowModal(false)}
          onCreated={(link) => setLinks((prev) => [link, ...prev])}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Attribution Infrastructure</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage tracking links, promo codes, and server-side events
            </p>
          </div>
          <div className="flex items-center gap-3">
            {fetching && <span className="text-xs text-slate-400 animate-pulse">Updating…</span>}
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Tracking Link
            </button>
          </div>
        </div>

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
          <span className="text-xs text-slate-400 ml-2">
            (affects how multi-touchpoint orders are attributed to creators)
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                i === activeTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Links Table */}
        {filteredLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16">
            <Link2 className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No {tabs[activeTab].toLowerCase()} yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md text-center">
              Create your first tracking link to start attributing creator-driven revenue.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Create Tracking Link
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Creator</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Short URL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">UTM Campaign</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Clicks</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{link.creator?.name ?? '—'}</div>
                      {link.creator?.handle && (
                        <div className="text-xs text-slate-400">{link.creator.handle}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 font-mono text-xs text-indigo-600">
                        <span>/{link.shortCode}</span>
                        <CopyButton text={shortUrl(link.shortCode)} />
                      </div>
                      {link.promoCode && (
                        <div className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-xs font-mono text-amber-700 border border-amber-200">
                          {link.promoCode}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="truncate text-slate-600 text-xs">{link.destinationUrl}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {link.utmCampaign ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 text-slate-700 font-medium">
                        <BarChart2 className="h-3.5 w-3.5 text-slate-400" />
                        {link.clickCount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={link.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors inline-flex"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Order Attribution Drill-down */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Order Attribution Lookup</h2>
          </div>
          <form onSubmit={lookupOrder} className="flex gap-3 mb-4">
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Enter Order ID…"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <button
              type="submit"
              disabled={orderLoading || !orderId.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {orderLoading ? 'Looking up…' : 'Look up'}
            </button>
          </form>

          {orderError && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{orderError}</p>
          )}

          {orderResult && (
            <div className="space-y-3">
              {orderResult.message && !orderResult.attributions.length ? (
                <p className="text-sm text-slate-500 italic">{orderResult.message}</p>
              ) : (
                <>
                  <p className="text-xs text-slate-500">Attribution results for order <code className="font-mono bg-slate-100 px-1 rounded">{orderResult.orderId}</code> — {orderResult.attributions.length} touchpoint{orderResult.attributions.length !== 1 ? 's' : ''}</p>
                  <div className="rounded-lg border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Creator</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Weight</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Attributed Revenue</th>
                          <th className="px-4 py-2.5 w-32">Credit Bar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {orderResult.attributions.map((a, i) => (
                          <tr key={a.touchpointId ?? i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                                <span className="font-medium text-slate-700">{a.creatorName ?? a.creatorId}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-600">{(a.weight * 100).toFixed(1)}%</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                              <span className="flex items-center justify-end gap-1">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                                {a.revenue.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{ width: `${Math.min(a.weight * 100, 100)}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
