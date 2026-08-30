"use client";

// Validated 3-slot categorical palette (blue / orange / aqua) — see the
// dataviz skill's palette.md. This exact set passes all-pairs CVD and
// normal-vision separation checks, so any assignment of these three hues to
// the three series below is safe; only the hex values themselves matter.
export const CHART_COLORS = {
  completed: "#1baf7a",
  inProgress: "#2a78d6",
  backlog: "#eb6834",
};

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  segments,
  total,
  centerLabel,
}: {
  segments: DonutSegment[];
  total: number;
  centerLabel: string;
}) {
  const size = 176;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = total > 0 ? 5 : 0;

  let cumulative = 0;
  const arcs = segments.map((s) => {
    const fraction = total > 0 ? s.value / total : 0;
    const rawLength = fraction * circumference;
    const length = Math.max(rawLength - gap, 0);
    const dashoffset = -cumulative;
    cumulative += rawLength;
    return { ...s, length, dashoffset };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f0fa" strokeWidth={strokeWidth} />
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {total === 0
              ? null
              : arcs.map((a) => (
                  <circle
                    key={a.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={a.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${a.length} ${circumference - a.length}`}
                    strokeDashoffset={a.dashoffset}
                  />
                ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-slate-400">{centerLabel}</span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold text-slate-800">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface WeekBarDatum {
  label: string;
  value: number;
  isToday: boolean;
}

export function WeekBarChart({ data }: { data: WeekBarDatum[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-40 items-end justify-between gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">{d.value > 0 ? d.value : ""}</span>
          <div className="flex h-24 w-full items-end justify-center">
            <div
              className={`w-4 rounded-t-full transition-all ${d.isToday ? "bg-[#eb6834]" : "bg-[#2a78d6]"} ${
                d.value === 0 ? "opacity-20" : ""
              }`}
              style={{ height: `${d.value === 0 ? 4 : Math.max((d.value / max) * 100, 8)}%` }}
            />
          </div>
          <span className={`text-[11px] ${d.isToday ? "font-semibold text-slate-700" : "text-slate-400"}`}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
