import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayCount, WeekTrend } from "../../types";
import { formatDate, formatRange, formatShortDate, pluralize } from "../../utils/format";

const BERRY = "#752A45";
const BLUSH = "#E8C9BE";
const STONE = "#E9E5DF";
const MUTED = "#6B5D62";

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: MUTED, fontSize: 12 },
} as const;

function TooltipBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-stone bg-white px-3 py-2 text-sm shadow-lift">
      <p className="font-medium text-ink">{title}</p>
      {lines.map((l) => (
        <p key={l} className="text-ink-muted">
          {l}
        </p>
      ))}
    </div>
  );
}

/** Text alternative so the data is available without seeing the chart. */
function SrTable({ caption, rows }: { caption: string; rows: [string, string][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Period</th>
          <th scope="col">Workouts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b]) => (
          <tr key={a}>
            <td>{a}</td>
            <td>{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DailyActivityChart({ days, today, height = 200 }: { days: DayCount[]; today: string; height?: number }) {
  const max = Math.max(1, ...days.map((d) => d.workouts));
  return (
    <figure>
      <div aria-hidden style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={STONE} strokeDasharray="3 3" />
            <XAxis dataKey="weekday" {...axisProps} />
            <YAxis allowDecimals={false} domain={[0, Math.max(2, max)]} {...axisProps} width={40} />
            <Tooltip
              cursor={{ fill: "#F6EBE6" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as DayCount;
                return <TooltipBox title={formatDate(d.date)} lines={[pluralize(d.workouts, "workout")]} />;
              }}
            />
            <Bar dataKey="workouts" radius={[8, 8, 2, 2]} maxBarSize={44} background={{ fill: "#FBF4F1", radius: 8 }}>
              {days.map((d) => (
                <Cell key={d.date} fill={d.date === today ? BERRY : d.workouts ? "#9A4D68" : BLUSH} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SrTable caption="Workouts per day" rows={days.map((d) => [formatDate(d.date), String(d.workouts)])} />
    </figure>
  );
}

export function ConsistencyChart({ weeks, target, height = 240 }: { weeks: WeekTrend[]; target: number; height?: number }) {
  const data = weeks.map((w) => ({ ...w, label: formatShortDate(w.week_start) }));
  const max = Math.max(target, ...weeks.map((w) => w.workouts));
  return (
    <figure>
      <div aria-hidden style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={STONE} strokeDasharray="3 3" />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={8} />
            <YAxis allowDecimals={false} domain={[0, max + 1]} {...axisProps} width={40} />
            <Tooltip
              cursor={{ fill: "#F6EBE6" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const w = payload[0].payload as WeekTrend;
                return (
                  <TooltipBox
                    title={`Week of ${formatRange(w.week_start, w.week_end)}`}
                    lines={[pluralize(w.workouts, "workout"), pluralize(w.logged_exercises, "logged exercise")]}
                  />
                );
              }}
            />
            <ReferenceLine
              y={target}
              stroke="#B38D82"
              strokeDasharray="5 4"
              label={{ value: `Goal ${target}`, position: "insideTopRight", fill: MUTED, fontSize: 11 }}
            />
            <Bar dataKey="workouts" radius={[8, 8, 2, 2]} maxBarSize={40}>
              {data.map((w) => (
                <Cell key={w.week_start} fill={w.workouts >= target ? BERRY : w.workouts ? "#B5728A" : BLUSH} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SrTable
        caption="Workouts per week"
        rows={weeks.map((w) => [`Week of ${formatRange(w.week_start, w.week_end)}`, String(w.workouts)])}
      />
    </figure>
  );
}
