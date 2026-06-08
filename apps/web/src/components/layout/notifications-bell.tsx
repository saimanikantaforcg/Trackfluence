'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, ShoppingCart, TrendingUp, X, CheckCheck } from 'lucide-react';
import { useToast } from '@/lib/toast-context';
import { api, type AppNotification } from '@/lib/api';
import { useRealtime } from '@/lib/use-realtime';

interface EventNotification {
  id: string;
  eventName: string;
  category: string;
  timestamp: string;
  properties: Record<string, unknown>;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CATEGORY_ICON: Record<string, React.FC<{ className?: string }>> = {
  purchase: ShoppingCart,
  conversion: TrendingUp,
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'events' | 'alerts'>('alerts');
  // SSE/polling events
  const [events, setEvents] = useState<EventNotification[]>([]);
  const [unreadEvents, setUnreadEvents] = useState(0);
  // In-app notifications
  const [alerts, setAlerts] = useState<AppNotification[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [liveFlash, setLiveFlash] = useState(false); // real-time indicator
  const ref = useRef<HTMLDivElement>(null);
  const lastReadRef = useRef<string>(
    typeof window !== 'undefined' ? (localStorage.getItem('tf_notif_last') ?? '') : ''
  );
  const latestIdRef = useRef<string>('');
  const { toast } = useToast();

  // Real-time socket — shows a live dot on new NOTIFICATION events
  useRealtime({
    onEvent: {
      NOTIFICATION: (payload) => {
        setLiveFlash(true);
        setUnreadAlerts((n) => n + 1);
        toast((payload.message as string) ?? 'New notification', 'info');
      },
      ATTRIBUTION_CREATED: (payload) => {
        toast(`New attribution: $${payload.revenue ?? ''}`, 'success');
      },
    },
  });

  // Load in-app notifications
  const loadAlerts = useCallback(async () => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('tf_token') : null;
    if (!t) return;
    try {
      const res = await api.getNotifications(t, 20);
      setAlerts(res.items);
      setUnreadAlerts(res.unread);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60_000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  // SSE connection for live purchase events
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const es = new EventSource(`${base}/api/v1/events/stream?category=purchase`);

    es.onmessage = (e) => {
      try {
        const data: EventNotification[] = JSON.parse(e.data);
        if (!Array.isArray(data) || data.length === 0) return;
        setEvents(data);
        const newest = data[0];
        if (newest && newest.id !== latestIdRef.current) {
          const isNew = newest.id > lastReadRef.current;
          if (isNew && latestIdRef.current !== '') {
            const revenue = newest.properties?.revenue as number | undefined;
            const msg = revenue != null
              ? `New purchase: $${revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : `New event: ${newest.eventName}`;
            toast(msg, 'success');
            setUnreadEvents((u) => u + 1);
          }
          latestIdRef.current = newest.id;
        }
      } catch {}
    };

    es.onerror = () => { es.close(); pollFallback(); };
    return () => es.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function pollFallback() {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30_000);
    return () => clearInterval(interval);
  }

  async function fetchEvents() {
    try {
      const token = localStorage.getItem('tf_token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/events?category=purchase&limit=8`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) return;
      const data: EventNotification[] = await res.json();
      setEvents(data);
      const newCount = data.filter((e) => e.id > lastReadRef.current).length;
      setUnreadEvents(newCount);
    } catch {}
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function markEventsRead() {
    if (events.length > 0) {
      const latest = events[0].id;
      lastReadRef.current = latest;
      localStorage.setItem('tf_notif_last', latest);
      setUnreadEvents(0);
    }
  }

  async function markAllAlertsRead() {
    const t = localStorage.getItem('tf_token');
    if (!t) return;
    try {
      await api.markAllNotificationsRead(t);
      setUnreadAlerts(0);
      setAlerts((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch {}
  }

  function toggle() {
    setOpen((o) => !o);
    if (!open) {
      markEventsRead();
      if (tab === 'alerts') void markAllAlertsRead();
    }
  }

  const totalUnread = unreadEvents + unreadAlerts;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {/* Live real-time pulse dot */}
        {liveFlash && totalUnread === 0 && (
          <span className="absolute right-1 top-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
          </span>
        )}
        {totalUnread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-50">
          {/* Header + tabs */}
          <div className="border-b border-slate-100 px-4 pt-3 pb-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-1">
              {(['alerts', 'events'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); if (t === 'alerts') void markAllAlertsRead(); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors capitalize ${tab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  {t === 'alerts' ? 'Alerts' : 'Live Events'}
                  {t === 'alerts' && unreadAlerts > 0 && (
                    <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5">{unreadAlerts}</span>
                  )}
                  {t === 'events' && unreadEvents > 0 && (
                    <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-600 rounded-full px-1.5 py-0.5">{unreadEvents}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Alerts tab */}
          {tab === 'alerts' && (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {alerts.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">No alerts yet</div>
              ) : (
                alerts.map((n) => (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 ${!n.readAt ? 'bg-indigo-50/50' : ''}`}>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                      <Bell className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Live events tab */}
          {tab === 'events' && (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {events.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">No recent events</div>
              ) : (
                events.map((ev) => {
                  const Icon = CATEGORY_ICON[ev.category] ?? TrendingUp;
                  const revenue = ev.properties?.revenue as number | undefined;
                  return (
                    <div key={ev.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                        <Icon className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{ev.eventName}</p>
                        {revenue != null && (
                          <p className="text-xs text-emerald-600 font-semibold">
                            ${revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(ev.timestamp)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">
              {tab === 'events' ? 'Live via SSE · 30s fallback' : 'Refreshed every 60s'}
            </p>
            {tab === 'alerts' && unreadAlerts > 0 && (
              <button onClick={markAllAlertsRead} className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700">
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
