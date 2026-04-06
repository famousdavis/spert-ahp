import {
  Radar,
  RadarChart as RadarChartBase,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { StructuredItem } from '../../types/ahp';

const VOTER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface VoterRadarChartProps {
  criteria: StructuredItem[];
  individualPriorities: Record<string, number[]>;
}

export default function VoterRadarChart({ criteria, individualPriorities }: VoterRadarChartProps) {
  if (!criteria || !individualPriorities) return null;

  const voterIds = Object.keys(individualPriorities);
  if (voterIds.length === 0) return null;

  const data = criteria.map((crit, i) => {
    const point: Record<string, string | number> = { criterion: crit.label };
    voterIds.forEach((userId) => {
      point[userId] = individualPriorities[userId]?.[i] ?? 0;
    });
    return point;
  });

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Voter Priority Comparison</h3>
      <ResponsiveContainer width="100%" height={350}>
        <RadarChartBase data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fontSize: 10 }} />
          {voterIds.map((userId, i) => (
            <Radar
              key={userId}
              name={userId}
              dataKey={userId}
              stroke={VOTER_COLORS[i % VOTER_COLORS.length]}
              fill={VOTER_COLORS[i % VOTER_COLORS.length]}
              fillOpacity={0.1}
            />
          ))}
          <Legend />
        </RadarChartBase>
      </ResponsiveContainer>
    </div>
  );
}
