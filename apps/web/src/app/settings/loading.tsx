export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 rounded bg-slate-200" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="h-5 w-44 rounded bg-slate-200" />
          <div className="h-4 w-72 rounded bg-slate-100" />
          <div className="h-10 w-full rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
