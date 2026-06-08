import { Suspense } from 'react';
import PortalClient from '@/components/portal/portal-client';
import { PwaInstallBanner } from '@/components/portal/pwa-install-banner';

export const dynamic = 'force-dynamic';

export default function PortalPage() {
  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      }>
        <PortalClient />
      </Suspense>
      <PwaInstallBanner />
    </>
  );
}
