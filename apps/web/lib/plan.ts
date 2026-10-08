import { sessionDate, type MesocycleDetail, type SessionDetail, type WeekDetail } from '@mesocycle/shared';

// Which week the read-only plan opens on: the first week with a workout today or later. When
// every workout is in the past it shows the last week; numbered cycles (no dates) start at Week 1.
export function initialWeek(detail: Pick<MesocycleDetail, 'weeks'>, today: string): number {
  const dated = detail.weeks.filter((week) => week.sessions.some((s) => s.scheduled_date !== null));
  if (dated.length === 0) return detail.weeks[0]?.week_number ?? 1;
  const upcoming = dated.find((week) => week.sessions.some((s) => s.scheduled_date !== null && s.scheduled_date >= today));
  return (upcoming ?? dated[dated.length - 1]!).week_number;
}

export type PlanDay =
  | { kind: 'workout'; dayId: string; name: string; date: string | null; session: SessionDetail }
  | { kind: 'rest'; dayId: string; name: string; date: string | null };

// Every day of the cycle for one week, in order: training days with their workout, and rest days
// (which have no workout) so the plan shows when to rest. Mon-Sun cycles get each day's date.
export function planDays(detail: Pick<MesocycleDetail, 'days' | 'schedule_mode' | 'start_date'>, week: WeekDetail): PlanDay[] {
  return detail.days.map((day, index) => {
    const session = week.sessions.find((s) => s.day_id === day.id);
    const date =
      session?.scheduled_date ??
      (detail.schedule_mode === 'calendar' && detail.start_date ? sessionDate(detail.start_date, week.week_number, day.weekday ?? index) : null);
    return session
      ? { kind: 'workout', dayId: day.id, name: day.day_name, date, session }
      : { kind: 'rest', dayId: day.id, name: day.day_name, date };
  });
}

// Workouts completed or skipped, out of all workouts.
export function progress(detail: Pick<MesocycleDetail, 'weeks'>): { done: number; total: number } {
  const sessions = detail.weeks.flatMap((w) => w.sessions);
  return { done: sessions.filter((s) => s.status === 'completed' || s.status === 'skipped').length, total: sessions.length };
}
