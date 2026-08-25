import type { DashboardChartPoint } from "@/lib/dashboardData";

const WIDTH = 600;
const HEIGHT = 180;
const PADDING = 24;

export function CallsChart({ data, secondaryLabel = "Citas agendadas" }: { data: DashboardChartPoint[]; secondaryLabel?: string }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.calls, d.secondary)));
  const groupWidth = (WIDTH - PADDING * 2) / data.length;
  const barWidth = groupWidth / 3;
  const chartHeight = HEIGHT - PADDING * 2;

  const barY = (value: number) => HEIGHT - PADDING - (value / max) * chartHeight;
  const barHeight = (value: number) => (value / max) * chartHeight;

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`Llamadas y ${secondaryLabel.toLowerCase()} en los últimos 7 días`}>
        {data.map((point, i) => {
          const groupX = PADDING + i * groupWidth;
          return (
            <g key={`${point.day}-${i}`}>
              <rect
                x={groupX + barWidth * 0.3}
                y={barY(point.calls)}
                width={barWidth}
                height={barHeight(point.calls)}
                rx={2}
                className="fill-primary/70"
              />
              <rect
                x={groupX + barWidth * 1.4}
                y={barY(point.secondary)}
                width={barWidth}
                height={barHeight(point.secondary)}
                rx={2}
                className="fill-primary"
              />
              <text
                x={groupX + groupWidth / 2}
                y={HEIGHT - 4}
                textAnchor="middle"
                className="fill-muted text-[10px] capitalize"
              >
                {point.day}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary/70" /> Llamadas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> {secondaryLabel}
        </span>
      </div>
    </div>
  );
}
