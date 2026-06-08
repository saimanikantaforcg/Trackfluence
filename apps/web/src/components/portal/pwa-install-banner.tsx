'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Shows an "Add to Home Screen" banner when the browser fires
 * the beforeinstallprompt event (Chrome/Edge on Android/desktop).
 *
 * On iOS Safari there's no install prompt API, so we show a
 * manual "tap Share → Add to Home Screen" tip instead.
 */
export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed (running as standalone PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    // Dismissed in this session
    if (sessionStorage.getItem('pwa-banner-dismissed')) {
      setDismissed(true);
      return;
    }
    // iOS detection
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)) {
      setIsIos(true);
      return;
    }
    // Chrome / Edge install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('pwa-banner-dismissed', '1');
    setDismissed(true);
    setDeferredPrompt(null);
    setIsIos(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  if (installed || dismissed || (!deferredPrompt && !isIos)) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto bg-zinc-800 border border-zinc-700 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg select-none">
        T
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">Install Trackfluence</p>
        {isIos ? (
          <p className="text-zinc-400 text-xs mt-0.5">
            Tap <strong className="text-white">Share</strong> then{' '}
            <strong className="text-white">Add to Home Screen</strong> for quick access.
          </p>
        ) : (
          <p className="text-zinc-400 text-xs mt-0.5">Add to your home screen for instant access.</p>
        )}
        {!isIos && (
          <button
            onClick={install}
            className="mt-2 flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-medium transition"
          >
            <Download className="h-3 w-3" /> Install
          </button>
        )}
      </div>
      <button onClick={dismiss} className="text-zinc-500 hover:text-white transition flex-shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
