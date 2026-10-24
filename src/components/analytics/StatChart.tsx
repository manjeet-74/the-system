import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { StatSnapshot } from '../../hooks/useAnalytics';

const STAT_LINES = [
  { key: 'str', label: 'STR', color: '#f87171' },
  { key: 'int_', label: 'INT', color: '#38bdf8' },
  { key: 'vit', label: 'VIT', color: '#4ade80' },
  { key: 'sense', label: 'SENSE', color: '#c084fc' },
  { key: 'agi', label: 'AGI', color: '#fbbf24' },
];

interface StatChartProps {
  data: StatSnapshot[];
}

export function StatChart({ data }: StatChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-[#6d81a0] font-rajdhani text-sm">
        Need at least 2 days of data to show a trend line.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    date: d.recorded_at.split('T')[0],
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3fd6f5" strokeOpacity={0.05} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6d81a0', fontSize: 10, fontFamily: 'Rajdhani' }}
          tickLine={false}
          axisLine={{ stroke: '#6d81a0', strokeOpacity: 0.3 }}
        />
        <YAxis
          tick={{ fill: '#6d81a0', fontSize: 10, fontFamily: 'Rajdhani' }}
          tickLine={false}
          axisLine={{ stroke: '#6d81a0', strokeOpacity: 0.3 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0a0f1c',
            border: '1px solid rgba(63,214,245,0.3)',
            borderRadius: '6px',
            color: '#e6f1f7',
            fontFamily: 'Rajdhani',
          }}
        />
        <Legend
          wrapperStyle={{ color: '#6d81a0', fontFamily: 'Rajdhani', fontSize: 12 }}
        />
        {STAT_LINES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
