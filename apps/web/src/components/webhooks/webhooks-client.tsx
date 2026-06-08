'use client';

import { useState, useEffect, useCallback } from 'react';
import { Webhook, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, X, Check, Copy, RefreshCw } from 'lucide-react';
import { api, type WebhookRecord, type WebhookDelivery } from '@/lib/api';
import { useToast } from '@/lib/toast-context';

const FALLBACK_EVENTS = [
  'payout.approved', 'payout.paid', 'payout.cancelled',
  'campaign.created', 'campaign.updated',
  'creator.created', 'creator.invited',
  'attribution.created',
];

const ALL_EVENTS = FALLBACK_EVENTS;

function CreateWebhookModal({ token, catalogEvents, onSave, onClose }: { token: string; catalogEvents: string[]; onSave: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const addToast = ({ type, message }: { type: string; message: string }) => toast(message, type as 'success' | 'error');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [secret, setSecret] = useState('');

  const events = catalogEvents.length > 0 ? catalogEvents : ALL_EVENTS;
  const toggleEvent = (e: string) =>
    setSelectedEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const res = await api.createWebhook(token, { url, description: description || undefined, events: selectedEvents });
      setSecret(res.secret);
      onSave();
    } catch {
      addToast({ type: 'error', message: 'Failed to create webhook' });
      setSaving(false);
    }
  };

  if (secret) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-900/40 flex items-center justify-center">
              <Check className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-white font-semibold">Webhook Created</h2>
          </div>
          <p className="text-zinc-400 text-sm">Save this secret now — it will never be shown again.</p>
          <div className="bg-zinc-800 rounded-lg p-3 font-mono text-xs text-yellow-300 break-all flex items-start gap-2">
            <span className="flex-1">{secret}</span>
            <button onClick={() => navigator.clipboard.writeText(secret)} className="text-zinc-500 hover:text-white flex-shrink-0 mt-0.5">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <button onClick={onClose} className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium transition">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-700">
          <h2 className="text-white font-semibold">Register Webhook</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Endpoint URL *</label>
            <input required type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourapp.com/webhooks/trackfluence"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-2">Events (leave empty for all)</label>
            <div className="grid grid-cols-2 gap-2">
              {events.map((e) => (
                <label key={e} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(e)}
                    onChange={() => toggleEvent(e)}
                    className="accent-indigo-500 h-3.5 w-3.5"
                  />
                  {e}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 border border-zinc-600 hover:text-white transition">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm text-white font-medium transition">
              {saving ? 'Creating…' : 'Create Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeliveryRow({ d, token, onRetry }: { d: WebhookDelivery; token: string; onRetry: () => void }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const retry = async (ev: React.MouseEvent) => {
    ev.stopPropagation();
    setRetrying(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/webhooks/deliveries/${d.id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast('Delivery retried', 'success');
      onRetry();
    } catch {
      toast('Retry failed', 'error');
    } finally {
      setRetrying(false);
    }
  };
  return (
    <div className={`border-b border-zinc-700 last:border-0 ${d.success ? '' : 'bg-red-950/10'}`}>
      <button onClick={() => setExpanded((x) => !x)}
        className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-zinc-700/30 transition">
        <span className={`text-xs font-medium px-2 py-0.5 rounded border flex-shrink-0 ${d.success ? 'text-emerald-400 border-emerald-700' : 'text-red-400 border-red-700'}`}>
          {d.success ? 'OK' : 'FAIL'}
        </span>
        <span className="font-mono text-xs text-indigo-300 flex-shrink-0">{d.event}</span>
        <span className="text-zinc-500 text-xs">{new Date(d.attemptedAt).toLocaleString()}</span>
        <span className="ml-auto flex items-center gap-2">
          {!d.success && (
            <button
              onClick={retry}
              disabled={retrying}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 border border-amber-700 rounded px-2 py-0.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} /> Retry
            </button>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>
      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          <p className="text-xs text-zinc-400">Status: <span className="text-white">{d.responseStatus ?? '—'}</span></p>
          {d.responseBody && <pre className="text-xs bg-zinc-900 rounded p-2 text-zinc-300 overflow-x-auto max-h-24">{d.responseBody}</pre>}
        </div>
      )}
    </div>
  );
}

export default function WebhooksClient() {
  const { toast } = useToast();
  const addToast = ({ type, message }: { type: string; message: string }) => toast(message, type as 'success' | 'error');
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});
  const [openDeliveries, setOpenDeliveries] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [catalogEvents, setCatalogEvents] = useState<string[]>([]);

  useEffect(() => { setToken(localStorage.getItem('tf_token') ?? ''); }, []);

  // Fetch the event catalog once on mount (public endpoint)
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    fetch(`${base}/api/v1/webhooks/catalog`)
      .then((r) => r.json() as Promise<{ event: string }[]>)
      .then((items) => setCatalogEvents(items.map((i) => i.event)))
      .catch(() => {}); // silently fall back to FALLBACK_EVENTS
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setWebhooks(await api.listWebhooks(token));
    } catch {
      addToast({ type: 'error', message: 'Failed to load webhooks' });
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (token) load(); }, [token, load]);

  const handleToggle = async (id: string) => {
    try {
      await api.toggleWebhook(token, id);
      load();
    } catch {
      addToast({ type: 'error', message: 'Failed to toggle webhook' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await api.deleteWebhook(token, id);
      addToast({ type: 'success', message: 'Webhook deleted' });
      load();
    } catch {
      addToast({ type: 'error', message: 'Failed to delete webhook' });
    }
  };

  const loadDeliveries = async (id: string) => {
    if (openDeliveries === id) { setOpenDeliveries(null); return; }
    try {
      const d = await api.listWebhookDeliveries(token, id);
      setDeliveries((prev) => ({ ...prev, [id]: d }));
      setOpenDeliveries(id);
    } catch {
      addToast({ type: 'error', message: 'Failed to load deliveries' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Webhooks</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Receive real-time events via HTTP POST</p>
        </div>
        {token && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium transition">
            <Plus className="h-4 w-4" /> Register Webhook
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-zinc-800 rounded-xl animate-pulse" />)}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Webhook className="h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 font-medium">No webhooks registered</p>
          <p className="text-zinc-600 text-sm mt-1">Register an endpoint to receive event notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <div className="flex items-start gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${wh.status === 'ACTIVE' ? 'text-emerald-400 border-emerald-700' : 'text-zinc-500 border-zinc-600'}`}>
                      {wh.status}
                    </span>
                    {wh.description && <span className="text-zinc-500 text-xs">{wh.description}</span>}
                  </div>
                  <p className="font-mono text-sm text-white truncate">{wh.url}</p>
                  <p className="text-zinc-600 text-xs mt-1">
                    {wh.events.length === 0 ? 'All events' : wh.events.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => loadDeliveries(wh.id)}
                    className="text-xs text-zinc-400 hover:text-white border border-zinc-600 rounded-lg px-3 py-1.5 transition">
                    {openDeliveries === wh.id ? 'Hide' : 'Deliveries'}
                  </button>
                  <button onClick={() => handleToggle(wh.id)} className="text-zinc-400 hover:text-white transition">
                    {wh.status === 'ACTIVE'
                      ? <ToggleRight className="h-5 w-5 text-emerald-400" />
                      : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button onClick={() => handleDelete(wh.id)} className="text-zinc-500 hover:text-red-400 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {openDeliveries === wh.id && (
                <div className="border-t border-zinc-700">
                  {(deliveries[wh.id] ?? []).length === 0 ? (
                    <p className="text-zinc-500 text-sm px-5 py-3">No deliveries yet</p>
                  ) : (
                    (deliveries[wh.id] ?? []).map((d) => <DeliveryRow key={d.id} d={d} token={token} onRetry={() => loadDeliveries(wh.id)} />)
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateWebhookModal
          token={token}
          catalogEvents={catalogEvents}
          onSave={() => load()}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
