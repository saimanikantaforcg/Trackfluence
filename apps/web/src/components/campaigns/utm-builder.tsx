'use client';

import { useState, useMemo } from 'react';
import { X, Copy, Check, Link2, ExternalLink } from 'lucide-react';

interface UtmBuilderProps {
  onClose: () => void;
  campaignName?: string;
}

const SOURCES = ['instagram', 'youtube', 'tiktok', 'twitter', 'linkedin', 'email', 'other'];
const MEDIUMS = ['social', 'influencer', 'affiliate', 'email', 'paid', 'organic'];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm text-white font-medium transition"
    >
      {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy URL</>}
    </button>
  );
}

export function UtmBuilder({ onClose, campaignName = '' }: UtmBuilderProps) {
  const [form, setForm] = useState({
    baseUrl: '',
    source: 'instagram',
    medium: 'influencer',
    campaign: campaignName,
    content: '',
    term: '',
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const builtUrl = useMemo(() => {
    const url = form.baseUrl.trim();
    if (!url) return '';
    try {
      // Validate URL
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      if (form.source) parsed.searchParams.set('utm_source', form.source);
      if (form.medium) parsed.searchParams.set('utm_medium', form.medium);
      if (form.campaign) parsed.searchParams.set('utm_campaign', form.campaign);
      if (form.content) parsed.searchParams.set('utm_content', form.content);
      if (form.term) parsed.searchParams.set('utm_term', form.term);
      return parsed.toString();
    } catch {
      return '';
    }
  }, [form]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-indigo-400" />
            <h2 className="text-white font-semibold">UTM Link Builder</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Base URL */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Destination URL *</label>
            <input
              value={form.baseUrl}
              onChange={(e) => set('baseUrl', e.target.value)}
              placeholder="https://yourstore.com/product"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* UTM Source */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">utm_source *</label>
              <select
                value={form.source}
                onChange={(e) => set('source', e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* UTM Medium */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">utm_medium *</label>
              <select
                value={form.medium}
                onChange={(e) => set('medium', e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {MEDIUMS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* UTM Campaign */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">utm_campaign</label>
              <input
                value={form.campaign}
                onChange={(e) => set('campaign', e.target.value)}
                placeholder="summer-2026"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* UTM Content */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">utm_content</label>
              <input
                value={form.content}
                onChange={(e) => set('content', e.target.value)}
                placeholder="creator-handle"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* UTM Term (optional) */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">utm_term <span className="text-zinc-600">(optional, for paid search)</span></label>
            <input
              value={form.term}
              onChange={(e) => set('term', e.target.value)}
              placeholder="keyword"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Generated URL preview */}
          {builtUrl ? (
            <div className="rounded-xl bg-zinc-800 border border-indigo-700/40 p-4 space-y-3">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Generated URL</p>
              <p className="text-xs text-indigo-300 font-mono break-all leading-relaxed">{builtUrl}</p>
              <div className="flex items-center gap-2">
                <CopyBtn text={builtUrl} />
                <a
                  href={builtUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-400 hover:text-white text-sm transition"
                >
                  <ExternalLink className="h-4 w-4" /> Preview
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-zinc-800/50 border border-zinc-700 p-4 text-center text-zinc-600 text-sm">
              Enter a destination URL to generate your UTM link
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
