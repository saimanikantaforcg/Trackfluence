'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center px-4">
      <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-6 text-white text-3xl font-bold select-none">
        T
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">You&apos;re offline</h1>
      <p className="text-zinc-400 text-sm max-w-xs">
        No internet connection detected. Your data will sync automatically when you&apos;re back online.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-8 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
      >
        Try again
      </button>
    </div>
  );
}
