'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Search, ExternalLink, ShieldCheck, ShoppingBag, Link2 } from 'lucide-react';
import type { CustomerProfile } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tf_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Customer detail drawer ───────────────────────────────────

function CustomerDrawer({ customer, onClose }: { customer: CustomerProfile; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {customer.firstName || customer.lastName
                ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim()
                : customer.email ?? 'Anonymous Customer'}
            </h2>
            {customer.email && <p className="text-sm text-slate-500 mt-0.5">{customer.email}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Revenue</p>
              <p className="text-sm font-bold text-slate-900">
                ${Number(customer.totalRevenue ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Orders</p>
              <p className="text-sm font-bold text-slate-900">{customer.orderCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Creator-acq.</p>
              <p className="text-sm font-bold text-slate-900">{customer.creatorAcquired ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Identity graph */}
          {customer.identities && customer.identities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">Identity Graph</h3>
              </div>
              <div className="space-y-1.5">
                {customer.identities.map((id) => (
                  <div key={id.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-16">{id.identityType}</span>
                    <span className="text-sm text-slate-700 flex-1 ml-2">{id.identityValue}</span>
                    <span className="text-xs text-slate-400">{new Date(id.lastSeen).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Touchpoints */}
          {customer.touchpoints && customer.touchpoints.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">Touchpoints</h3>
              </div>
              <div className="space-y-1.5">
                {customer.touchpoints.map((tp) => (
                  <div key={tp.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{tp.creator?.name ?? 'Unknown creator'}</span>
                      <span className="text-xs text-slate-400">{new Date(tp.timestamp).toLocaleDateString()}</span>
                    </div>
                    {(tp.utmSource || tp.utmCampaign) && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {[tp.utmSource, tp.utmCampaign].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders */}
          {customer.orders && customer.orders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">Recent Orders</h3>
              </div>
              <div className="space-y-1.5">
                {customer.orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">${Number(order.totalAmount).toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{new Date(order.orderDate).toLocaleDateString()}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                      order.status === 'REFUNDED' ? 'bg-red-50 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{order.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Customer row ─────────────────────────────────────────────

function CustomerRow({ customer }: { customer: CustomerProfile }) {
  const [detail, setDetail] = useState<CustomerProfile | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function openDetail() {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/api/v1/identity/customers/${customer.id}`, {
        headers: authHeaders(),
      });
      if (res.ok) setDetail(await res.json());
    } catch {}
    setLoadingDetail(false);
  }

  const name = customer.firstName || customer.lastName
    ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim()
    : null;

  return (
    <>
      {detail && <CustomerDrawer customer={detail} onClose={() => setDetail(null)} />}
      <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={openDetail}>
        <td className="px-4 py-3">
          <div className="font-medium text-slate-800">{name ?? <span className="text-slate-400 italic">Anonymous</span>}</div>
          {customer.email && <div className="text-xs text-slate-400">{customer.email}</div>}
        </td>
        <td className="px-4 py-3">
          {customer.creatorAcquired ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
              Creator
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              Organic
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right font-medium text-slate-700">
          ${Number(customer.totalRevenue ?? 0).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-right text-slate-500">{customer.orderCount ?? 0}</td>
        <td className="px-4 py-3 text-right text-xs text-slate-400">
          {new Date(customer.createdAt).toLocaleDateString()}
        </td>
        <td className="px-4 py-3 text-right">
          {loadingDetail ? (
            <span className="text-xs text-slate-400 animate-pulse">Loading…</span>
          ) : (
            <ExternalLink className="h-3.5 w-3.5 text-slate-300 hover:text-slate-500 ml-auto" />
          )}
        </td>
      </tr>
    </>
  );
}

// ─── Main client ──────────────────────────────────────────────

export function CustomersClient() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creatorAcquiredFilter, setCreatorAcquiredFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchCustomers(email: string, acq: 'all' | 'yes' | 'no', p: number) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (email) params.set('email', email);
    if (acq === 'yes') params.set('creatorAcquired', 'true');
    if (acq === 'no') params.set('creatorAcquired', 'false');
    try {
      const res = await fetch(`${API}/api/v1/identity/customers?${params}`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setCustomers(data);
        setTotal(data.length);
      } else {
        setCustomers(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    fetchCustomers(search, creatorAcquiredFilter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorAcquiredFilter, page]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchCustomers(val, creatorAcquiredFilter, 1);
    }, 400);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">Unified customer identity graph with touchpoint history</p>
        </div>
        <div className="text-sm text-slate-500">{total.toLocaleString()} total</div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by email…"
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {(['all', 'yes', 'no'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => { setCreatorAcquiredFilter(opt); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                creatorAcquiredFilter === opt
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {opt === 'all' ? 'All' : opt === 'yes' ? 'Creator-acquired' : 'Organic'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16">
          <Users className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No customers found</h3>
          <p className="text-sm text-slate-400 mt-1">Try adjusting the search or filters.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Source</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Orders</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {customers.map((c) => <CustomerRow key={c.id} customer={c} />)}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
