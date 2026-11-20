/** Parse a YYYY-MM-DD string as a *local* calendar date (never shifted by time zone). */
export function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const longFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const monthYearFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

export function formatDate(value: string): string {
  return longFmt.format(parseDate(value));
}

export function formatShortDate(value: string): string {
  return shortFmt.format(parseDate(value));
}

export function formatMonthYear(value: string): string {
  return monthYearFmt.format(new Date(value));
}

/** "Today", "Yesterday", or a formatted date. */
export function formatRelativeDate(value: string, today: string): string {
  const diff = Math.round((parseDate(today).getTime() - parseDate(value).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatDate(value);
}

export function formatRange(start: string, end: string): string {
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

export function formatMinutes(minutes: number | string | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes === "") return "—";
  const total = Number(minutes);
  if (total < 60) return `${trimNumber(total)} min`;
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "5.00" → "5", "42.50" → "42.5" */
export function trimNumber(value: number | string): string {
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
