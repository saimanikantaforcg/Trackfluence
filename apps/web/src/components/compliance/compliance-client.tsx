'use client';

import { useState, useEffect, useTransition } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Plus, X, ExternalLink } from 'lucide-react';
import type { ComplianceSummary, CreatorComplianceRow, Creator } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tf_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── FTC Check modal ──────────────────────────────────────────

function CheckModal({ creators, onClose, onChecked }: {
  creators: Creator[];
  onClose: () => void;
  onChecked: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ isCompliant: boolean; issues: string[] } | null>(null);
  const [form, setForm] = useState({
    creatorId: creators[0]?.id ?? '',
    contentUrl: '',
    contentType: 'POST',
    contentText: '',
    hasSponsorship: true,
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await fetch(`${API}/api/v1/compliance/ftc/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setResult({ isCompliant: data.isCompliant, issues: data.issues });
        onChecked();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Check failed');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Run FTC Compliance Check</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Creator *</label>
            <select
              required
              value={form.creatorId}
              onChange={(e) => set('creatorId', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {creators.length === 0 && <option value="">No creators yet</option>}
              {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Content URL *</label>
            <input
              type="url"
              required
              value={form.contentUrl}
              onChange={(e) => set('contentUrl', e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Content Type *</label>
            <div className="flex gap-2">
              {['POST', 'STORY', 'VIDEO', 'BLOG'].map((t) => (
                <button key={t} type="button" onClick={() => set('contentType', t)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${form.contentType === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Caption / Content Text <span className="text-slate-400 font-normal">(for analysis)</span>
            </label>
            <textarea
              rows={3}
              value={form.contentText}
              onChange={(e) => set('contentText', e.target.value)}
              placeholder="Paste the caption or content to check for FTC disclosures…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.hasSponsorship}
              onChange={(e) => set('hasSponsorship', e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">This is sponsored content</span>
          </label>

          {result && (
            <div className={`rounded-lg border px-4 py-3 ${result.isCompliant ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <p className={`text-sm font-semibold ${result.isCompliant ? 'text-emerald-700' : 'text-red-700'}`}>
                {result.isCompliant ? '✅ Content is compliant' : '⚠️ Compliance issues found'}
              </p>
              {result.issues.length > 0 && (
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  {result.issues.map((issue, i) => (
                    <li key={i} className="text-xs text-red-600">{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {result ? 'Close' : 'Cancel'}
            </button>
            <button type="submit" disabled={isPending || !form.creatorId} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {isPending ? 'Checking…' : 'Run Check'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────

export function ComplianceClient() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [creatorRows, setCreatorRows] = useState<CreatorComplianceRow[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    const headers = authHeaders();
    const [summaryRes, creatorsRes, allCreatorRes] = await Promise.allSettled([
      fetch(`${API}/api/v1/compliance/ftc/summary`, { headers }).then((r) => r.json()),
      fetch(`${API}/api/v1/creators`, { headers }).then((r) => r.json()),
      fetch(`${API}/api/v1/compliance/ftc/creators`, { headers }).then((r) => r.json()),
    ]);
    if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
    if (creatorsRes.status === 'fulfilled') setCreators(Array.isArray(creatorsRes.value) ? creatorsRes.value : []);
    if (allCreatorRes.status === 'fulfilled') setCreatorRows(Array.isArray(allCreatorRes.value) ? allCreatorRes.value : []);
  }

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, []);

  const complianceRate = summary ? Math.round((summary.complianceRate ?? 0) * 100) : 0;

  return (
    <>
      {showModal && (
        <CheckModal
          creators={creators}
          onClose={() => setShowModal(false)}
          onChecked={() => fetchAll()}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Compliance & Trust</h1>
            <p className="text-sm text-slate-500 mt-1">FTC disclosure monitoring and brand safety scoring</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Run FTC Check
          </button>
        </div>

        {/* Summary KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Compliance Rate</p>
                <p className="text-2xl font-bold text-slate-900">{loading ? '—' : `${complianceRate}%`}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
              <div>
                <p className="text-sm text-slate-500">Issues Found</p>
                <p className="text-2xl font-bold text-slate-900">{loading ? '—' : (summary?.nonCompliantCount ?? 0)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2"><ShieldCheck className="h-5 w-5 text-indigo-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Total Checks</p>
                <p className="text-2xl font-bold text-slate-900">{loading ? '—' : (summary?.totalChecks ?? 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top issues */}
        {summary?.topIssues && summary.topIssues.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Top Compliance Issues</h2>
            <div className="space-y-2">
              {summary.topIssues.map((issue, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{issue.issue}</span>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                    {issue.count}×
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Creator compliance table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : creatorRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16">
            <ShieldCheck className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No compliance checks yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md text-center">
              Submit creator content for FTC compliance validation.
            </p>
            <button onClick={() => setShowModal(true)} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Run First Check
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Creator Compliance Overview</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Creator</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Platform</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Total Checks</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Issues</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Last Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {creatorRows.map((row) => (
                  <tr key={row.creatorId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{row.name}</div>
                      {row.handle && <div className="text-xs text-slate-400">{row.handle}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{row.platform ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.totalChecks}</td>
                    <td className="px-4 py-3 text-right">
                      {row.nonCompliantCount > 0 ? (
                        <span className="text-red-600 font-medium">{row.nonCompliantCount}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.complianceRate !== null ? (
                        <span className={`font-medium ${row.complianceRate >= 0.8 ? 'text-emerald-600' : row.complianceRate >= 0.5 ? 'text-amber-500' : 'text-red-600'}`}>
                          {Math.round(row.complianceRate * 100)}%
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.lastCheckedAt ? (
                        <span className={`inline-flex items-center gap-1 ${row.lastCheckPassed ? 'text-emerald-600' : 'text-red-500'}`}>
                          {row.lastCheckPassed ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {new Date(row.lastCheckedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-300">Never</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
