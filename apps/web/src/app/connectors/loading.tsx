export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-slate-200" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="h-6 w-20 rounded-full bg-slate-200" />
          </div>
          <div className="h-4 w-64 rounded bg-slate-100" />
          <div className="h-10 w-32 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
