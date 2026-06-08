import type { CreatorPerformance } from '@/lib/api';

interface CreatorLeaderboardProps {
  creators: CreatorPerformance[];
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export function CreatorLeaderboard({ creators }: CreatorLeaderboardProps) {
  if (creators.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No creator data yet. Create tracking links to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {creators.map((creator, i) => (
        <div
          key={creator.creatorId}
          className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
              {i + 1}
            </span>
            <span className="text-sm font-medium text-slate-700">{creator.creatorName}</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{fmt(creator.attributedRevenue)}</p>
            <p className="text-xs text-slate-400">{creator.conversions} conversions</p>
          </div>
        </div>
      ))}
    </div>
  );
}
