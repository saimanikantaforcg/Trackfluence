'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wallet, CheckCircle2, DollarSign, Plus, X, Check, Download, Calculator, CheckSquare } from 'lucide-react';
import { api, type Payout, type PayoutListResponse, type CommissionEstimate } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import Pagination from '@/components/ui/pagination';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700' },
  APPROVED: { label: 'Approved', color: 'text-blue-400 bg-blue-900/30 border-blue-700' },
  PAID: { label: 'Paid', color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700' },
  CANCELLED: { label: 'Cancelled', color: 'text-zinc-500 bg-zinc-800 border-zinc-600' },
};

function CreatePayoutModal({ token, onSave, onClose }: { token: string; onSave: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const addToast = ({ type, message }: { type: string; message: string }) => toast(message, type as 'success' | 'error');
  const [form, setForm] = useState({ creatorId: '', amount: '', periodStart: '', periodEnd: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createPayout(token, {
        creatorId: form.creatorId,
        amount: form.amount,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        notes: form.notes || undefined,
      });
      addToast({ type: 'success', message: 'Payout created' });
      onSave();
    } catch {
      addToast({ type: 'error', message: 'Failed to create payout' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-700">
          <h2 className="text-white font-semibold">New Payout</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Creator ID *</label>
            <input required value={form.creatorId} onChange={e => set('creatorId', e.target.value)}
              placeholder="cuid..."
              className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Amount (USD) *</label>
            <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Period start *</label>
              <input required type="date" value={form.periodStart} onChange={e => set('periodStart', e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Period end *</label>
              <input required type="date" value={form.periodEnd} onChange={e => set('periodEnd', e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-600 hover:border-zinc-500 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm text-white font-medium transition flex items-center gap-2">
              {saving ? 'Creating…' : <><Check className="h-4 w-4" /> Create</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PayoutsClient({ initial }: { initial: PayoutListResponse | null }) {
  const { toast } = useToast();
  const addToast = ({ type, message }: { type: string; message: string }) => toast(message, type as 'success' | 'error');
  const [data, setData] = useState<PayoutListResponse | null>(initial);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [token, setToken] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  // Commission calculator
  const [showCalc, setShowCalc] = useState(false);
  const [calcForm, setCalcForm] = useState({ creatorId: '', periodStart: '', periodEnd: '' });
  const [calcResult, setCalcResult] = useState<CommissionEstimate | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('tf_token') ?? '';
    setToken(t);
    try {
      if (t) {
        const payload = JSON.parse(atob(t.split('.')[1]));
        setIsAdmin(payload?.role === 'ADMIN');
      }
    } catch { /* ignore */ }
  }, []);

  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectAllPending = () => {
    const pendingIds = (data?.items ?? []).filter((p) => p.status === 'PENDING').map((p) => p.id);
    setSelected(new Set(pendingIds));
  };

  const doBulkApprove = async () => {
    if (selected.size === 0) return;
    setBulkApproving(true);
    try {
      const result = await api.bulkApprovePayout(token, [...selected]);
      toast(`Approved ${result.approved} payout${result.approved !== 1 ? 's' : ''}`, 'success');
      setSelected(new Set());
      load(page);
    } catch {
      toast('Bulk approve failed', 'error');
    } finally {
      setBulkApproving(false);
    }
  };

  const load = useCallback(async (p: number, status?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getPayouts(token, { status: (status ?? statusFilter) || undefined, page: p });
      setData(res);
      setPage(p);
    } catch {
      addToast({ type: 'error', message: 'Failed to load payouts' });
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, addToast]);

  useEffect(() => {
    if (token) load(1);
  }, [token, load]);

  const handleStatusFilter = (s: string) => {
    setStatusFilter(s);
    load(1, s);
  };

  const doAction = async (action: 'approve' | 'pay' | 'cancel', id: string) => {
    setActionId(id);
    try {
      if (action === 'approve') await api.approvePayout(token, id);
      else if (action === 'pay') await api.markPayoutPaid(token, id);
      else await api.cancelPayout(token, id);
      addToast({ type: 'success', message: `Payout ${action === 'pay' ? 'marked as paid' : action + 'd'}` });
      load(page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      addToast({ type: 'error', message: msg });
    } finally {
      setActionId(null);
    }
  };

  const fmtMoney = (amount: string, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount));

  const doCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalcLoading(true);
    setCalcResult(null);
    try {
      const res = await api.calculateCommission(calcForm.creatorId, calcForm.periodStart, calcForm.periodEnd);
      setCalcResult(res);
    } catch {
      addToast({ type: 'error', message: 'Failed to calculate commission — check creator ID and date range' });
    } finally {
      setCalcLoading(false);
    }
  };

  const items = data?.items ?? [];

  // Aggregate stats
  const pending = items.filter(p => p.status === 'PENDING').reduce((s, p) => s + Number(p.amount), 0);
  const approved = items.filter(p => p.status === 'APPROVED').reduce((s, p) => s + Number(p.amount), 0);
  const paid = items.filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payouts</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Creator commission tracking and payment management</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/payouts/export/csv${statusFilter ? `?status=${statusFilter}` : ''}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-300 font-medium transition"
              download
            >
              <Download className="h-4 w-4" /> Export CSV
            </a>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium transition"
            >
              <Plus className="h-4 w-4" /> New Payout
            </button>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pending, color: 'text-yellow-400', icon: Wallet },
          { label: 'Approved', value: approved, color: 'text-blue-400', icon: CheckCircle2 },
          { label: 'Paid out', value: paid, color: 'text-emerald-400', icon: DollarSign },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center gap-3">
            <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />
            <div>
              <p className="text-zinc-500 text-xs">{label}</p>
              <p className={`text-lg font-bold ${color}`}>${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {['', 'PENDING', 'APPROVED', 'PAID', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${statusFilter === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>        {isAdmin && selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">{selected.size} selected</span>
            <button
              onClick={doBulkApprove}
              disabled={bulkApproving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-700 border border-blue-600 text-white hover:bg-blue-600 disabled:opacity-60 transition"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {bulkApproving ? 'Approving…' : 'Approve selected'}
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-zinc-500 hover:text-zinc-300 transition">Clear</button>
          </div>
        )}
        {isAdmin && (data?.items ?? []).some((p) => p.status === 'PENDING') && selected.size === 0 && (
          <button
            onClick={selectAllPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition"
          >
            <CheckSquare className="h-3.5 w-3.5" /> Select all pending
          </button>
        )}        <button
          onClick={() => { setShowCalc((v) => !v); setCalcResult(null); }}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${showCalc ? 'bg-indigo-700 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'}`}
        >
          <Calculator className="h-3.5 w-3.5" /> Commission Calculator
        </button>
      </div>

      {/* Commission calculator panel */}
      {showCalc && (
        <div className="rounded-xl border border-indigo-700/40 bg-indigo-950/30 p-5 space-y-4">
          <p className="text-sm font-semibold text-indigo-300">Commission Estimator</p>
          <form onSubmit={doCalculate} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Creator ID</label>
              <input
                required
                value={calcForm.creatorId}
                onChange={(e) => setCalcForm((f) => ({ ...f, creatorId: e.target.value }))}
                placeholder="cuid..."
                className="rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Period Start</label>
              <input
                required
                type="date"
                value={calcForm.periodStart}
                onChange={(e) => setCalcForm((f) => ({ ...f, periodStart: e.target.value }))}
                className="rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Period End</label>
              <input
                required
                type="date"
                value={calcForm.periodEnd}
                onChange={(e) => setCalcForm((f) => ({ ...f, periodEnd: e.target.value }))}
                className="rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={calcLoading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm text-white font-medium transition"
            >
              {calcLoading ? 'Calculating…' : 'Calculate'}
            </button>
          </form>
          {calcResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {[
                { label: 'Creator', value: calcResult.creatorName },
                { label: 'Total Revenue', value: `$${calcResult.totalRevenue.toLocaleString()}` },
                { label: 'Commission Rate', value: `${(calcResult.commissionRate * 100).toFixed(1)}%` },
                { label: 'Est. Commission', value: `$${calcResult.estimatedCommission.toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-zinc-800/60 border border-zinc-700 p-3">
                  <p className="text-xs text-zinc-500 mb-1">{label}</p>
                  <p className="text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {!token ? (
        <p className="text-zinc-500 text-sm">Sign in to view payouts.</p>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Wallet className="h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 font-medium">No payouts found</p>
          <p className="text-zinc-600 text-sm mt-1">Create a payout to start tracking creator commissions</p>
        </div>
      ) : (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                {isAdmin && <th className="px-4 py-3 w-8" />}
                <th className="px-5 py-3 font-medium">Creator</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Period</th>
                <th className="px-5 py-3 font-medium">Campaign</th>
                {isAdmin && <th className="px-5 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const statusCfg = STATUS_CONFIG[p.status];
                const busy = actionId === p.id;
                return (
                  <tr key={p.id} className="border-b border-zinc-700 last:border-0 hover:bg-zinc-700/30 transition">
                    {isAdmin && (
                      <td className="px-4 py-4">
                        {p.status === 'PENDING' && (
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500 cursor-pointer"
                          />
                        )}
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <p className="text-white font-medium">{p.creator.name}</p>
                      {p.creator.handle && <p className="text-zinc-500 text-xs">@{p.creator.handle}</p>}
                    </td>
                    <td className="px-5 py-4 text-white font-semibold">
                      {fmtMoney(p.amount, p.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-zinc-400 text-xs">
                      {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-zinc-500 text-xs">
                      {p.campaign?.name ?? '—'}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {p.status === 'PENDING' && (
                            <button
                              disabled={busy}
                              onClick={() => doAction('approve', p.id)}
                              className="px-2.5 py-1 rounded-lg text-xs bg-blue-900/40 border border-blue-700 text-blue-400 hover:bg-blue-800/50 disabled:opacity-50 transition"
                            >
                              Approve
                            </button>
                          )}
                          {p.status === 'APPROVED' && (
                            <button
                              disabled={busy}
                              onClick={() => doAction('pay', p.id)}
                              className="px-2.5 py-1 rounded-lg text-xs bg-emerald-900/40 border border-emerald-700 text-emerald-400 hover:bg-emerald-800/50 disabled:opacity-50 transition"
                            >
                              Mark Paid
                            </button>
                          )}
                          {(p.status === 'PENDING' || p.status === 'APPROVED') && (
                            <button
                              disabled={busy}
                              onClick={() => doAction('cancel', p.id)}
                              className="px-2.5 py-1 rounded-lg text-xs bg-zinc-700 border border-zinc-600 text-zinc-400 hover:text-red-400 disabled:opacity-50 transition"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <Pagination page={page} totalPages={data.totalPages} onPageChange={(p: number) => load(p)} />
      )}

      {showCreate && (
        <CreatePayoutModal
          token={token}
          onSave={() => { setShowCreate(false); load(page); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
