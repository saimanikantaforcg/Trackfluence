'use client';

import { useAuth } from '@/lib/auth-context';
import { DateRangePicker } from '@/components/layout/date-range-picker';
import { NotificationsBell } from '@/components/layout/notifications-bell';
import { GlobalSearch } from '@/components/layout/global-search';

export function Header() {
  const { user, logout } = useAuth();
  const initials = user ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'TF';

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--tf-border)] bg-white px-6">
      <div className="flex items-center gap-3">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-3">
        <DateRangePicker />
        <NotificationsBell />
        {user && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 pl-2 pr-1 py-1">
            <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-600">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-slate-700 leading-tight">{user.name}</p>
              <p className="text-xs text-slate-400 leading-tight">{user.role}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="ml-1 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

