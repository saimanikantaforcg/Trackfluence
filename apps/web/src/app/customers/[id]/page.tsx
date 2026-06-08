import { notFound } from 'next/navigation';
import { ArrowLeft, ShoppingBag, Users, TrendingUp, Mail, Hash } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function fetchCustomer(id: string) {
  try {
    const res = await fetch(`${API}/api/v1/identity/customers/${id}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await fetchCustomer(id);
  if (!customer) notFound();

  const displayName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Unknown';
  const initials = displayName !== 'Unknown'
    ? displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </Link>

      {/* Profile card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-700 flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {customer.email && (
                <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                  <Mail className="h-3.5 w-3.5" /> {customer.email}
                </span>
              )}
              {customer.creatorAcquired && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                  <TrendingUp className="h-3 w-3" /> Creator Acquired
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-400">Customer since</p>
            <p className="text-sm font-medium text-slate-700">{fmtDate(customer.firstSeenAt)}</p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{fmt(customer.totalRevenue ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{fmt(customer.ltv ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Lifetime Value</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{customer.orderCount ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{customer.identities?.length ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Identity Signals</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Identity Graph */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Identity Signals</h2>
          </div>
          <div className="p-5 space-y-2">
            {customer.identities?.length ? customer.identities.map((identity: any) => (
              <div key={identity.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
                <div>
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-mono font-medium text-indigo-700 mr-2">
                    {identity.identityType}
                  </span>
                  <span className="text-sm text-slate-700">{identity.identityValue}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {fmtDate(identity.lastSeen ?? identity.createdAt)}
                </span>
              </div>
            )) : (
              <p className="text-sm text-slate-400 py-4 text-center">No identity signals</p>
            )}
          </div>
        </div>

        {/* Touchpoints */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Creator Touchpoints</h2>
          </div>
          <div className="p-5 space-y-2">
            {customer.touchpoints?.length ? customer.touchpoints.map((tp: any) => (
              <div key={tp.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-700">{tp.creator?.name ?? 'Unknown creator'}</p>
                  <p className="text-xs text-slate-400 capitalize">{tp.channel} · {tp.interactionType.toLowerCase()}</p>
                </div>
                <span className="text-xs text-slate-400">{fmtDate(tp.timestamp)}</span>
              </div>
            )) : (
              <p className="text-sm text-slate-400 py-4 text-center">No touchpoints recorded</p>
            )}
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-indigo-600" />
          <h2 className="text-base font-semibold text-slate-900">Purchase History</h2>
        </div>
        {!customer.orders?.length ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">No orders yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {customer.orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{order.externalId ?? order.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 capitalize">{order.source}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      order.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(Number(order.totalAmount))}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400">{fmtDate(order.orderDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
