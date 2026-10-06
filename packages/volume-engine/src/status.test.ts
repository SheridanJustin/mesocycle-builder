import { describe, expect, it } from 'vitest';
import { LANDMARKS } from './test-fixtures';
import { roundToHalf, statusColor, targetBand, volumeMessage, volumeStatus } from './status';

const chest = LANDMARKS.chest; // mv 8, mev 10, mav 12-20, mrv 22

describe('volumeStatus boundaries (chest)', () => {
  it.each([
    [7, 'BELOW_MV'], // mv - 1
    [8, 'MAINTENANCE'], // mv
    [9, 'MAINTENANCE'], // mev - 1
    [10, 'ABOVE_MEV'], // mev
    [11, 'ABOVE_MEV'], // mav_low - 1
    [12, 'MAV'], // mav_low
    [20, 'MAV'], // mav_high
    [21, 'HIGH'], // mav_high + 1
    [22, 'HIGH'], // mrv
    [23, 'EXCEEDS_MRV'], // mrv + 1
  ] as const)('%s sets -> %s', (total, expected) => {
    expect(volumeStatus(total, chest)).toBe(expected);
  });

  it('handles fractional totals at the boundaries', () => {
    expect(volumeStatus(7.5, chest)).toBe('BELOW_MV');
    expect(volumeStatus(9.5, chest)).toBe('MAINTENANCE');
    expect(volumeStatus(22.5, chest)).toBe('EXCEEDS_MRV');
  });
});

describe('volumeStatus when mv == mev', () => {
  const forearms = LANDMARKS.forearms; // mv 2, mev 2, mav_low 8
  const traps = LANDMARKS.traps; // mv 0, mev 0, mav_low 12

  it('treats t == mv as ABOVE_MEV, never MAINTENANCE', () => {
    expect(volumeStatus(2, forearms)).toBe('ABOVE_MEV');
    expect(volumeStatus(0, traps)).toBe('ABOVE_MEV');
  });

  it('still reports BELOW_MV under mv', () => {
    expect(volumeStatus(1, forearms)).toBe('BELOW_MV');
  });
});

describe('statusColor (SPEC 7.4)', () => {
  it.each([
    ['BELOW_MV', 'amber'],
    ['MAINTENANCE', 'amber'],
    ['ABOVE_MEV', 'lightgreen'],
    ['MAV', 'green'],
    ['HIGH', 'orange'],
    ['EXCEEDS_MRV', 'red'],
  ] as const)('%s -> %s', (status, color) => {
    expect(statusColor(status)).toBe(color);
  });
});

describe('targetBand (SPEC 7.5)', () => {
  it('focus is the upper half of MAV', () => {
    expect(targetBand('focus', chest)).toEqual({ low: 16, high: 20 });
  });

  it('normal runs from MEV to the MAV midpoint', () => {
    expect(targetBand('normal', chest)).toEqual({ low: 10, high: 16 });
  });

  it('maintenance runs from MV to MEV', () => {
    expect(targetBand('maintenance', chest)).toEqual({ low: 8, high: 10 });
  });

  it('keeps a fractional midpoint', () => {
    expect(targetBand('focus', { mv: 0, mev: 0, mavLow: 5, mavHigh: 8, mrv: 10 })).toEqual({ low: 6.5, high: 8 });
  });
});

describe('volumeMessage', () => {
  const band = { low: 16, high: 20 };

  it('uses only the status text inside the band', () => {
    expect(volumeMessage('MAV', 18, 'focus', band)).toBe('Within the productive range.');
  });

  it('reports how far under the band a muscle is', () => {
    expect(volumeMessage('MAV', 12, 'focus', band)).toBe(
      'Within the productive range. Focus muscle is 4 sets under its target band.',
    );
  });

  it('uses the singular for one set and decimals for halves', () => {
    expect(volumeMessage('MAV', 15, 'focus', band)).toContain('is 1 set under');
    expect(volumeMessage('MAV', 15.5, 'focus', band)).toContain('is 0.5 sets under');
  });

  it('reports how far over the band a muscle is', () => {
    expect(volumeMessage('HIGH', 22, 'normal', { low: 10, high: 16 })).toBe(
      'Approaching the recoverable ceiling. Normal muscle is 6 sets over its target band.',
    );
  });

  it('labels maintenance muscles', () => {
    expect(volumeMessage('ABOVE_MEV', 11, 'maintenance', { low: 8, high: 10 })).toContain('Maintenance muscle is 1 set over');
  });
});

describe('roundToHalf', () => {
  it.each([
    [0, 0],
    [1.2, 1],
    [1.25, 1.5],
    [1.74, 1.5],
    [1.75, 2],
    [14, 14],
  ])('%s -> %s', (input, expected) => {
    expect(roundToHalf(input)).toBe(expected);
  });
});
