import { MUSCLES, type GroupVolumeSummary, type Muscle, type PriorityEntry, type VolumeSummary } from '@mesocycle/shared';
import { computeGroupVolume, computeVolume, type ExerciseInfo, type Landmarks, type Priorities, type SlotInput } from '@mesocycle/volume-engine';
import { prisma } from './db';

export async function loadLandmarks(): Promise<Landmarks> {
  const rows = await prisma.muscleLandmark.findMany();
  const byMuscle = new Map(rows.map((row) => [row.muscle, row]));
  const entries = MUSCLES.map((muscle) => {
    const row = byMuscle.get(muscle);
    if (!row) throw new Error(`Landmarks missing for ${muscle}. Run pnpm db:seed.`);
    return [muscle, { mv: row.mv, mev: row.mev, mavLow: row.mavLow, mavHigh: row.mavHigh, mrv: row.mrv }] as const;
  });
  return Object.fromEntries(entries) as Landmarks;
}

export function prioritiesFromEntries(entries: readonly PriorityEntry[]): Priorities {
  return Object.fromEntries(entries.map((entry) => [entry.muscle, entry.priority]));
}

export type VolumeInput = {
  slots: SlotInput[];
  exercises: Record<string, ExerciseInfo>;
  priorities: readonly PriorityEntry[];
  assignedMuscles: readonly Muscle[];
};

// The only place the web app calls the engine on the server (AGENTS.md rule 3).
export async function summarizeVolume(input: VolumeInput): Promise<VolumeSummary> {
  const landmarks = await loadLandmarks();
  return computeVolume(input.slots, input.exercises, landmarks, prioritiesFromEntries(input.priorities), {
    assignedMuscles: input.assignedMuscles,
  });
}

// Major-group volume, as the builder shows it (SPEC 7.6). Used for the lock-in warnings.
export async function summarizeGroupVolume(slots: SlotInput[], exercises: Record<string, ExerciseInfo>): Promise<GroupVolumeSummary> {
  return computeGroupVolume(slots, exercises, await loadLandmarks());
}
