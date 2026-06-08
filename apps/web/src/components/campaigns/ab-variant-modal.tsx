'use client';

import { useState } from 'react';
import { X, GitBranch, Copy, Check, BarChart2 } from 'lucide-react';

interface Variant {
  id: string;
  shortCode: string;
  destinationUrl: string;
  variantLabel: string;
  clickCount: number;
  conversionCount: number;
  conversionRate: number;
}

interface Props {
  campaignId: string;
  trackingLinks: { id: string; shortCode: string; destinationUrl: string }[];
  onClose: () => void;
}

export function AbVariantModal({ campaignId, trackingLinks, onClose }: Props) {
  const [parentLinkId, setParentLinkId] = useState(trackingLinks[0]?.id ?? '');
  const [variantLabel, setVariantLabel] = useState('B');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function createVariant() {
    if (!parentLinkId) return;
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('tf_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/campaigns/${campaignId}/variants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          parentLinkId,
          variantLabel: variantLabel.trim() || 'B',
          destinationUrl: destinationUrl.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      // Reload variants using the parent link's id as groupId
      await loadVariants(parentLinkId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create variant');
    } finally {
      setSaving(false);
    }
  }

  async function loadVariants(groupId: string) {
    try {
      const token = localStorage.getItem('tf_token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/campaigns/${campaignId}/variants/${groupId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) return;
      setVariants(await res.json() as Variant[]);
    } catch { /* silent */ }
  }

  function copy(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <GitBranch className="text-indigo-400" size={20} />
            <h2 className="text-lg font-bold text-white">A/B Link Variants</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Create form */}
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3 mb-4">
          <p className="text-sm font-medium text-slate-300">Create New Variant</p>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Parent Link (A variant)</label>
            <select
              value={parentLinkId}
              onChange={e => setParentLinkId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {trackingLinks.map(l => (
                <option key={l.id} value={l.id}>{l.shortCode} — {l.destinationUrl.slice(0, 50)}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="w-24">
              <label className="text-xs text-slate-400 mb-1 block">Label</label>
              <input
                value={variantLabel}
                onChange={e => setVariantLabel(e.target.value)}
                maxLength={4}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 text-center"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Destination URL (optional — inherits from parent)</label>
              <input
                value={destinationUrl}
                onChange={e => setDestinationUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={createVariant}
              disabled={saving || !parentLinkId}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating…' : 'Create Variant'}
            </button>
            <button
              onClick={() => loadVariants(parentLinkId)}
              disabled={!parentLinkId}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-50 transition-colors"
            >
              Load Results
            </button>
          </div>
        </div>

        {/* Variant results */}
        {variants && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={16} className="text-slate-400" />
              <p className="text-sm font-medium text-slate-300">Variant Performance</p>
            </div>
            <div className="space-y-2">
              {variants.map(v => {
                const trackUrl = `${baseUrl}/t/${v.shortCode}`;
                return (
                  <div key={v.id} className="bg-slate-800 rounded-lg p-3 flex items-center gap-4">
                    <span className="text-xs font-bold text-indigo-400 w-6 text-center">{v.variantLabel}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate">{v.destinationUrl}</p>
                      <p className="text-xs text-slate-500">{trackUrl}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-white font-medium">{v.clickCount} clicks</p>
                      <p className="text-slate-400">{v.conversionRate.toFixed(1)}% CVR</p>
                    </div>
                    <button onClick={() => copy(trackUrl, v.id)} className="text-slate-400 hover:text-white">
                      {copied === v.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!variants && (
          <p className="text-xs text-slate-500 text-center py-2">
            Create a variant or click &ldquo;Load Results&rdquo; to view A/B stats.
          </p>
        )}
      </div>
    </div>
  );
}
