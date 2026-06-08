'use client';

import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 py-16 text-center">
      <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
      <h2 className="text-base font-semibold text-red-700">Something went wrong</h2>
      <p className="text-sm text-red-500 mt-1 max-w-sm">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
        Try again
      </button>
    </div>
  );
}
