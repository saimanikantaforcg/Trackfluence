'use client';

import { useState } from 'react';
import { CheckCircle, ChevronRight, ChevronLeft, User, Globe, DollarSign } from 'lucide-react';

const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'twitter', 'linkedin', 'podcast', 'blog', 'other'];

interface WizardData {
  // Step 1 — Profile
  name: string;
  email: string;
  handle: string;
  // Step 2 — Platform
  platform: string;
  avatarUrl: string;
  // Step 3 — Payout
  commissionRate: string;
}

interface Props {
  onClose: () => void;
  onCreated: (creator: { id: string; name: string }) => void;
}

const STEPS = [
  { label: 'Profile', icon: User },
  { label: 'Platform', icon: Globe },
  { label: 'Payout', icon: DollarSign },
];

export default function OnboardingWizard({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    name: '', email: '', handle: '',
    platform: '', avatarUrl: '',
    commissionRate: '10',
  });
  const [errors, setErrors] = useState<Partial<WizardData>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof WizardData, value: string) => {
    setData(d => ({ ...d, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  function validateStep(): boolean {
    const e: Partial<WizardData> = {};
    if (step === 0) {
      if (!data.name.trim()) e.name = 'Name is required';
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = 'Invalid email';
    }
    if (step === 1) {
      if (!data.platform) e.platform = 'Select a platform';
    }
    if (step === 2) {
      const r = parseFloat(data.commissionRate);
      if (isNaN(r) || r < 0 || r > 100) e.commissionRate = 'Must be 0–100';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep()) setStep(s => s + 1);
  }

  async function submit() {
    if (!validateStep()) return;
    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('tf_token') : null;
      const res = await fetch('/api/v1/creators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim() || undefined,
          handle: data.handle.trim() || undefined,
          platform: data.platform || undefined,
          avatarUrl: data.avatarUrl.trim() || undefined,
          commissionRate: parseFloat(data.commissionRate) / 100,
        }),
      });
      if (!res.ok) throw new Error('Failed to create creator');
      const creator = await res.json() as { id: string; name: string };
      setDone(true);
      setTimeout(() => onCreated(creator), 1500);
    } catch {
      setErrors({ name: 'Failed to create creator. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Add New Creator</h2>
          <p className="text-sm text-slate-400 mt-1">Complete all steps to onboard a creator</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done2 = i < step || done;
            return (
              <div key={s.label} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-1.5 text-xs font-medium ${active ? 'text-indigo-400' : done2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${active ? 'border-indigo-500 bg-indigo-500/20' : done2 ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-600'}`}>
                    {done2 && !active ? <CheckCircle size={14} /> : <Icon size={14} />}
                  </div>
                  <span className="hidden sm:block">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${i < step ? 'bg-emerald-600' : 'bg-slate-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        {done ? (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto text-emerald-400 mb-3" size={48} />
            <p className="text-white font-semibold text-lg">Creator onboarded!</p>
            <p className="text-slate-400 text-sm mt-1">Redirecting…</p>
          </div>
        ) : (
          <>
            {/* Step 0 — Profile */}
            {step === 0 && (
              <div className="space-y-4">
                <Field label="Full Name *" error={errors.name}>
                  <input value={data.name} onChange={e => set('name', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Jane Smith" />
                </Field>
                <Field label="Email" error={errors.email}>
                  <input type="email" value={data.email} onChange={e => set('email', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="jane@example.com" />
                </Field>
                <Field label="Handle" error={errors.handle}>
                  <input value={data.handle} onChange={e => set('handle', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="@janesmith" />
                </Field>
              </div>
            )}

            {/* Step 1 — Platform */}
            {step === 1 && (
              <div className="space-y-4">
                <Field label="Primary Platform *" error={errors.platform}>
                  <div className="grid grid-cols-4 gap-2">
                    {PLATFORMS.map(p => (
                      <button key={p} onClick={() => set('platform', p)}
                        className={`py-2 rounded-lg text-xs font-medium capitalize border transition-colors ${
                          data.platform === p
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Avatar URL (optional)" error={errors.avatarUrl}>
                  <input value={data.avatarUrl} onChange={e => set('avatarUrl', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="https://..." />
                </Field>
              </div>
            )}

            {/* Step 2 — Payout */}
            {step === 2 && (
              <div className="space-y-4">
                <Field label="Commission Rate (%)" error={errors.commissionRate}>
                  <div className="flex items-center gap-3">
                    <input
                      type="number" min={0} max={100} step={0.5}
                      value={data.commissionRate} onChange={e => set('commissionRate', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-slate-400 text-sm">%</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Stored as {data.commissionRate ? (parseFloat(data.commissionRate) / 100).toFixed(4) : '0.1000'} internally.
                    Payouts will be computed against this rate.
                  </p>
                </Field>
                <div className="bg-slate-800/60 rounded-lg p-4 text-sm text-slate-400 space-y-1">
                  <p className="text-white font-medium mb-2">Summary</p>
                  <p><span className="text-slate-300">Name:</span> {data.name}</p>
                  {data.email && <p><span className="text-slate-300">Email:</span> {data.email}</p>}
                  {data.handle && <p><span className="text-slate-300">Handle:</span> {data.handle}</p>}
                  <p><span className="text-slate-300">Platform:</span> <span className="capitalize">{data.platform}</span></p>
                  <p><span className="text-slate-300">Commission:</span> {data.commissionRate}%</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <button onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors">
                <ChevronLeft size={16} />
                {step === 0 ? 'Cancel' : 'Back'}
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={next}
                  className="flex items-center gap-1 px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={submit} disabled={saving}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors">
                  {saving ? 'Creating…' : 'Create Creator'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
