'use client';

import { useState, useTransition } from 'react';
import { Target, Plus, X, Users, Zap, ChevronDown, Trash2, Play, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { exportCsv } from '@/lib/export-csv';

// ─── Rule builder types ──────────────────────────────────────

const RULE_FIELDS = [
  { value: 'creatorAcquired', label: 'Creator Acquired', type: 'boolean' },
  { value: 'totalRevenue', label: 'Total Revenue ($)', type: 'number' },
  { value: 'orderCount', label: 'Order Count', type: 'number' },
  { value: 'ltv', label: 'Lifetime Value ($)', type: 'number' },
];

const OPERATORS_FOR: Record<string, { value: string; label: string }[]> = {
  boolean: [
    { value: 'eq', label: 'is' },
  ],
  number: [
    { value: 'gt', label: '>' },
    { value: 'gte', label: '>=' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '<=' },
    { value: 'eq', label: '=' },
  ],
};

interface Rule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface AudienceFormData {
  name: string;
  description: string;
  rules: Rule[];
}

// ─── Create Audience Modal ────────────────────────────────────

function CreateAudienceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AudienceFormData>({
    name: '',
    description: '',
    rules: [{ id: crypto.randomUUID(), field: 'creatorAcquired', operator: 'eq', value: 'true' }],
  });

  function addRule() {
    setForm((f) => ({
      ...f,
      rules: [...f.rules, { id: crypto.randomUUID(), field: 'totalRevenue', operator: 'gt', value: '0' }],
    }));
  }

  function removeRule(id: string) {
    setForm((f) => ({ ...f, rules: f.rules.filter((r) => r.id !== id) }));
  }

  function updateRule(id: string, key: keyof Rule, value: string) {
    setForm((f) => ({
      ...f,
      rules: f.rules.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [key]: value };
        // Reset operator when field changes
        if (key === 'field') {
          const fieldDef = RULE_FIELDS.find((fd) => fd.value === value);
          const ops = OPERATORS_FOR[fieldDef?.type ?? 'number'];
          updated.operator = ops[0].value;
          updated.value = fieldDef?.type === 'boolean' ? 'true' : '0';
        }
        return updated;
      }),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.rules.length === 0) { setError('Add at least one rule'); return; }
    setError(null);
    startTransition(async () => {
      try {
        await api.createAudience({
          name: form.name,
          description: form.description || undefined,
          rules: form.rules.map((r) => {
            const fieldDef = RULE_FIELDS.find((f) => f.value === r.field);
            const parsed = fieldDef?.type === 'boolean'
              ? r.value === 'true'
              : Number(r.value);
            return { field: r.field as import('@/lib/api').AudienceRuleField, operator: r.operator as import('@/lib/api').AudienceRuleOperator, value: parsed };
          }),
        });
        onCreated();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create audience');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Create Audience Segment</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* Name + description */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Segment Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="High-LTV Creator Customers"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Rules */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Rules (ALL must match)</label>
                <button
                  type="button"
                  onClick={addRule}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add rule
                </button>
              </div>

              <div className="space-y-2">
                {form.rules.map((rule) => {
                  const fieldDef = RULE_FIELDS.find((f) => f.value === rule.field);
                  const operators = OPERATORS_FOR[fieldDef?.type ?? 'number'];
                  return (
                    <div key={rule.id} className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      {/* Field */}
                      <div className="relative flex-1">
                        <select
                          value={rule.field}
                          onChange={(e) => updateRule(rule.id, 'field', e.target.value)}
                          className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm pr-7 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {RULE_FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      </div>

                      {/* Operator */}
                      <div className="relative w-20">
                        <select
                          value={rule.operator}
                          onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                          className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-center pr-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {operators.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      </div>

                      {/* Value */}
                      {fieldDef?.type === 'boolean' ? (
                        <div className="relative w-24">
                          <select
                            value={rule.value}
                            onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                            className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm pr-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={rule.value}
                          onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                          className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeRule(rule.id)}
                        disabled={form.rules.length === 1}
                        className="rounded p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creating…' : 'Create Audience'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Audience card ───────────────────────────────────────────

interface AudienceRecord {
  id: string;
  name: string;
  description?: string;
  customerCount: number;
  rules: { field: string; operator: string; value: unknown }[];
  createdAt: string;
}

function AudienceCard({ audience, onCompute }: { audience: AudienceRecord; onCompute: (id: string) => void }) {
  const [isComputing, startComputing] = useTransition();
  const [isExporting, startExporting] = useTransition();
  const [computed, setComputed] = useState<string | null>(null);

  function handleCompute() {
    startComputing(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/audiences/${audience.id}/compute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('tf_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComputed(`Computed: ${data.customerCount ?? '?'} customers`);
        setTimeout(() => setComputed(null), 4000);
      }
      onCompute(audience.id);
    });
  }

  function handleExportCsv() {
    // Export audience rules as CSV summary (customers would require a separate endpoint)
    exportCsv(
      audience.rules.map((r) => ({ field: r.field, operator: r.operator, value: String(r.value) })),
      `audience-${audience.name.replace(/\s+/g, '-').toLowerCase()}-rules`
    );
  }

  function handleExport(destination: string) {
    startExporting(async () => {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/audiences/${audience.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('tf_token')}`,
        },
        body: JSON.stringify({ destination }),
      });
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            <Target className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{audience.name}</h3>
            {audience.description && (
              <p className="text-xs text-slate-400 mt-0.5">{audience.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          <Users className="h-3.5 w-3.5" />
          {audience.customerCount.toLocaleString()}
        </div>
      </div>

      {/* Rules preview */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {audience.rules.map((rule, i) => (
          <span key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 font-mono">
            {rule.field} {rule.operator} {String(rule.value)}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 space-y-2 border-t border-slate-50 pt-4">
        {computed && (
          <p className="text-xs text-emerald-600 font-medium">{computed}</p>
        )}
        <div className="flex items-center gap-2">
        <button
          onClick={handleCompute}
          disabled={isComputing}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
        >
          <Play className="h-3.5 w-3.5" />
          {isComputing ? 'Computing…' : 'Compute'}
        </button>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>

        <div className="relative group ml-auto">
          <button
            disabled={isExporting || audience.customerCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            Activate
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 w-48 hidden group-hover:block rounded-lg border border-slate-200 bg-white shadow-lg z-10 py-1">
            {['salesforce', 'salesforce_data_cloud', 'sfmc', 'shopify'].map((dest) => (
              <button
                key={dest}
                onClick={() => handleExport(dest)}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {dest.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────

interface AudiencesClientProps {
  initialAudiences: AudienceRecord[];
}

export function AudiencesClient({ initialAudiences }: AudiencesClientProps) {
  const [showModal, setShowModal] = useState(false);
  const [audiences, setAudiences] = useState<AudienceRecord[]>(initialAudiences);

  async function refresh() {
    try {
      const data = await api.listAudiences() as AudienceRecord[];
      setAudiences(Array.isArray(data) ? data : []);
    } catch {}
  }

  function handleCompute(id: string) {
    refresh();
  }

  return (
    <>
      {showModal && (
        <CreateAudienceModal
          onClose={() => setShowModal(false)}
          onCreated={refresh}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audience Activation</h1>
            <p className="text-sm text-slate-500 mt-1">
              Build segments and activate them across Salesforce, Data Cloud, and SFMC
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Audience
          </button>
        </div>

        {audiences.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16">
            <Target className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No audiences yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md text-center">
              Create audience segments based on creator acquisition, LTV, and purchase behavior.
              Export them to your CRM, CDP, or marketing automation platform.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Create First Audience
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {audiences.map((aud) => (
              <AudienceCard key={aud.id} audience={aud} onCompute={handleCompute} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
