'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, ShieldOff, Trash2, Crown, RefreshCw, Loader2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  MEMBER: 'bg-slate-100 text-slate-600 border-slate-200',
  VIEWER: 'bg-amber-50 text-amber-600 border-amber-200',
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  function getHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tf_token') : null;
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users`, { headers: getHeaders() });
      if (res.ok) setUsers(await res.json() as User[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Decode JWT to get own userId
    try {
      const token = localStorage.getItem('tf_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]!)) as { sub: string };
        setMyId(payload.sub);
      }
    } catch { /* ignore */ }
  }, [load]);

  async function promote(userId: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER') {
    setActionId(userId);
    try {
      await fetch(`${API}/api/v1/admin/users/${userId}/promote`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ role }),
      });
      await load();
    } finally { setActionId(null); }
  }

  async function suspend(userId: string) {
    setActionId(userId);
    try {
      await fetch(`${API}/api/v1/admin/users/${userId}/suspend`, { method: 'POST', headers: getHeaders() });
      await load();
    } finally { setActionId(null); }
  }

  async function deleteUser(userId: string) {
    setActionId(userId);
    setConfirmDelete(null);
    try {
      await fetch(`${API}/api/v1/admin/users/${userId}`, { method: 'DELETE', headers: getHeaders() });
      setUsers(u => u.filter(x => x.id !== userId));
    } finally { setActionId(null); }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="text-indigo-400" size={24} />
            <div>
              <h1 className="text-2xl font-bold">User Management</h1>
              <p className="text-slate-400 text-sm">{users.length} users total</p>
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-400" size={32} />
          </div>
        ) : (
          <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">User</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Joined</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelf = u.id === myId;
                  const busy = actionId === u.id;
                  return (
                    <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_BADGE[u.role] ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="text-xs text-slate-500 text-right block">You</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {busy ? <Loader2 size={14} className="animate-spin text-indigo-400" /> : (
                              <>
                                {u.role !== 'ADMIN' && (
                                  <button onClick={() => void promote(u.id, 'ADMIN')} title="Promote to Admin"
                                    className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-900/30 transition-colors">
                                    <Crown size={14} />
                                  </button>
                                )}
                                {u.role !== 'VIEWER' && (
                                  <button onClick={() => void suspend(u.id)} title="Suspend (set to Viewer)"
                                    className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-900/30 transition-colors">
                                    <ShieldOff size={14} />
                                  </button>
                                )}
                                <button onClick={() => setConfirmDelete(u.id)} title="Delete user"
                                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/30 transition-colors">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete confirmation modal */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-slate-900 border border-red-800 rounded-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-bold text-white mb-2">Delete User?</h3>
              <p className="text-slate-400 text-sm mb-6">
                This will permanently delete the user account. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-300 bg-slate-800 hover:bg-slate-700">
                  Cancel
                </button>
                <button onClick={() => void deleteUser(confirmDelete)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
