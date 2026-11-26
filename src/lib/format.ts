/** Date/number formatting helpers shared by the dashboard and editor. */

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["week", 1000 * 60 * 60 * 24 * 7],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
];

export function formatRelative(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diff = date.getTime() - now.getTime();
  const absolute = Math.abs(diff);

  if (absolute < 60_000) return "just now";

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (absolute >= ms) return formatter.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
