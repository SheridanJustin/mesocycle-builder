// Lock-in rules (SPEC 9): which weeks a mesocycle has, the per-week targets of every exercise,
// and the calendar dates of its workouts. Pure functions, shared by the server (generation) and
// the browser (previews).

export type SlotTargets = { sets: number; repMin: number; repMax: number; rir: number; weight: number | null };

export interface ProgressionStrategy {
  apply(slot: SlotTargets, weekNumber: number, totalWeeks: number, isDeload: boolean): SlotTargets;
}

// v1 (SPEC 9.3): sets, reps and weight stay as in Week 1 and RIR drops by one per week (never
// below 0). The deload week halves the sets (rounded up), takes 10% off the weight and goes back
// to the Week 1 RIR.
export const RirRampStrategy: ProgressionStrategy = {
  apply(slot, weekNumber, _totalWeeks, isDeload) {
    if (isDeload) {
      return {
        ...slot,
        sets: Math.ceil(slot.sets / 2),
        weight: slot.weight === null ? null : Math.round(slot.weight * 0.9 * 100) / 100,
      };
    }
    return { ...slot, rir: Math.max(0, slot.rir - (weekNumber - 1)) };
  },
};

export type WeekPlan = { weekNumber: number; isDeload: boolean };

export function planWeeks(durationWeeks: number, deloadFinalWeek: boolean): WeekPlan[] {
  return Array.from({ length: durationWeeks }, (_, i) => ({
    weekNumber: i + 1,
    isDeload: deloadFinalWeek && i + 1 === durationWeeks,
  }));
}

// Dates are calendar days ("YYYY-MM-DD") computed in UTC, so daylight-saving changes and the
// user's time zone can never shift a workout to another day.
function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function format(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return format(d);
}

// 0 = Monday ... 6 = Sunday (the app's weekday numbering).
export function weekdayOf(date: string): number {
  return (toUtc(date).getUTCDay() + 6) % 7;
}

export const isMonday = (date: string): boolean => weekdayOf(date) === 0;

// The Monday of the week that contains `date`.
export function mondayOf(date: string): string {
  return addDays(date, -weekdayOf(date));
}

// A Mon-Sun mesocycle starts on a Monday: week N's workout on `weekday` is that Monday
// + (N - 1) weeks + the weekday offset.
export function sessionDate(startMonday: string, weekNumber: number, weekday: number): string {
  return addDays(startMonday, (weekNumber - 1) * 7 + weekday);
}

// Start-date choices for the lock-in dialog: this week's Monday, then the next `count - 1` Mondays.
export function upcomingMondays(today: string, count: number): string[] {
  const first = mondayOf(today);
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}
