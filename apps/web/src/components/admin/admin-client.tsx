'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Users, BarChart3, Trash2, RefreshCw, ChevronDown, ScrollText, Key, Plus, X, Copy, Check } from 'lucide-react';
import { api, AdminUser, SystemStats, AuditLogEntry, ApiKeyRecord } from '@/lib/api';
import { useToast } from '@/lib/toast-context';

interface Props {
  initialUsers: AdminUser[] | null;
  initialStats: SystemStats | null;
}

type Tab = 'users' | 'audit' | 'api-keys';

const ALL_SCOPES = ['read:creators', 'write:creators', 'read:customers', 'read:attribution', 'read:revenue', 'write:campaigns', 'write:payouts'];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 rounded-md border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition"
    >
      {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
    </button>
  );
}

const STAT_ITEMS = (s: SystemStats) => [
  { label: 'Users', value: s.users },
  { label: 'Creators', value: s.creators },
  { label: 'Customers', value: s.customers },
  { label: 'Orders', value: s.orders },
  { label: 'Attributions', value: s.attributions },
];

export default function AdminClient({ initialUsers, initialStats }: Props) {
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>(initialUsers ?? []);
  const [stats, setStats] = useState<SystemStats | null>(initialStats);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(!initialUsers);
  const [auditLoading, setAuditLoading] = useState(false);
  const [keysLoading, setKeysLoading] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // New key generation state
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('tf_token') ?? '';
    setToken(t);
    if (!initialUsers && t) loadData(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([api.adminListUsers(t), api.adminGetStats(t)]);
      setUsers(u);
      setStats(s);
    } catch {
      toast('Failed to load admin data — check your role', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadAuditLog = useCallback(async (t: string) => {
    setAuditLoading(true);
    try {
      const logs = await api.adminGetAuditLog(t);
      setAuditLogs(logs);
    } catch {
      toast('Failed to load audit log', 'error');
    } finally {
      setAuditLoading(false);
    }
  }, [toast]);

  const loadApiKeys = useCallback(async (t: string) => {
    setKeysLoading(true);
    try {
      const keys = await api.listApiKeys(t);
      setApiKeys(keys);
    } catch {
      toast('Failed to load API keys', 'error');
    } finally {
      setKeysLoading(false);
    }
  }, [toast]);

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) return;
    setGeneratingKey(true);
    try {
      const res = await api.generateApiKey(token, newKeyName.trim(), newKeyScopes.length ? newKeyScopes : undefined);
      setGeneratedKey(res.key);
      setNewKeyName('');
      setNewKeyScopes([]);
      loadApiKeys(token);
    } catch {
      toast('Failed to generate API key', 'error');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await api.revokeApiKey(token, id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast('API key revoked', 'success');
    } catch {
      toast('Failed to revoke key', 'error');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'MEMBER') => {
    setUpdatingId(userId);
    try {
      const updated = await api.adminUpdateRole(token, userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: updated.role } : u));
      toast(`Role updated to ${newRole}`, 'success');
    } catch {
      toast('Failed to update role', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleFlushCache = async () => {
    setFlushing(true);
    try {
      await api.adminFlushCache(token);
      toast('Cache flushed successfully', 'success');
    } catch {
      toast('Cache flush failed', 'error');
    } finally {
      setFlushing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => loadData(token)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm text-white disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleFlushCache}
            disabled={flushing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm text-white disabled:opacity-50 transition"
          >
            <Trash2 className="h-4 w-4" />
            {flushing ? 'Flushing…' : 'Flush Cache'}
          </button>
        </div>
      </div>

      {/* System Stats */}
      {stats && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-white">System Stats</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {STAT_ITEMS(stats).map(({ label, value }) => (
              <div key={label} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
                <p className="text-sm text-zinc-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-700">
        {(['users', 'audit', 'api-keys'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === 'audit' && auditLogs.length === 0) loadAuditLog(token);
              if (t === 'api-keys' && apiKeys.length === 0) loadApiKeys(token);
            }}
            className={`px-4 py-2 text-sm font-medium capitalize transition border-b-2 -mb-px ${
              tab === t ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            {t === 'users' ? <><Users className="inline h-4 w-4 mr-1.5" />Users</> : t === 'audit' ? <><ScrollText className="inline h-4 w-4 mr-1.5" />Audit Log</> : <><Key className="inline h-4 w-4 mr-1.5" />API Keys</>}
          </button>
        ))}
      </div>

      {/* Users Table */}
      {tab === 'users' && (
        <div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-zinc-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-zinc-500 text-sm">No users found or insufficient permissions.</p>
          ) : (
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-zinc-400">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.id}
                      className={`border-b border-zinc-700 last:border-0 hover:bg-zinc-750 transition ${i % 2 === 0 ? '' : 'bg-zinc-800/50'}`}
                    >
                      <td className="px-5 py-3 text-white font-medium">{u.name}</td>
                      <td className="px-5 py-3 text-zinc-400">{u.email}</td>
                      <td className="px-5 py-3 text-zinc-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="relative inline-block">
                          <select
                            value={u.role}
                            disabled={updatingId === u.id}
                            onChange={e => handleRoleChange(u.id, e.target.value as 'ADMIN' | 'MEMBER')}
                            className="appearance-none bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1.5 pr-8 text-sm text-white cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400 pointer-events-none" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Tab */}
      {tab === 'audit' && (
        <div>
          {auditLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-zinc-500 text-sm py-8 text-center">No audit log entries yet.</p>
          ) : (
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-zinc-400">
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                    <th className="px-5 py-3 font-medium">Entity</th>
                    <th className="px-5 py-3 font-medium">Actor ID</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-zinc-700 last:border-0 hover:bg-zinc-700/30 transition">
                      <td className="px-5 py-3 text-zinc-500 text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs bg-zinc-700 rounded px-2 py-0.5 text-indigo-300">{log.action}</span>
                      </td>
                      <td className="px-5 py-3 text-zinc-400 text-xs">
                        {log.entityType ? `${log.entityType} · ${log.entityId ?? ''}` : '—'}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-500 truncate max-w-[140px]">{log.userId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* API Keys Tab */}
      {tab === 'api-keys' && (
        <div className="space-y-4">
          {/* Generate new key button */}
          {!showNewKey && !generatedKey && (
            <button
              onClick={() => setShowNewKey(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium transition"
            >
              <Plus className="h-4 w-4" /> Generate New Key
            </button>
          )}

          {/* Generated key reveal */}
          {generatedKey && (
            <div className="rounded-xl border border-emerald-600/30 bg-emerald-900/20 p-4 space-y-2">
              <p className="text-emerald-400 text-sm font-semibold">Key generated — save it now, it won&apos;t be shown again!</p>
              <div className="flex items-center gap-3 bg-zinc-900 rounded-lg px-3 py-2">
                <code className="flex-1 text-xs text-emerald-300 font-mono break-all">{generatedKey}</code>
                <CopyButton text={generatedKey} />
              </div>
              <button onClick={() => setGeneratedKey(null)} className="text-xs text-zinc-500 hover:text-white transition">Dismiss</button>
            </div>
          )}

          {/* New key form */}
          {showNewKey && !generatedKey && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Generate API Key</p>
                <button onClick={() => { setShowNewKey(false); setNewKeyName(''); setNewKeyScopes([]); }} className="text-zinc-500 hover:text-white transition"><X className="h-4 w-4" /></button>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Key Name *</label>
                <input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Integration"
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Scopes (leave empty for all)</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SCOPES.map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setNewKeyScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope])}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        newKeyScopes.includes(scope)
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : 'border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-white'
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowNewKey(false); setNewKeyName(''); setNewKeyScopes([]); }}
                  className="px-4 py-2 rounded-lg border border-zinc-600 text-sm text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateKey}
                  disabled={!newKeyName.trim() || generatingKey}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm text-white font-medium transition"
                >
                  {generatingKey ? 'Generating…' : 'Generate Key'}
                </button>
              </div>
            </div>
          )}

          {/* Keys table */}
          {keysLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-zinc-800 rounded-xl animate-pulse" />)}
            </div>
          ) : apiKeys.length === 0 ? (
            <p className="text-zinc-500 text-sm py-8 text-center">No API keys yet.</p>
          ) : (
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-zinc-400">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Prefix</th>
                    <th className="px-5 py-3 font-medium">Scopes</th>
                    <th className="px-5 py-3 font-medium">Last Used</th>
                    <th className="px-5 py-3 font-medium">Expires</th>
                    <th className="px-5 py-3 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((k) => (
                    <tr key={k.id} className="border-b border-zinc-700 last:border-0 hover:bg-zinc-700/30 transition">
                      <td className="px-5 py-3 text-white font-medium">{k.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-400">{k.keyPrefix}…</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(k.scopes ?? []).length === 0 ? (
                            <span className="text-xs text-zinc-500">All scopes</span>
                          ) : (
                            k.scopes.slice(0, 3).map((s) => (
                              <span key={s} className="rounded-full bg-indigo-900/40 border border-indigo-700/50 px-2 py-0.5 text-xs text-indigo-300">{s}</span>
                            ))
                          )}
                          {k.scopes?.length > 3 && <span className="text-xs text-zinc-500">+{k.scopes.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-zinc-500 text-xs">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-5 py-3 text-zinc-500 text-xs">
                        {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleRevokeKey(k.id)}
                          className="text-zinc-500 hover:text-red-400 transition"
                          title="Revoke key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bull Board Link */}
      <div className="rounded-xl border border-dashed border-zinc-600 p-5 flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Queue Monitor</p>
          <p className="text-zinc-500 text-sm mt-0.5">View job queues, retries and failures in Bull Board</p>
        </div>
        <a
          href="http://localhost:4000/api/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white transition"
        >
          Open Bull Board ↗
        </a>
      </div>
    </div>
  );
}
