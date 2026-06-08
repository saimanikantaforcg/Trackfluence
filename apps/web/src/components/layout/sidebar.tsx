'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Link2,
  Users,
  DollarSign,
  Target,
  ShieldCheck,
  Settings,
  Zap,
  TrendingUp,
  Shield,
  Megaphone,
  Wallet,
  Webhook,
  Activity,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { label: 'Attribution', href: '/attribution', icon: Link2 },
  { label: 'Creators', href: '/creators', icon: TrendingUp },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Revenue', href: '/revenue', icon: DollarSign },
  { label: 'Intelligence', href: '/intelligence', icon: Activity },
  { label: 'Audiences', href: '/audiences', icon: Target },
  { label: 'Compliance', href: '/compliance', icon: ShieldCheck },
  { label: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { label: 'Payouts', href: '/payouts', icon: Wallet },
  { label: 'Webhooks', href: '/webhooks', icon: Webhook },
  { label: 'Connectors', href: '/connectors', icon: Zap },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const adminItems = [
  { label: 'Admin', href: '/admin', icon: Shield },
  { label: 'Audit Log', href: '/admin/audit', icon: ShieldCheck },
  { label: 'Users', href: '/admin/users', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col bg-[var(--tf-sidebar)] text-white">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-white/10">
        <Zap className="h-7 w-7 text-indigo-400" />
        <span className="text-xl font-bold tracking-tight">Trackfluence</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}

        {/* Admin section */}
        <div className="pt-3 mt-3 border-t border-white/10">
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Admin</p>
          {adminItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-xs text-slate-400">Trackfluence v0.1.0 MVP</p>
      </div>
    </aside>
  );
}
