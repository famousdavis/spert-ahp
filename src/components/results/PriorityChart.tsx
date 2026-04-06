import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { StructuredItem } from '../../types/ahp';

interface PriorityChartProps {
  items: StructuredItem[];
  scores: number[];
  title?: string;
}

export default function PriorityChart({ items, scores, title }: PriorityChartProps) {
  if (!items || !scores || items.length === 0) return null;

  const data = items
    .map((item, i) => ({
      name: item.label,
      score: scores[i] ?? 0,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div>
      {title && <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 100, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
          <Bar dataKey="score" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
