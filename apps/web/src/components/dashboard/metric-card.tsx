import { type LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
}

export function MetricCard({ label, value, change, trend, icon: Icon }: MetricCardProps) {
  const trendColor = {
    up: 'text-emerald-600 bg-emerald-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-slate-500 bg-slate-50',
  }[trend];

  const TrendIcon = { up: ArrowUpRight, down: ArrowDownRight, neutral: Minus }[trend];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className="rounded-lg bg-indigo-50 p-2">
          <Icon className="h-4 w-4 text-indigo-600" />
        </div>
      </div>
      <div className="mt-3">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${trendColor}`}>
          <TrendIcon className="h-3 w-3" />
          {change}
        </span>
        <span className="text-xs text-slate-400">vs last period</span>
      </div>
    </div>
  );
}
