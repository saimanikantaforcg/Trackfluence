'use client';

import { useState } from 'react';
import { Check, Zap, TrendingUp, Building2, ArrowRight, Loader2 } from 'lucide-react';

const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Get started with creator attribution',
    icon: Zap,
    color: 'text-slate-400',
    border: 'border-slate-200',
    badge: null,
    priceId: null,
    features: [
      'Up to 3 creators',
      '10 tracking links',
      '50 attribution runs / month',
      'Last-touch attribution',
      'Basic dashboard',
    ],
  },
  {
    key: 'STARTER',
    name: 'Starter',
    price: 49,
    period: 'mo',
    description: 'For growing creator programs',
    icon: TrendingUp,
    color: 'text-indigo-500',
    border: 'border-indigo-300',
    badge: null,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
    features: [
      'Up to 15 creators',
      '100 tracking links',
      '1,000 attribution runs / month',
      'All attribution models',
      'Audience segments',
      'Compliance checks',
      'Email support',
    ],
  },
  {
    key: 'GROWTH',
    name: 'Growth',
    price: 149,
    period: 'mo',
    description: 'For scaling revenue intelligence',
    icon: TrendingUp,
    color: 'text-violet-500',
    border: 'border-violet-400',
    badge: 'Most popular',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH,
    features: [
      'Up to 100 creators',
      '1,000 tracking links',
      '20,000 attribution runs / month',
      'Revenue intelligence AI',
      'Creator leaderboard',
      'Custom webhooks',
      'Priority support',
      'API access',
    ],
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    price: null,
    period: null,
    description: 'Unlimited scale, custom contracts',
    icon: Building2,
    color: 'text-emerald-500',
    border: 'border-emerald-400',
    badge: null,
    priceId: null,
    features: [
      'Unlimited creators',
      'Unlimited tracking links',
      'Unlimited attribution runs',
      'Salesforce / CRM connectors',
      'SSO / SAML',
      'Dedicated CSM',
      'SLA guarantee',
      'Custom contracts',
    ],
  },
];

interface PricingClientProps {
  currentPlan?: string;
}

export default function PricingClient({ currentPlan = 'FREE' }: PricingClientProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function subscribe(priceId: string, planKey: string) {
    setLoading(planKey);
    try {
      const token = localStorage.getItem('tf_token');
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) throw new Error('Failed to create checkout session');
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      alert('Could not start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  async function manageSubscription() {
    setLoading('portal');
    try {
      const token = localStorage.getItem('tf_token');
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/settings` }),
      });
      if (!res.ok) throw new Error('Failed to open billing portal');
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      alert('Could not open billing portal. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Simple, transparent pricing</h1>
        <p className="mt-2 text-slate-500">Start free. Upgrade as your creator program grows.</p>
      </div>

      {/* Plan grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isActive = currentPlan === plan.key;

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border-2 bg-white p-6 flex flex-col ${plan.border} ${isActive ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-semibold text-white whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute -top-3 right-4 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">
                  Current plan
                </span>
              )}

              <div className="mb-4">
                <Icon className={`h-7 w-7 ${plan.color} mb-3`} />
                <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
                <p className="text-slate-500 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                {plan.price === null ? (
                  <p className="text-2xl font-bold text-slate-900">Custom</p>
                ) : plan.price === 0 ? (
                  <p className="text-2xl font-bold text-slate-900">Free</p>
                ) : (
                  <p className="text-2xl font-bold text-slate-900">
                    ${plan.price}
                    <span className="text-base font-normal text-slate-400"> / {plan.period}</span>
                  </p>
                )}
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isActive ? (
                <button
                  onClick={manageSubscription}
                  disabled={loading === 'portal'}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading === 'portal' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Manage subscription
                </button>
              ) : plan.priceId ? (
                <button
                  onClick={() => subscribe(plan.priceId!, plan.key)}
                  disabled={!!loading}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading === plan.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Get started
                </button>
              ) : plan.key === 'FREE' ? (
                <button disabled className="w-full rounded-xl border border-slate-200 py-2.5 text-sm text-slate-400 cursor-default">
                  Current plan
                </button>
              ) : (
                <a
                  href="mailto:sales@trackfluence.com"
                  className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors text-center block"
                >
                  Contact sales
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Frequently asked questions</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-slate-600">
          <div>
            <p className="font-medium text-slate-700">Can I change plans anytime?</p>
            <p className="mt-0.5">Yes. Upgrades are immediate; downgrades take effect at the end of your billing period.</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">What counts as an attribution run?</p>
            <p className="mt-0.5">Each time you calculate attribution for an order, it counts as one run.</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Is there a free trial?</p>
            <p className="mt-0.5">All paid plans include a 14-day free trial — no card required.</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">How does billing work?</p>
            <p className="mt-0.5">Monthly or annual billing via Stripe. Cancel anytime from your account settings.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
