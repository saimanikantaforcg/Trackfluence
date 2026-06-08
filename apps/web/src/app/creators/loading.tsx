export default function CreatorsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded-lg bg-slate-200" />
          <div className="h-4 w-44 rounded bg-slate-100" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-slate-200" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-64 rounded-lg bg-slate-200" />
        {[1,2,3,4].map((i) => <div key={i} className="h-7 w-20 rounded-full bg-slate-200" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="h-3 w-20 rounded bg-slate-100" />
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-3">
              {[1,2,3].map((j) => <div key={j} className="h-8 rounded bg-slate-100" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
