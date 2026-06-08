'use client';

import { useEffect, useState, useTransition } from 'react';
import { Users, Plus, Trash2, X, Play, Upload, ChevronDown, ChevronUp, Download } from 'lucide-react';
import {
  api,
  type AudienceSegment,
  type AudienceRule,
  type AudienceRuleField,
  type AudienceRuleOperator,
  type ExportDestination,
} from '@/lib/api';

// ─── Field/operator config ────────────────────────────────────

const FIELD_OPTIONS: { value: AudienceRuleField; label: string; type: 'boolean' | 'number' | 'string' }[] = [
  { value: 'creatorAcquired', label: 'Creator-acquired customer', type: 'boolean' },
  { value: 'totalRevenue', label: 'Lifetime revenue ($)', type: 'number' },
  { value: 'orderCount', label: 'Total order count', type: 'number' },
  { value: 'creatorId', label: 'Acquired by creator (ID)', type: 'string' },
  { value: 'channel', label: 'Acquisition channel (UTM source)', type: 'string' },
];

const NUMBER_OPERATORS: { value: AudienceRuleOperator; label: string }[] = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
];

const EQ_OPERATORS: { value: AudienceRuleOperator; label: string }[] = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
];

function operatorsFor(type: 'boolean' | 'number' | 'string') {
  return type === 'number' ? NUMBER_OPERATORS : EQ_OPERATORS;
}

// ─── Rule builder row ─────────────────────────────────────────

function RuleRow({
  rule,
  onChange,
  onRemove,
}: {
  rule: AudienceRule;
  onChange: (r: AudienceRule) => void;
  onRemove: () => void;
}) {
  const fieldDef = FIELD_OPTIONS.find((f) => f.value === rule.field);
  const type = fieldDef?.type ?? 'string';
  const operators = operatorsFor(type);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      {/* Field */}
      <select
        value={rule.field}
        onChange={(e) => onChange({ ...rule, field: e.target.value as AudienceRuleField, operator: 'eq', value: '' })}
        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {FIELD_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={rule.operator}
        onChange={(e) => onChange({ ...rule, operator: e.target.value as AudienceRuleOperator })}
        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value */}
      {type === 'boolean' ? (
        <select
          value={String(rule.value)}
          onChange={(e) => onChange({ ...rule, value: e.target.value === 'true' })}
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : (
        <input
          type={type === 'number' ? 'number' : 'text'}
          value={String(rule.value)}
          onChange={(e) => onChange({ ...rule, value: type === 'number' ? Number(e.target.value) : e.target.value })}
          placeholder={type === 'number' ? '0' : 'value…'}
          className="w-32 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      )}

      <button
        onClick={onRemove}
        className="ml-auto rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Create segment modal ─────────────────────────────────────

function CreateSegmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: AudienceSegment) => void }) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<AudienceRule[]>([
    { field: 'creatorAcquired', operator: 'eq', value: true },
  ]);
  const [error, setError] = useState<string | null>(null);

  function addRule() {
    setRules((r) => [...r, { field: 'totalRevenue', operator: 'gte', value: 0 }]);
  }

  function updateRule(i: number, r: AudienceRule) {
    setRules((prev) => prev.map((old, idx) => (idx === i ? r : old)));
  }

  function removeRule(i: number) {
    setRules((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setError(null);
    startTransition(async () => {
      try {
        const token = localStorage.getItem('tf_token');
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/audiences`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, rules }),
          },
        );
        if (!res.ok) throw new Error(await res.text());
        const segment: AudienceSegment = await res.json();
        onCreated(segment);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create segment');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Create Audience Segment</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High-LTV Creator Customers"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional segment description"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Filter Rules (ALL must match)</label>
              <button
                type="button"
                onClick={addRule}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add rule
              </button>
            </div>
            {rules.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No rules — will match all customers.</p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule, i) => (
                  <RuleRow key={i} rule={rule} onChange={(r) => updateRule(i, r)} onRemove={() => removeRule(i)} />
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creating…' : 'Create Segment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Segment card ─────────────────────────────────────────────

const EXPORT_DESTINATIONS: { value: ExportDestination; label: string }[] = [
  { value: 'salesforce', label: 'Salesforce CRM' },
  { value: 'salesforce_data_cloud', label: 'Salesforce Data Cloud' },
  { value: 'sfmc', label: 'Marketing Cloud' },
  { value: 'shopify', label: 'Shopify' },
];

function SegmentCard({
  segment,
  onDeleted,
  onUpdated,
}: {
  segment: AudienceSegment;
  onDeleted: () => void;
  onUpdated: (s: AudienceSegment) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [computing, setComputing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportDest, setExportDest] = useState<ExportDestination>('salesforce');
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function authHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tf_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function handleCompute() {
    setComputing(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/audiences/${segment.id}/compute`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() } },
      );
      if (!res.ok) throw new Error(await res.text());
      const { customerCount } = await res.json();
      onUpdated({ ...segment, customerCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compute failed');
    } finally {
      setComputing(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    setExportResult(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/audiences/${segment.id}/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ destination: exportDest }),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setExportResult(`Export queued — ${data.estimatedRecords} records → ${exportDest}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete audience "${segment.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/audiences/${segment.id}`,
        { method: 'DELETE', headers: authHeaders() },
      );
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  }

  const rulesSummary = (segment.rules ?? []).map((r) => {
    const f = FIELD_OPTIONS.find((x) => x.value === r.field);
    const op = [...NUMBER_OPERATORS, ...EQ_OPERATORS].find((x) => x.value === r.operator);
    return `${f?.label ?? r.field} ${op?.label ?? r.operator} ${r.value}`;
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-violet-50 p-2">
            <Users className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{segment.name}</h3>
            {segment.description && <p className="text-xs text-slate-400 mt-0.5">{segment.description}</p>}
            <div className="mt-1 flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">
                {segment.customerCount?.toLocaleString() ?? (segment._count?.members ?? 0).toLocaleString()} members
              </span>
              <span className="text-xs text-slate-400">
                {new Date(segment.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCompute}
            disabled={computing}
            title="Recompute membership"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            {computing ? 'Computing…' : 'Compute'}
          </button>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/audiences/${segment.id}/csv`}
            download={`audience-${segment.id}.csv`}
            title="Download CSV"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 disabled:opacity-50 transition-colors"
            title="Delete segment"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {/* Rules summary */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Filter Rules</p>
            {rulesSummary.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No rules — matches all customers</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rulesSummary.map((r, i) => (
                  <span key={i} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Export to Destination</p>
            <div className="flex items-center gap-2">
              <select
                value={exportDest}
                onChange={(e) => setExportDest(e.target.value as ExportDestination)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {EXPORT_DESTINATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                {exporting ? 'Queuing…' : 'Export'}
              </button>
            </div>
            {exportResult && (
              <p className="mt-2 text-xs text-emerald-600 font-medium">{exportResult}</p>
            )}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────

export function AudiencesClient() {
  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tf_token') : null;
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/audiences`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setSegments(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load audiences'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {showCreate && (
        <CreateSegmentModal
          onClose={() => setShowCreate(false)}
          onCreated={(s) => setSegments((prev) => [s, ...prev])}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audience Segments</h1>
            <p className="text-sm text-slate-500 mt-1">
              Build rule-based customer segments and sync them to your marketing stack
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Segment
          </button>
        </div>

        {/* Info banner */}
        <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-700">
          <strong>How it works:</strong> Define filter rules → click <strong>Compute</strong> to match customers →
          export to Salesforce, Data Cloud, SFMC, or Shopify.
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Segment list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-slate-200 bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16">
            <Users className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No audience segments yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md text-center">
              Create your first segment to start targeting creator-acquired customers with precision.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Create Segment
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {segments.map((seg) => (
              <SegmentCard
                key={seg.id}
                segment={seg}
                onDeleted={() => setSegments((prev) => prev.filter((s) => s.id !== seg.id))}
                onUpdated={(updated) => setSegments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
