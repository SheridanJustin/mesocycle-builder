import { describe, expect, it } from 'vitest';
import { MAX_CYCLE_DAYS, MAX_REPS, MAX_RIR, MAX_SETS, MIN_REPS, MIN_RIR, MIN_SETS, WEEK_DAYS } from './constants';
import { findTemplate, MESOCYCLE_TEMPLATES } from './templates';

describe('MESOCYCLE_TEMPLATES', () => {
  it('has unique ids', () => {
    const ids = MESOCYCLE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(MESOCYCLE_TEMPLATES.map((t) => [t.id, t] as const))('%s fits the schedule rules', (_id, template) => {
    if (template.mode === 'calendar') expect(template.days).toHaveLength(WEEK_DAYS);
    expect(template.days.length).toBeLessThanOrEqual(MAX_CYCLE_DAYS);
    expect(template.days.some((day) => day.length > 0)).toBe(true);
    for (const slot of template.days.flat()) {
      expect(slot.sets).toBeGreaterThanOrEqual(MIN_SETS);
      expect(slot.sets).toBeLessThanOrEqual(MAX_SETS);
      expect(slot.repMin).toBeGreaterThanOrEqual(MIN_REPS);
      expect(slot.repMax).toBeLessThanOrEqual(MAX_REPS);
      expect(slot.repMin).toBeLessThanOrEqual(slot.repMax);
      expect(slot.rir).toBeGreaterThanOrEqual(MIN_RIR);
      expect(slot.rir).toBeLessThanOrEqual(MAX_RIR);
    }
  });

  it('finds a template by id', () => {
    expect(findTemplate('ppl-6')?.name).toBe('Push / Pull / Legs');
    expect(findTemplate('nope')).toBeUndefined();
  });
});
