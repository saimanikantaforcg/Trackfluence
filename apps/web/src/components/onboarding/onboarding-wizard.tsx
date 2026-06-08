'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, ChevronRight, Link2, TrendingUp, Zap, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  cta: string;
  href: string;
}

const STEPS: Step[] = [
  {
    id: 'creator',
    title: 'Add your first creator',
    description: 'Connect a creator and start tracking their campaigns.',
    icon: TrendingUp,
    cta: 'Add Creator',
    href: '/creators',
  },
  {
    id: 'link',
    title: 'Create a tracking link',
    description: 'Generate a UTM-tagged link or promo code for a campaign.',
    icon: Link2,
    cta: 'Create Link',
    href: '/attribution',
  },
  {
    id: 'connector',
    title: 'Connect Shopify or Salesforce',
    description: 'Sync orders automatically to attribute revenue to creators.',
    icon: Zap,
    cta: 'Connect',
    href: '/connectors',
  },
];

const STORAGE_KEY = 'tf_onboarding_done';
const STEPS_KEY = 'tf_onboarding_steps';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function OnboardingWizard() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      setDismissed(true);
      setReady(true);
      return;
    }

    // Restore manually completed steps
    let stored: Set<string>;
    try {
      const raw = localStorage.getItem(STEPS_KEY);
      stored = new Set(raw ? JSON.parse(raw) : []);
    } catch {
      stored = new Set();
    }

    // Auto-detect completed steps from real API data
    const token = localStorage.getItem('tf_token');
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch(`${API}/api/v1/creators`, { headers }).then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/api/v1/attribution/tracking-links`, { headers }).then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/api/v1/revenue-intelligence/connectors/status`, { headers }).then((r) => r.ok ? r.json() : []).catch(() => []),
    ]).then(([creators, links, connectors]) => {
      const next = new Set(stored);
      if (Array.isArray(creators) && creators.length > 0) next.add('creator');
      if (Array.isArray(links) && links.length > 0) next.add('link');
      if (Array.isArray(connectors) && connectors.some((c: { status: string }) => c.status === 'COMPLETED')) next.add('connector');
      setCompleted(next);
      localStorage.setItem(STEPS_KEY, JSON.stringify([...next]));
      // Auto-dismiss if all done
      if (next.size >= STEPS.length) {
        localStorage.setItem(STORAGE_KEY, 'true');
        setDismissed(true);
      }
    }).finally(() => setReady(true));
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  const markDone = (id: string) => {
    const next = new Set(completed).add(id);
    setCompleted(next);
    localStorage.setItem(STEPS_KEY, JSON.stringify([...next]));
    if (next.size >= STEPS.length) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setDismissed(true);
    }
  };

  const handleCta = (step: Step) => {
    markDone(step.id);
    router.push(step.href);
  };

  if (!ready || dismissed) return null;

  const progress = Math.round((completed.size / STEPS.length) * 100);

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-6 relative">
      <button
        onClick={dismiss}
        className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition"
        aria-label="Dismiss onboarding"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start justify-between mb-4 pr-8">
        <div>
          <h2 className="text-white font-semibold text-base">Get started with Trackfluence</h2>
          <p className="text-zinc-400 text-sm mt-0.5">{completed.size} of {STEPS.length} steps complete</p>
        </div>
        <span className="text-sm font-bold text-indigo-400">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-zinc-700 rounded-full mb-5">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-3">
        {STEPS.map((step) => {
          const done = completed.has(step.id);
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 rounded-lg p-3 transition ${done ? 'opacity-50' : 'bg-zinc-800/50 hover:bg-zinc-800'}`}
            >
              <div className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg ${done ? 'bg-emerald-900/50' : 'bg-indigo-900/50'}`}>
                <Icon className={`h-4 w-4 ${done ? 'text-emerald-400' : 'text-indigo-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{step.title}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{step.description}</p>
              </div>
              {done ? (
                <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <button
                  onClick={() => handleCta(step)}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium flex-shrink-0 transition"
                >
                  {step.cta} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
