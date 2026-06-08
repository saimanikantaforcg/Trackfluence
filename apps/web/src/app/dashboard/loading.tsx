export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-lg bg-slate-200" />
      <div className="h-4 w-96 rounded-lg bg-slate-100" />

      {/* KPI skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="h-8 w-8 rounded-lg bg-slate-100" />
            </div>
            <div className="h-8 w-24 rounded bg-slate-200 mb-2" />
            <div className="h-3 w-20 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Chart skeletons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 h-80" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 h-80" />
      </div>
    </div>
  );
}
