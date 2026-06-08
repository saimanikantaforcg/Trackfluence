'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TimeSeriesPoint } from '@/lib/api';

interface RevenueChartProps {
  data: TimeSeriesPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.length > 0 ? data : [
    { month: 'Jan', revenue: 0, attributed: 0 },
    { month: 'Feb', revenue: 0, attributed: 0 },
    { month: 'Mar', revenue: 0, attributed: 0 },
    { month: 'Apr', revenue: 0, attributed: 0 },
    { month: 'May', revenue: 0, attributed: 0 },
    { month: 'Jun', revenue: 0, attributed: 0 },
  ];

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillAttributed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#6366f1"
            fill="url(#fillRevenue)"
            strokeWidth={2}
            name="Total Revenue"
          />
          <Area
            type="monotone"
            dataKey="attributed"
            stroke="#10b981"
            fill="url(#fillAttributed)"
            strokeWidth={2}
            name="Attributed Revenue"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
