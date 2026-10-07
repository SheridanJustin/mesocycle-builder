// Calendar-date helpers for the UI. Dates are "YYYY-MM-DD" strings (no time zone).

// Today's date in the user's own time zone.
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const LONG = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const SHORT = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

// e.g. "Mon, Oct 5, 2026" (long) or "Mon, Oct 5" (short). Formatted in UTC so the day never shifts.
export function formatIsoDate(iso: string, style: 'long' | 'short' = 'long'): string {
  return (style === 'long' ? LONG : SHORT).format(new Date(`${iso}T00:00:00Z`));
}
