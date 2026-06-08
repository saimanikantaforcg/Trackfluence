export default function AudiencesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-lg bg-slate-200" />
          <div className="h-4 w-56 rounded bg-slate-100" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-36 rounded bg-slate-200" />
                <div className="h-3 w-24 rounded bg-slate-100" />
              </div>
              <div className="h-7 w-16 rounded-full bg-slate-200" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-24 rounded-full bg-slate-100" />
              <div className="h-5 w-20 rounded-full bg-slate-100" />
            </div>
            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <div className="h-8 flex-1 rounded-lg bg-slate-200" />
              <div className="h-8 w-8 rounded-lg bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
