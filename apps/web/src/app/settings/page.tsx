'use client';

import { useState, useEffect } from 'react';
import { User, Settings, Key, Check, ExternalLink, Shield, Copy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import OrgSettingsClient from '@/components/settings/org-settings-client';

const SETTINGS_KEY = 'tf_attribution_settings';

interface AttrSettings {
  clickWindow: number;
  viewWindow: number;
  defaultModel: string;
}

function loadSettings(): AttrSettings {
  if (typeof window === 'undefined') return { clickWindow: 30, viewWindow: 1, defaultModel: 'LAST_TOUCH' };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { clickWindow: 30, viewWindow: 1, defaultModel: 'LAST_TOUCH' };
  } catch {
    return { clickWindow: 30, viewWindow: 1, defaultModel: 'LAST_TOUCH' };
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
      {copied ? <><Check className="h-3 w-3 text-emerald-600" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
    </button>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AttrSettings>({ clickWindow: 30, viewWindow: 1, defaultModel: 'LAST_TOUCH' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const set = (k: keyof AttrSettings, v: string | number) => setSettings((s) => ({ ...s, [k]: v }));

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Platform configuration, attribution rules, and API info</p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* Profile */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Profile</h2>
          </div>
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-700 flex-shrink-0">
                {initials}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">{user.name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
                <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-100">
                  {user.role}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Not signed in</p>
          )}
        </div>

        {/* Attribution Settings */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-5">
            <Settings className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Attribution Settings</h2>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Click Attribution Window</p>
                <p className="text-xs text-slate-400 mt-0.5">How many days after a click to attribute orders</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={90} value={settings.clickWindow}
                  onChange={(e) => set('clickWindow', parseInt(e.target.value) || 30)}
                  className="h-9 w-20 rounded-lg border border-slate-200 px-3 text-sm text-right focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                <span className="text-sm text-slate-400">days</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">View Attribution Window</p>
                <p className="text-xs text-slate-400 mt-0.5">How many days after a view to attribute orders</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={7} value={settings.viewWindow}
                  onChange={(e) => set('viewWindow', parseInt(e.target.value) || 1)}
                  className="h-9 w-20 rounded-lg border border-slate-200 px-3 text-sm text-right focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                <span className="text-sm text-slate-400">days</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Default Attribution Model</p>
                <p className="text-xs text-slate-400 mt-0.5">Used in Revenue and Dashboard views</p>
              </div>
              <select value={settings.defaultModel} onChange={(e) => set('defaultModel', e.target.value)}
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm focus:border-indigo-400 focus:outline-none bg-white">
                <option value="FIRST_TOUCH">First Touch</option>
                <option value="LAST_TOUCH">Last Touch</option>
                <option value="LINEAR">Linear (Pro)</option>
                <option value="TIME_DECAY">Time Decay (Pro)</option>
              </select>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={saveSettings} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors inline-flex items-center gap-2">
              {saved ? <><Check className="h-3.5 w-3.5" /> Saved!</> : 'Save Settings'}
            </button>
            {saved && <p className="text-xs text-emerald-600">Settings saved to browser storage</p>}
          </div>
        </div>

        {/* API Configuration */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-5">
            <Key className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">API Configuration</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">API Base URL</p>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <code className="flex-1 text-xs text-slate-700 font-mono">{API_URL}</code>
                <CopyButton text={API_URL} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Swagger API Docs</p>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <code className="flex-1 text-xs text-slate-700 font-mono">{API_URL}/api/docs</code>
                <a href={`${API_URL}/api/docs`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-white transition-colors">
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Shopify Webhook Endpoint</p>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <code className="flex-1 text-xs text-slate-700 font-mono break-all">{API_URL}/api/v1/connectors/shopify/webhook</code>
                <CopyButton text={`${API_URL}/api/v1/connectors/shopify/webhook`} />
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Security</h2>
          </div>
          <div className="space-y-2 text-sm text-slate-500">
            <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 flex-shrink-0" /> JWT authentication (7-day token expiry)</p>
            <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 flex-shrink-0" /> bcrypt password hashing (rounds: 12)</p>
            <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 flex-shrink-0" /> Shopify webhook HMAC-SHA256 verification</p>
            <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 flex-shrink-0" /> CORS restricted to {process.env.NEXT_PUBLIC_API_URL ? 'configured origin' : 'localhost:3000'}</p>
          </div>
        </div>

        {/* API Keys */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-1">
            <Key className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">API Keys</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Manage programmatic access tokens. Keys are shown once on creation.
          </p>
          <a
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition"
          >
            <Key className="h-4 w-4" /> Manage API Keys in Admin Panel
          </a>
        </div>

      </div>

      {/* Organizations */}
      <div className="mt-10 border-t border-slate-200 pt-10">
        <OrgSettingsClient />
      </div>
    </div>
  );
}
