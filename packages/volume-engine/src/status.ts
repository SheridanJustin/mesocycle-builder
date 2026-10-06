import { VOLUME_STATUS_COLOR, type Priority, type VolumeColor, type VolumeStatus } from '@mesocycle/shared';
import type { MuscleLandmarks } from './types';

export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

// SPEC 7.4. When mv == mev the MAINTENANCE range is empty, so t == mv is ABOVE_MEV or better.
export function volumeStatus(total: number, l: MuscleLandmarks): VolumeStatus {
  if (total < l.mv) return 'BELOW_MV';
  if (total < l.mev) return 'MAINTENANCE';
  if (total < l.mavLow) return 'ABOVE_MEV';
  if (total <= l.mavHigh) return 'MAV';
  if (total <= l.mrv) return 'HIGH';
  return 'EXCEEDS_MRV';
}

export function statusColor(status: VolumeStatus): VolumeColor {
  return VOLUME_STATUS_COLOR[status];
}

// SPEC 7.5. Priority only sets the target band; it never changes status or color.
export function targetBand(priority: Priority, l: MuscleLandmarks): { low: number; high: number } {
  const mavMid = (l.mavLow + l.mavHigh) / 2;
  switch (priority) {
    case 'focus':
      return { low: mavMid, high: l.mavHigh };
    case 'normal':
      return { low: l.mev, high: mavMid };
    case 'maintenance':
      return { low: l.mv, high: l.mev };
  }
}

const STATUS_MESSAGE: Record<VolumeStatus, string> = {
  BELOW_MV: 'Below maintenance volume.',
  MAINTENANCE: 'Maintaining only; below the minimum effective volume.',
  ABOVE_MEV: 'Growth starts here, but below the optimal range.',
  MAV: 'Within the productive range.',
  HIGH: 'Approaching the recoverable ceiling.',
  EXCEEDS_MRV: 'Exceeds maximum recoverable volume.',
};

const PRIORITY_LABEL: Record<Priority, string> = { focus: 'Focus', normal: 'Normal', maintenance: 'Maintenance' };

function formatSets(value: number): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text} ${value === 1 ? 'set' : 'sets'}`;
}

export function volumeMessage(
  status: VolumeStatus,
  total: number,
  priority: Priority,
  band: { low: number; high: number },
): string {
  const label = PRIORITY_LABEL[priority];
  if (total < band.low) {
    return `${STATUS_MESSAGE[status]} ${label} muscle is ${formatSets(roundToHalf(band.low - total))} under its target band.`;
  }
  if (total > band.high) {
    return `${STATUS_MESSAGE[status]} ${label} muscle is ${formatSets(roundToHalf(total - band.high))} over its target band.`;
  }
  return STATUS_MESSAGE[status];
}
