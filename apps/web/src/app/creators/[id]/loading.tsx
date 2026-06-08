export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-7 w-20 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="h-5 w-36 rounded bg-slate-200" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-full rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
