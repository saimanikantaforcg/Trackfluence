export default function RevenueLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-slate-200" />
        <div className="h-4 w-64 rounded bg-slate-100" />
      </div>
      <div className="flex gap-2">
        {[1,2].map((i) => <div key={i} className="h-10 w-28 rounded-lg bg-slate-200" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="h-3 w-32 rounded bg-slate-100" />
            <div className="h-8 w-24 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 h-64" />
      <div className="border-b border-slate-200 flex gap-6 pb-3">
        {[1,2].map((i) => <div key={i} className="h-4 w-32 rounded bg-slate-200" />)}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="ml-auto h-4 w-20 rounded bg-slate-100" />
            <div className="h-4 w-12 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
