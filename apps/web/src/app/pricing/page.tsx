import { cookies } from 'next/headers';
import PricingClient from '@/components/billing/pricing-client';

async function getCurrentPlan(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tf_token')?.value;
    if (!token) return 'FREE';

    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const res = await fetch(`${base}/api/v1/billing/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    });
    if (!res.ok) return 'FREE';
    const sub = await res.json();
    return sub?.plan ?? 'FREE';
  } catch {
    return 'FREE';
  }
}

export default async function PricingPage() {
  const currentPlan = await getCurrentPlan();
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <PricingClient currentPlan={currentPlan} />
      </div>
    </main>
  );
}
