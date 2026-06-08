export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-indigo-600 animate-pulse" />
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
