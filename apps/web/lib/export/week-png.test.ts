import { describe, expect, it } from 'vitest';
import { createSlot } from '../builder/reducer';
import { fileNameFor, layoutWeekImage, weekImageDays, wrap, type Measure, type WeekImageDay } from './week-png';

// 7 px per character, whatever the font.
const measure: Measure = (text) => text.length * 7;

const training = (name: string, count: number): WeekImageDay => ({
  name,
  minutes: 45,
  exercises: Array.from({ length: count }, (_, i) => ({ name: `Exercise ${i + 1}`, detail: '3 sets × 8–12 reps · RIR 2' })),
});
const rest = (name: string): WeekImageDay => ({ name, minutes: 5, exercises: [] });

describe('wrap', () => {
  it('breaks on words to fit the width', () => {
    expect(wrap('Chest-Supported Machine Row', 'f', 140, measure)).toEqual(['Chest-Supported', 'Machine Row']);
    expect(wrap('Cable Fly', 'f', 140, measure)).toEqual(['Cable Fly']);
    expect(wrap('Supercalifragilistic', 'f', 50, measure)).toEqual(['Supercalifragilistic']);
  });
});

describe('layoutWeekImage', () => {
  it('lays the days out side by side with equal heights', () => {
    const days = [training('Mon', 3), rest('Tue'), training('Wed', 5), rest('Thu'), training('Fri', 1), rest('Sat'), rest('Sun')];
    const layout = layoutWeekImage('Upper / Lower', 'Weekly schedule', days, measure);
    expect(layout.columns).toHaveLength(7);
    expect(layout.width).toBe(32 * 2 + 7 * 210 + 6 * 14);
    expect(new Set(layout.columns.map((c) => c.height)).size).toBe(1);
    expect(layout.columns.map((c) => c.rest)).toEqual([false, true, false, true, false, true, true]);
    for (let i = 1; i < 7; i++) expect(layout.columns[i]!.x).toBe(layout.columns[i - 1]!.x + 224);
    // Every exercise and both of its lines are drawn; rest days say so.
    expect(layout.lines.filter((l) => l.text.startsWith('Exercise'))).toHaveLength(9);
    expect(layout.lines.filter((l) => l.text === 'REST DAY')).toHaveLength(4);
    expect(layout.lines.every((l) => l.y < layout.height)).toBe(true);
  });

  it('keeps a minimum width and centres a short cycle', () => {
    const layout = layoutWeekImage('Two days', '', [training('Day 1', 2), rest('Day 2')], measure);
    expect(layout.width).toBe(640);
    const first = layout.columns[0]!;
    const second = layout.columns[1]!;
    expect(first.x).toBe(layout.width - (second.x + second.width));
  });

  it('grows with the longest day', () => {
    const short = layoutWeekImage('t', '', [training('Mon', 1)], measure);
    const long = layoutWeekImage('t', '', [training('Mon', 8)], measure);
    expect(long.height).toBeGreaterThan(short.height);
  });
});

describe('fileNameFor', () => {
  it('makes a safe file name', () => {
    expect(fileNameFor('Push / Pull / Legs')).toBe('push-pull-legs-week.png');
    expect(fileNameFor('???')).toBe('schedule-week.png');
  });
});

describe('weekImageDays', () => {
  const exercise = { id: 'e', name: 'Cable Fly', primary_muscle: 'chest' as const, secondary_muscles: [], equipment_type: 'cable' as const, movement_type: 'isolation' as const, is_custom: false };
  const state = { mode: 'relative' as const, priorities: {}, days: [{ id: 'd', name: 'Day 1', weekday: null, slots: [createSlot(exercise, 's')] }] };

  it('includes RIR unless it is switched off', () => {
    expect(weekImageDays(state)[0]!.exercises[0]!.detail).toBe('3 sets × 8–12 reps · RIR 3');
    expect(weekImageDays(state, { showRir: false })[0]!.exercises[0]!.detail).toBe('3 sets × 8–12 reps');
  });
});
