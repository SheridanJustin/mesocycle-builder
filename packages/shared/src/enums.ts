import { z } from 'zod';
import {
  EQUIPMENT_TYPES,
  MESOCYCLE_STATUSES,
  MOVEMENT_TYPES,
  MUSCLE_GROUPS,
  MUSCLES,
  PRIORITIES,
  SCHEDULE_MODES,
  VOLUME_COLORS,
  VOLUME_STATUSES,
  WEIGHT_UNITS,
} from './constants';

export const MuscleSchema = z.enum(MUSCLES);
export const MuscleGroupSchema = z.enum(MUSCLE_GROUPS);
export const EquipmentSchema = z.enum(EQUIPMENT_TYPES);
export const MovementTypeSchema = z.enum(MOVEMENT_TYPES);
export const PrioritySchema = z.enum(PRIORITIES);
export const MesocycleStatusSchema = z.enum(MESOCYCLE_STATUSES);
export const ScheduleModeSchema = z.enum(SCHEDULE_MODES);
export const WeightUnitSchema = z.enum(WEIGHT_UNITS);
export const VolumeStatusSchema = z.enum(VOLUME_STATUSES);
export const VolumeColorSchema = z.enum(VOLUME_COLORS);

export type Muscle = z.infer<typeof MuscleSchema>;
export type MuscleGroup = z.infer<typeof MuscleGroupSchema>;
export type Equipment = z.infer<typeof EquipmentSchema>;
export type MovementType = z.infer<typeof MovementTypeSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type MesocycleStatus = z.infer<typeof MesocycleStatusSchema>;
export type ScheduleMode = z.infer<typeof ScheduleModeSchema>;
export type WeightUnit = z.infer<typeof WeightUnitSchema>;
export type VolumeStatus = z.infer<typeof VolumeStatusSchema>;
export type VolumeColor = z.infer<typeof VolumeColorSchema>;
