'use client';

import { useState, useEffect } from 'react';
import { X, GitCompare } from 'lucide-react';
import type { Creator, CreatorScore } from '@/lib/api';

interface CompareDrawerProps {
  creators: Creator[];
  scoreMap: Map<string, CreatorScore>;
  onClose: () => void;
}

const TIER_STYLE: Record<string, string> = {
  platinum: 'text-violet-700 bg-violet-50 border-violet-200',
  gold: 'text-amber-700 bg-amber-50 border-amber-200',
  silver: 'text-slate-600 bg-slate-100 border-slate-200',
  bronze: 'text-orange-600 bg-orange-50 border-orange-200',
};

const PLATFORM_BADGE: Record<string, string> = {
  instagram: 'bg-pink-50 text-pink-700 border-pink-100',
  youtube: 'bg-red-50 text-red-700 border-red-100',
  tiktok: 'bg-slate-900 text-white border-slate-700',
  twitter: 'bg-sky-50 text-sky-700 border-sky-100',
  linkedin: 'bg-blue-50 text-blue-700 border-blue-100',
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

interface CreatorSelect {
  id: string;
  name: string;
}

function CompareColumn({
  creator,
  score,
  onRemove,
}: {
  creator: Creator | null;
  score: CreatorScore | undefined;
  onRemove: () => void;
}) {
  if (!creator) {
    return (
      <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center min-h-64 text-slate-400 text-sm">
        Select a creator
      </div>
    );
  }

  const initials = creator.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const badge = PLATFORM_BADGE[creator.platform ?? ''] ?? 'bg-slate-100 text-slate-600 border-slate-200';

  const stats = [
    { label: 'Score', value: score ? `${score.score}/100` : '—', highlight: true },
    { label: 'Tier', value: score ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TIER_STYLE[score.tier]}`}>{score.tier}</span> : '—', highlight: false },
    { label: 'Attributed Revenue', value: score ? fmtMoney(score.attributedRevenue) : '—', highlight: false },
    { label: 'Conversions', value: score ? score.conversions.toLocaleString() : '—', highlight: false },
    { label: 'Tracking Links', value: creator._count.trackingLinks.toLocaleString(), highlight: false },
    { label: 'Total Attributions', value: creator._count.attributions.toLocaleString(), highlight: false },
    { label: 'Total Clicks', value: score ? score.totalClicks.toLocaleString() : '—', highlight: false },
  ];

  return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Creator header */}
      <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-indigo-100 flex items-center justify-center text-base font-bold text-indigo-700 flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{creator.name}</p>
          {creator.handle && <p className="text-xs text-slate-500">{creator.handle}</p>}
          {creator.platform && (
            <span className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${badge}`}>
              {creator.platform}
            </span>
          )}
        </div>
        <button onClick={onRemove} className="text-slate-400 hover:text-slate-600 transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="divide-y divide-slate-100">
        {stats.map(({ label, value, highlight }) => (
          <div key={label} className="flex items-center justify-between px-5 py-3">
            <span className="text-xs text-slate-500">{label}</span>
            <span className={`text-sm font-semibold ${highlight ? 'text-indigo-700' : 'text-slate-900'}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompareDrawer({ creators, scoreMap, onClose }: CompareDrawerProps) {
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');

  const left = creators.find((c) => c.id === leftId) ?? null;
  const right = creators.find((c) => c.id === rightId) ?? null;
  const leftScore = scoreMap.get(leftId);
  const rightScore = scoreMap.get(rightId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-200 bg-white rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Creator Comparison</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Selectors */}
          <div className="flex gap-4">
            {([['Left', leftId, setLeftId, rightId], ['Right', rightId, setRightId, leftId]] as const).map(
              ([side, value, setter, excluded]) => (
                <div key={side} className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1.5">{side} creator</label>
                  <select
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Select…</option>
                    {creators
                      .filter((c) => c.id !== excluded)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.handle ? ` (${c.handle})` : ''}</option>
                      ))}
                  </select>
                </div>
              ),
            )}
          </div>

          {/* Comparison columns */}
          <div className="flex gap-4">
            <CompareColumn creator={left} score={leftScore} onRemove={() => setLeftId('')} />
            <CompareColumn creator={right} score={rightScore} onRemove={() => setRightId('')} />
          </div>

          {/* Winner summary */}
          {left && right && leftScore && rightScore && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4">
              <p className="text-xs text-indigo-500 uppercase tracking-wide font-medium mb-2">Performance winner</p>
              {leftScore.score > rightScore.score ? (
                <p className="text-sm text-indigo-800">
                  <strong>{left.name}</strong> leads with a score of <strong>{leftScore.score}</strong> vs {rightScore.score}
                  {' '}and {fmtMoney(leftScore.attributedRevenue)} vs {fmtMoney(rightScore.attributedRevenue)} attributed revenue.
                </p>
              ) : leftScore.score < rightScore.score ? (
                <p className="text-sm text-indigo-800">
                  <strong>{right.name}</strong> leads with a score of <strong>{rightScore.score}</strong> vs {leftScore.score}
                  {' '}and {fmtMoney(rightScore.attributedRevenue)} vs {fmtMoney(leftScore.attributedRevenue)} attributed revenue.
                </p>
              ) : (
                <p className="text-sm text-indigo-800">Both creators are <strong>tied</strong> at a score of {leftScore.score}.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
