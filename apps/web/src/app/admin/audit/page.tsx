'use client';

import { useEffect, useState, useCallback } from 'react';
import { Shield, RefreshCw, User, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-emerald-400 bg-emerald-900/30 border-emerald-700',
  UPDATE: 'text-blue-400 bg-blue-900/30 border-blue-700',
  DELETE: 'text-red-400 bg-red-900/30 border-red-700',
  LOGIN: 'text-indigo-400 bg-indigo-900/30 border-indigo-700',
  APPROVE: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
  EXPORT: 'text-purple-400 bg-purple-900/30 border-purple-700',
};

function actionColor(action: string): string {
  const key = Object.keys(ACTION_COLORS).find((k) => action.toUpperCase().includes(k));
  return key ? ACTION_COLORS[key] : 'text-zinc-400 bg-zinc-800 border-zinc-600';
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState('');

  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const load = useCallback(async () => {
    const token = localStorage.getItem('tf_token');
    if (!token) return;
    setLoading(true);
    try {
      const url = filterUser
        ? `${base}/api/v1/audit/logs/user?userId=${encodeURIComponent(filterUser)}&limit=500`
        : `${base}/api/v1/audit/logs?limit=500`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setLogs((await res.json()) as AuditLog[]);
        setPage(0);
      }
    } finally {
      setLoading(false);
    }
  }, [base, filterUser]);

  useEffect(() => { load(); }, [load]);

  const paginated = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-400" /> Audit Log
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">{logs.length.toLocaleString()} events recorded</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-300 font-medium transition"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            placeholder="Filter by user ID…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-24 text-zinc-500">No audit logs found</div>
      ) : (
        <>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Entity</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">IP</th>
                  <th className="text-left px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      className="border-b border-zinc-800 hover:bg-zinc-800/40 transition cursor-pointer"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    >
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{timeAgo(log.createdAt)}</td>
                      <td className="px-4 py-3 font-mono text-zinc-400 text-xs max-w-[120px] truncate">{log.userId}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${actionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                        {log.entityType ?? '—'}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 text-xs font-mono hidden lg:table-cell">{log.ip ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {log.details ? '▶ expand' : '—'}
                      </td>
                    </tr>
                    {expanded === log.id && log.details && (
                      <tr key={`${log.id}-detail`} className="border-b border-zinc-800 bg-zinc-800/30">
                        <td colSpan={6} className="px-4 py-3">
                          <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap break-all bg-zinc-900 rounded-lg p-3 border border-zinc-700">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-zinc-500 text-sm">
                Page {page + 1} of {totalPages} · {logs.length} total
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 disabled:opacity-40 hover:bg-zinc-700 transition text-sm">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 disabled:opacity-40 hover:bg-zinc-700 transition text-sm">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
