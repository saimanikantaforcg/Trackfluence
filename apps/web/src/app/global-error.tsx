'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center px-4">
          <div className="h-16 w-16 rounded-2xl bg-red-600 flex items-center justify-center mb-6 text-white text-3xl font-bold select-none">
            !
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Critical error</h1>
          <p className="text-zinc-400 text-sm max-w-xs mb-8">
            A critical error occurred. Our team has been notified automatically.
          </p>
          {error.digest && (
            <p className="text-zinc-600 text-xs mb-6 font-mono">Error ID: {error.digest}</p>
          )}
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
