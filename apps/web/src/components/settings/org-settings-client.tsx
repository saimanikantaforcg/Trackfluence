'use client';

import { useEffect, useState, useCallback } from 'react';
import { Building2, Users, UserPlus, Trash2, Crown, ShieldCheck, User, Eye, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/lib/toast-context';

interface OrgMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  createdAt: string;
}

interface OrgInvite {
  id: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  expiresAt: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  members: OrgMember[];
  invites: OrgInvite[];
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  OWNER: <Crown className="h-3.5 w-3.5 text-yellow-400" />,
  ADMIN: <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />,
  MEMBER: <User className="h-3.5 w-3.5 text-zinc-400" />,
  VIEWER: <Eye className="h-3.5 w-3.5 text-zinc-500" />,
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
  ADMIN: 'text-blue-400 bg-blue-900/30 border-blue-700',
  MEMBER: 'text-zinc-300 bg-zinc-800 border-zinc-600',
  VIEWER: 'text-zinc-500 bg-zinc-900 border-zinc-700',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${ROLE_COLORS[role] ?? ROLE_COLORS.MEMBER}`}>
      {ROLE_ICONS[role]} {role}
    </span>
  );
}

export default function OrgSettingsClient() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selected, setSelected] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');

  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  useEffect(() => { setToken(localStorage.getItem('tf_token') ?? ''); }, []);

  const apiFetch = useCallback(async (path: string, opts?: RequestInit) => {
    const res = await fetch(`${base}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? res.statusText);
    }
    return res.json() as Promise<unknown>;
  }, [base, token]);

  const loadOrgs = useCallback(async () => {
    if (!token) return;
    try {
      const list = await apiFetch('/api/v1/organizations/mine') as Array<Organization & { role: string }>;
      setOrgs(list);
      if (list.length > 0 && !selected) {
        const detail = await apiFetch(`/api/v1/organizations/${list[0].id}`) as Organization;
        setSelected(detail);
      }
    } catch (e) {
      toast((e as Error).message ?? 'Failed to load organizations', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, apiFetch, selected, toast]);

  useEffect(() => { if (token) loadOrgs(); }, [token, loadOrgs]);

  const selectOrg = async (orgId: string) => {
    try {
      const detail = await apiFetch(`/api/v1/organizations/${orgId}`) as Organization;
      setSelected(detail);
    } catch {
      toast('Failed to load organization', 'error');
    }
  };

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiFetch('/api/v1/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: newName, slug: newSlug }),
      });
      toast('Organization created', 'success');
      setNewName(''); setNewSlug('');
      await loadOrgs();
    } catch (e) {
      toast((e as Error).message ?? 'Failed to create organization', 'error');
    } finally {
      setCreating(false);
    }
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setInviting(true);
    try {
      await apiFetch(`/api/v1/organizations/${selected.id}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      toast(`Invite sent to ${inviteEmail}`, 'success');
      setInviteEmail('');
      const detail = await apiFetch(`/api/v1/organizations/${selected.id}`) as Organization;
      setSelected(detail);
    } catch (e) {
      toast((e as Error).message ?? 'Failed to send invite', 'error');
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!selected || !confirm('Remove this member?')) return;
    try {
      await apiFetch(`/api/v1/organizations/${selected.id}/members/${userId}`, { method: 'DELETE' });
      toast('Member removed', 'success');
      const detail = await apiFetch(`/api/v1/organizations/${selected.id}`) as Organization;
      setSelected(detail);
    } catch (e) {
      toast((e as Error).message ?? 'Failed to remove member', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-400" /> Organizations
        </h2>
        <p className="text-zinc-400 text-sm mt-0.5">Manage workspaces and team access</p>
      </div>

      {/* Create org */}
      {orgs.length === 0 && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Create your first organization</h3>
          <form onSubmit={createOrg} className="flex flex-col sm:flex-row gap-3">
            <input
              required value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Organization name"
              className="flex-1 rounded-lg bg-zinc-700 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              required value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="slug"
              className="w-40 rounded-lg bg-zinc-700 border border-zinc-600 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit" disabled={creating}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm text-white font-medium transition"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
        </div>
      )}

      {/* Org selector */}
      {orgs.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {orgs.map((o) => (
            <button
              key={o.id}
              onClick={() => selectOrg(o.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${selected?.id === o.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          {/* Org info */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-semibold text-lg">{selected.name}</h3>
            </div>
            <p className="text-zinc-500 text-xs font-mono">slug: {selected.slug}</p>
          </div>

          {/* Members */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-700">
              <Users className="h-4 w-4 text-zinc-400" />
              <h3 className="text-white font-semibold">Members</h3>
              <span className="ml-auto text-zinc-500 text-xs">{selected.members.length} member{selected.members.length !== 1 ? 's' : ''}</span>
            </div>
            {selected.members.map((m) => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-3 border-b border-zinc-700/50 last:border-0">
                <div className="h-8 w-8 rounded-full bg-indigo-900/40 flex items-center justify-center text-indigo-300 text-xs font-bold flex-shrink-0">
                  {m.userId.slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 text-zinc-300 text-sm font-mono text-xs">{m.userId}</span>
                <RoleBadge role={m.role} />
                {m.role !== 'OWNER' && (
                  <button onClick={() => removeMember(m.userId)} className="text-zinc-600 hover:text-red-400 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Pending invites */}
          {selected.invites.length > 0 && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-700">
                <Mail className="h-4 w-4 text-zinc-400" />
                <h3 className="text-white font-semibold">Pending Invites</h3>
              </div>
              {selected.invites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-4 px-5 py-3 border-b border-zinc-700/50 last:border-0">
                  <span className="flex-1 text-zinc-400 text-sm">{inv.email}</span>
                  <RoleBadge role={inv.role} />
                  <span className="text-zinc-600 text-xs">Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Invite form */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-indigo-400" /> Invite a Team Member
            </h3>
            <form onSubmit={invite} className="flex flex-col sm:flex-row gap-3">
              <input
                required type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 rounded-lg bg-zinc-700 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <select
                value={inviteRole} onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                className="rounded-lg bg-zinc-700 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="submit" disabled={inviting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm text-white font-medium transition flex items-center gap-2"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {inviting ? 'Sending…' : 'Send Invite'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
