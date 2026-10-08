import type { MuscleGroup } from '@mesocycle/shared';

// Identity colors for muscle groups (the dot on each card). Decorative only: the group name is
// always printed next to it. Volume *status* colors are separate and fixed (SPEC 7.4).
export const GROUP_DOT: Record<MuscleGroup, string> = {
  chest: 'bg-aqua-400',
  back: 'bg-verdigris-400',
  shoulders: 'bg-shamrock-400',
  biceps: 'bg-aqua-200',
  triceps: 'bg-verdigris-200',
  quads: 'bg-shamrock-200',
  hamstrings: 'bg-snow-300',
  glutes: 'bg-snow-200',
  calves: 'bg-graphite-300',
  abs: 'bg-graphite-100',
};
