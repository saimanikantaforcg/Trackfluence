'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { DateRangeProvider } from '@/lib/date-range-context';
import { ToastProvider } from '@/lib/toast-context';
import { ToastContainer } from '@/components/ui/toast-container';

const AUTH_FREE = ['/login', '/register'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = AUTH_FREE.includes(pathname);

  useEffect(() => {
    if (!isLoading && !user && !isAuthPage) {
      router.replace('/login');
    }
  }, [isLoading, user, isAuthPage, router]);

  if (isAuthPage) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <ToastProvider>
      <DateRangeProvider>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
        <ToastContainer />
      </DateRangeProvider>
    </ToastProvider>
  );
}
