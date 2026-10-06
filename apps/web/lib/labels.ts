import type { Equipment, Muscle, MuscleGroup, VolumeStatus } from '@mesocycle/shared';

function humanize(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const muscleLabel = (muscle: Muscle): string => humanize(muscle);
export const groupLabel = (group: MuscleGroup): string => humanize(group);
export const equipmentLabel = (equipment: Equipment): string => humanize(equipment);

// Text for every color state, so color is never the only signal (SPEC 10.5).
export const STATUS_LABEL: Record<VolumeStatus, string> = {
  BELOW_MV: 'Below MV',
  MAINTENANCE: 'Maintenance',
  ABOVE_MEV: 'Above MEV',
  MAV: 'In MAV',
  HIGH: 'High',
  EXCEEDS_MRV: 'Over MRV',
};

export const STATUS_DESCRIPTION: Record<VolumeStatus, string> = {
  BELOW_MV: 'warning: below maintenance volume',
  MAINTENANCE: 'maintaining only, below the minimum effective volume',
  ABOVE_MEV: 'growth starts, sub-optimal',
  MAV: 'ideal zone',
  HIGH: 'approaching the ceiling',
  EXCEEDS_MRV: 'hard warning: exceeds maximum recoverable volume',
};
