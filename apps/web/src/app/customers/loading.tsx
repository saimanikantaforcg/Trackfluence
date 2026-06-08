export default function CustomersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-lg bg-slate-200" />
      <div className="h-4 w-80 rounded bg-slate-100" />
      <div className="flex gap-3">
        <div className="h-10 w-80 rounded-lg bg-slate-100" />
        <div className="h-10 w-24 rounded-lg bg-slate-100" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-50">
            <div className="h-8 w-8 rounded-full bg-slate-100" />
            <div className="flex-1">
              <div className="h-4 w-32 rounded bg-slate-200 mb-1" />
              <div className="h-3 w-40 rounded bg-slate-100" />
            </div>
            <div className="h-4 w-20 rounded bg-slate-100" />
            <div className="h-4 w-16 rounded bg-slate-100" />
            <div className="h-4 w-20 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
