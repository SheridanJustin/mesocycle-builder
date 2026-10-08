-- A mesocycle can be paused: only one runs at a time (see the next migration).
ALTER TYPE "MesocycleStatus" ADD VALUE 'paused';
