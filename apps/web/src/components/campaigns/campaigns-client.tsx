'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Megaphone, Pencil, Trash2, X, Check, TrendingUp, ExternalLink, Link2 } from 'lucide-react';
import { api, type Campaign, type CampaignListResponse } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import Pagination from '@/components/ui/pagination';
import { UtmBuilder } from '@/components/campaigns/utm-builder';

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-900/30 border-emerald-700',
  paused: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
  completed: 'text-zinc-400 bg-zinc-800 border-zinc-600',
};

function CampaignModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Campaign;
  onSave: (data: Partial<Campaign>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    startDate: initial?.startDate ? initial.startDate.slice(0, 10) : '',
    endDate: initial?.endDate ? initial.endDate.slice(0, 10) : '',
    budget: initial?.budget ?? '',
    currency: initial?.currency ?? 'USD',
    status: initial?.status ?? 'active',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: form.name,
        description: form.description || undefined,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        budget: form.budget || undefined,
        currency: form.currency,
        status: form.status,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-700">
          <h2 className="text-white font-semibold text-base">{initial ? 'Edit Campaign' : 'New Campaign'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Campaign name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Start date *</label>
              <input required type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">End date</label>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Budget</label>
              <input type="number" min="0" step="0.01" value={form.budget} onChange={e => set('budget', e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option><option>AUD</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-600 hover:border-zinc-500 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm text-white font-medium transition flex items-center gap-2">
              {saving ? 'Saving…' : <><Check className="h-4 w-4" /> {initial ? 'Update' : 'Create'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CampaignsClient({ initial }: { initial: CampaignListResponse | null }) {
  const { toast } = useToast();
  const addToast = ({ type, message }: { type: string; message: string }) => toast(message, type as 'success' | 'error');
  const [data, setData] = useState<CampaignListResponse | null>(initial);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; campaign?: Campaign }>({ open: false });
  const [utmCampaign, setUtmCampaign] = useState<string | null>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    setToken(localStorage.getItem('tf_token') ?? '');
  }, []);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.listCampaigns(p);
      setData(res);
      setPage(p);
    } catch {
      addToast({ type: 'error', message: 'Failed to load campaigns' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const handleSave = async (formData: Partial<Campaign>) => {
    try {
      if (modal.campaign) {
        await api.updateCampaign(token, modal.campaign.id, formData);
        addToast({ type: 'success', message: 'Campaign updated' });
      } else {
        await api.createCampaign(token, formData);
        addToast({ type: 'success', message: 'Campaign created' });
      }
      setModal({ open: false });
      load(page);
    } catch {
      addToast({ type: 'error', message: 'Failed to save campaign' });
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!confirm(`Delete campaign "${campaign.name}"?`)) return;
    try {
      await api.deleteCampaign(token, campaign.id);
      addToast({ type: 'success', message: 'Campaign deleted' });
      load(page);
    } catch {
      addToast({ type: 'error', message: 'Failed to delete campaign' });
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Manage creator campaigns and budgets</p>
        </div>
        {token && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUtmCampaign('')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-300 font-medium transition"
            >
              <Link2 className="h-4 w-4" /> UTM Builder
            </button>
            <button
              onClick={() => setModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium transition"
            >
              <Plus className="h-4 w-4" /> New Campaign
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <Megaphone className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="text-zinc-300 font-medium">No campaigns yet</p>
          <p className="text-zinc-500 text-sm mt-1 max-w-xs">Create your first campaign to group creators, set budgets, and track ROI</p>
          {token && (
            <button
              onClick={() => setModal({ open: true })}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-4 w-4" /> Create your first campaign
            </button>
          )}
        </div>
      ) : (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Budget</th>
                <th className="px-5 py-3 font-medium">Creators</th>
                <th className="px-5 py-3 font-medium">Start Date</th>
                {token && <th className="px-5 py-3 font-medium w-20"></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-zinc-700 last:border-0 hover:bg-zinc-700/30 transition">
                  <td className="px-5 py-4">
                    <Link href={`/campaigns/${c.id}`} className="hover:text-indigo-300 transition">
                      <p className="text-white font-medium">{c.name}</p>
                    </Link>
                    {c.description && <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{c.description}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded border capitalize ${STATUS_COLORS[c.status] ?? STATUS_COLORS['active']}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-zinc-300">
                    {c.budget
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: c.currency }).format(Number(c.budget))
                      : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <TrendingUp className="h-3.5 w-3.5" />{c.creatorIds.length}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-zinc-500">
                    {new Date(c.startDate).toLocaleDateString()}
                    {c.endDate && <span className="text-zinc-600"> → {new Date(c.endDate).toLocaleDateString()}</span>}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-400 transition"
                      title="View campaign details"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                  {token && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setUtmCampaign(c.name)}
                          title="Open UTM builder for this campaign"
                          className="text-zinc-500 hover:text-indigo-400 transition"
                        >
                          <Link2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setModal({ open: true, campaign: c })}
                          className="text-zinc-500 hover:text-white transition"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="text-zinc-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <Pagination page={page} totalPages={data.totalPages} onPageChange={load} />
      )}

      {modal.open && (
        <CampaignModal
          initial={modal.campaign}
          onSave={handleSave}
          onClose={() => setModal({ open: false })}
        />
      )}

      {utmCampaign !== null && (
        <UtmBuilder
          campaignName={utmCampaign}
          onClose={() => setUtmCampaign(null)}
        />
      )}
    </div>
  );
}
