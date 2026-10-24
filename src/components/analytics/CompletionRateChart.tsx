import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { StatCompletionRate } from '../../hooks/useAnalytics';

const STAT_COLORS: Record<string, string> = {
  STR: '#f87171',
  INT: '#38bdf8',
  VIT: '#4ade80',
  SENSE: '#c084fc',
  AGI: '#fbbf24',
};

interface CompletionRateChartProps {
  data: StatCompletionRate[];
}

export function CompletionRateChart({ data }: CompletionRateChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[#6d81a0] font-rajdhani text-sm">
        No completion data yet.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    stat: d.stat,
    rate: Math.round(d.rate * 100),
    color: STAT_COLORS[d.stat] ?? '#3fd6f5',
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3fd6f5" strokeOpacity={0.05} />
        <XAxis
          dataKey="stat"
          tick={{ fill: '#6d81a0', fontSize: 11, fontFamily: 'Rajdhani' }}
          tickLine={false}
          axisLine={{ stroke: '#6d81a0', strokeOpacity: 0.3 }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#6d81a0', fontSize: 10, fontFamily: 'Rajdhani' }}
          tickLine={false}
          axisLine={{ stroke: '#6d81a0', strokeOpacity: 0.3 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, 'Completion Rate']}
          contentStyle={{
            backgroundColor: '#0a0f1c',
            border: '1px solid rgba(63,214,245,0.3)',
            borderRadius: '6px',
            color: '#e6f1f7',
            fontFamily: 'Rajdhani',
          }}
        />
        <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.stat} fill={entry.color} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
