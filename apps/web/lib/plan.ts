import type { MesocycleDetail } from '@mesocycle/shared';

// Which week the read-only plan opens on: the first week with a workout today or later. When
// every workout is in the past it shows the last week; numbered cycles (no dates) start at Week 1.
export function initialWeek(detail: Pick<MesocycleDetail, 'weeks'>, today: string): number {
  const dated = detail.weeks.filter((week) => week.sessions.some((s) => s.scheduled_date !== null));
  if (dated.length === 0) return detail.weeks[0]?.week_number ?? 1;
  const upcoming = dated.find((week) => week.sessions.some((s) => s.scheduled_date !== null && s.scheduled_date >= today));
  return (upcoming ?? dated[dated.length - 1]!).week_number;
}
