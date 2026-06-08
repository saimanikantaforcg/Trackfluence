'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Zap, CheckCircle2, Clock, AlertCircle, RefreshCw, Copy, Check, ExternalLink, ChevronDown, ChevronRight, Link2, Link2Off } from 'lucide-react';
import { useToast } from '@/lib/toast-context';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const WEBHOOK_ENDPOINT = `${API}/api/v1/connectors/shopify/webhook`;

type SyncStatus = { type: string; lastSync: string | null; status: string; recordsProcessed: number };
type SfStatus = { connected: boolean; instanceUrl?: string; scope?: string; expiresAt?: string };

const CONNECTOR_META: Record<string, { label: string; description: string; category: string; docsUrl?: string }> = {
  shopify: { label: 'Shopify', description: 'Real-time order ingestion via webhook + manual sync', category: 'Commerce', docsUrl: 'https://shopify.dev/docs/api/admin-rest' },
  salesforce: { label: 'Salesforce CRM', description: 'Push creator-acquired contacts and attribution data', category: 'CRM' },
  salesforce_data_cloud: { label: 'Salesforce Data Cloud', description: 'Activate audiences via Ingestion API', category: 'CDP' },
  sfmc: { label: 'Salesforce Marketing Cloud', description: 'Trigger journeys with creator-segmented audiences', category: 'Marketing' },
};

const COMING_SOON = [
  { label: 'HubSpot', category: 'CRM', description: 'Sync contacts and deals' },
  { label: 'Marketo', category: 'Marketing', description: 'Lead scoring + attribution' },
  { label: 'Braze', category: 'Marketing', description: 'Creator audience push' },
  { label: 'Klaviyo', category: 'Email', description: 'Segmented email flows' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED') return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Synced</span>;
  if (status === 'PROCESSING') return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing</span>;
  if (status === 'never') return <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400"><Clock className="h-3.5 w-3.5" /> Never synced</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><AlertCircle className="h-3.5 w-3.5" /> Error</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5 transition-colors">
      {copied ? <><Check className="h-3 w-3 text-emerald-600" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
    </button>
  );
}

export default function ConnectorsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400 text-sm">Loading…</div>}>
      <ConnectorsInner />
    </Suspense>
  );
}

function ConnectorsInner() {
  const [statuses, setStatuses] = useState<SyncStatus[]>([]);
  const [sfStatus, setSfStatus] = useState<SfStatus>({ connected: false });
  const [syncing, setSyncing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>('shopify');
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const loadSfStatus = (token: string | null) => {
    fetch(`${API}/api/v1/connectors/salesforce/status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d: SfStatus) => setSfStatus(d))
      .catch(() => {});
  };

  useEffect(() => {
    const token = localStorage.getItem('tf_token');
    fetch(`${API}/api/v1/revenue-intelligence/connectors/status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then(setStatuses)
      .catch(() => {});

    loadSfStatus(token);

    // Handle OAuth callback query params
    if (searchParams.get('sf_connected') === '1') {
      toast('Salesforce connected successfully!', 'success');
      loadSfStatus(token);
    } else if (searchParams.get('sf_error')) {
      toast(`Salesforce connection failed: ${searchParams.get('sf_error')}`, 'error');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatus = (type: string) => statuses.find((s) => s.type === type);

  async function triggerSync(type: string, body: object) {
    const token = localStorage.getItem('tf_token');
    setSyncing(type);
    try {
      const endpoint = type === 'shopify' ? '/api/v1/connectors/shopify/sync'
        : type === 'salesforce' ? '/api/v1/connectors/salesforce/sync'
        : '/api/v1/connectors/salesforce/data-cloud/push';
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast(`${CONNECTOR_META[type]?.label ?? type} sync triggered successfully`, 'success');
      } else {
        toast(`Sync failed: ${res.status}`, 'error');
      }
    } catch {
      toast('Sync request failed — is the API running?', 'error');
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">Connect your commerce, CRM, CDP, and marketing platforms</p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Integrations</p>
        {Object.entries(CONNECTOR_META).map(([type, meta]) => {
          const status = getStatus(type);
          const isOpen = expanded === type;
          return (
            <div key={type} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : type)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
                    <p className="text-xs text-slate-400">{meta.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {status && <StatusBadge status={status.status} />}
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">Active</span>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                  <p className="text-sm text-slate-500">{meta.description}</p>

                  {type === 'shopify' && (
                    <div className="space-y-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500 mb-1.5">Webhook Endpoint (orders/paid + orders/cancelled)</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs text-slate-700 break-all font-mono">{WEBHOOK_ENDPOINT}</code>
                          <CopyButton text={WEBHOOK_ENDPOINT} />
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500 mb-1">Add to your .env file</p>
                        <div className="space-y-1">
                          {['SHOPIFY_API_SECRET', 'SHOPIFY_STORE_DOMAIN'].map((v) => (
                            <code key={v} className="block text-xs text-slate-600">{v}=<span className="text-slate-400">your_value</span></code>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => triggerSync('shopify', { shopDomain: 'your-store.myshopify.com' })} disabled={syncing === 'shopify'}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center gap-2">
                          {syncing === 'shopify' ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing…</> : 'Trigger Manual Sync'}
                        </button>
                        {meta.docsUrl && (
                          <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
                            Docs <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {status?.lastSync && (
                        <p className="text-xs text-slate-400">Last sync: {new Date(status.lastSync).toLocaleString()} · {status.recordsProcessed} records</p>
                      )}
                    </div>
                  )}

                  {(type === 'salesforce' || type === 'salesforce_data_cloud') && (
                    <div className="space-y-3">
                      {/* Connection status banner */}
                      {sfStatus.connected ? (
                        <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-emerald-800 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" /> Connected to Salesforce
                            </p>
                            {sfStatus.instanceUrl && (
                              <p className="text-xs text-emerald-600 mt-0.5 font-mono">{sfStatus.instanceUrl}</p>
                            )}
                          </div>
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem('tf_token');
                              await fetch(`${API}/api/v1/connectors/salesforce/disconnect`, {
                                method: 'DELETE',
                                headers: token ? { Authorization: `Bearer ${token}` } : {},
                              });
                              setSfStatus({ connected: false });
                              toast('Salesforce disconnected', 'success');
                            }}
                            className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition"
                          >
                            <Link2Off className="h-3.5 w-3.5" /> Disconnect
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                          <p className="text-sm text-slate-500">Not connected — authorize via OAuth 2.0</p>
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem('tf_token');
                              const res = await fetch(`${API}/api/v1/connectors/salesforce/auth`, {
                                headers: token ? { Authorization: `Bearer ${token}` } : {},
                              });
                              if (res.ok) {
                                const data = (await res.json()) as { url: string };
                                window.location.href = data.url;
                              } else {
                                toast('Failed to start Salesforce OAuth', 'error');
                              }
                            }}
                            className="flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2 transition"
                          >
                            <Link2 className="h-4 w-4" /> Connect Salesforce
                          </button>
                        </div>
                      )}

                      {/* Sync button — only when connected */}
                      {sfStatus.connected && (
                        <button onClick={() => triggerSync(type, {})} disabled={syncing === type}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center gap-2">
                          {syncing === type ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing…</> : 'Push to Salesforce'}
                        </button>
                      )}

                      {/* Env vars reference */}
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500 mb-1">Required env vars</p>
                        <div className="space-y-1">
                          {['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET', 'SALESFORCE_REDIRECT_URI', 'SALESFORCE_LOGIN_URL'].map((v) => (
                            <code key={v} className="block text-xs text-slate-600">{v}=<span className="text-slate-400">your_value</span></code>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {type === 'sfmc' && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-500 mb-1">Add to your .env file</p>
                      <div className="space-y-1">
                        {['SFMC_CLIENT_ID', 'SFMC_CLIENT_SECRET', 'SFMC_SUBDOMAIN'].map((v) => (
                          <code key={v} className="block text-xs text-slate-600">{v}=<span className="text-slate-400">your_value</span></code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coming Soon</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {COMING_SOON.map((c) => (
            <div key={c.label} className="rounded-xl border border-dashed border-slate-200 bg-white p-4 opacity-60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{c.label}</p>
                  <p className="text-xs text-slate-400">{c.category}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Roadmap</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

