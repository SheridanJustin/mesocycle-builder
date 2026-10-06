import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutosaveController, type SaveStatus } from './autosave';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(overrides: { save?: (v: number) => Promise<void>; validate?: (v: number) => string | null; isRetryable?: (e: unknown) => boolean } = {}) {
  const saved: number[] = [];
  const statuses: SaveStatus[] = [];
  const save = overrides.save ?? (async (value: number) => void saved.push(value));
  const controller = new AutosaveController<number>({
    save,
    onStatus: (s) => statuses.push(s),
    validate: overrides.validate,
    isRetryable: overrides.isRetryable,
  });
  return { controller, saved, statuses };
}

const last = (statuses: SaveStatus[]) => statuses[statuses.length - 1];

describe('AutosaveController', () => {
  it('debounces rapid changes into one save of the latest value after 800 ms', async () => {
    const { controller, saved, statuses } = setup();
    controller.schedule(1);
    await vi.advanceTimersByTimeAsync(500);
    controller.schedule(2);
    await vi.advanceTimersByTimeAsync(799);
    expect(saved).toEqual([]);
    expect(last(statuses)).toEqual({ kind: 'saving' });
    await vi.advanceTimersByTimeAsync(1);
    expect(saved).toEqual([2]);
    expect(last(statuses)).toEqual({ kind: 'saved' });
  });

  it('serializes saves and sends a follow-up when edited mid-flight', async () => {
    let release: () => void = () => undefined;
    const calls: number[] = [];
    const { controller, statuses } = setup({
      save: (value) => {
        calls.push(value);
        return calls.length === 1 ? new Promise<void>((resolve) => (release = resolve)) : Promise.resolve();
      },
    });
    controller.schedule(1);
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toEqual([1]);

    controller.schedule(2);
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toEqual([1]); // still waiting on the first save

    release();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toEqual([1, 2]);
    expect(last(statuses)).toEqual({ kind: 'saved' });
  });

  it('keeps the value and retries with backoff after a retryable failure', async () => {
    let failures = 2;
    const saved: number[] = [];
    const { controller, statuses } = setup({
      save: async (value) => {
        if (failures-- > 0) throw new Error('offline');
        saved.push(value);
      },
    });
    controller.schedule(7);
    await vi.advanceTimersByTimeAsync(800);
    expect(last(statuses)).toEqual({ kind: 'error', message: 'offline', retrying: true });
    expect(controller.hasUnsavedChanges).toBe(true);

    await vi.advanceTimersByTimeAsync(1000); // first retry (1 s) fails again
    expect(saved).toEqual([]);
    await vi.advanceTimersByTimeAsync(2000); // second retry (2 s) succeeds
    expect(saved).toEqual([7]);
    expect(last(statuses)).toEqual({ kind: 'saved' });
    expect(controller.hasUnsavedChanges).toBe(false);
  });

  it('does not auto-retry non-retryable failures but allows a manual retry', async () => {
    let fail = true;
    const saved: number[] = [];
    const { controller, statuses } = setup({
      isRetryable: () => false,
      save: async (value) => {
        if (fail) throw new Error('bad request');
        saved.push(value);
      },
    });
    controller.schedule(3);
    await vi.advanceTimersByTimeAsync(800);
    expect(last(statuses)).toEqual({ kind: 'error', message: 'bad request', retrying: false });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(saved).toEqual([]);

    fail = false;
    controller.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(saved).toEqual([3]);
  });

  it('blocks invalid values locally without calling save', async () => {
    const { controller, saved, statuses } = setup({ validate: (v) => (v < 0 ? 'negative' : null) });
    controller.schedule(-1);
    await vi.advanceTimersByTimeAsync(800);
    expect(saved).toEqual([]);
    expect(last(statuses)).toEqual({ kind: 'error', message: 'negative', retrying: false });
    controller.schedule(1);
    await vi.advanceTimersByTimeAsync(800);
    expect(saved).toEqual([1]);
  });

  it('flush saves immediately and resolves true', async () => {
    const { controller, saved } = setup();
    controller.schedule(5);
    await expect(controller.flush()).resolves.toBe(true);
    expect(saved).toEqual([5]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(saved).toEqual([5]); // the debounce timer was cleared
  });

  it('flush waits for an in-flight save and picks up newer edits', async () => {
    let release: () => void = () => undefined;
    const calls: number[] = [];
    const { controller } = setup({
      save: (value) => {
        calls.push(value);
        return calls.length === 1 ? new Promise<void>((resolve) => (release = resolve)) : Promise.resolve();
      },
    });
    controller.schedule(1);
    await vi.advanceTimersByTimeAsync(800);
    controller.schedule(2);
    const flushed = controller.flush();
    release();
    await expect(flushed).resolves.toBe(true);
    expect(calls).toEqual([1, 2]);
  });

  it('flush resolves false when the save fails', async () => {
    const { controller } = setup({ isRetryable: () => false, save: async () => { throw new Error('nope'); } });
    controller.schedule(1);
    await expect(controller.flush()).resolves.toBe(false);
  });

  it('flush resolves true immediately when there is nothing to save', async () => {
    const { controller } = setup();
    await expect(controller.flush()).resolves.toBe(true);
  });

  it('stops everything after dispose', async () => {
    const { controller, saved } = setup();
    controller.schedule(1);
    controller.dispose();
    await vi.advanceTimersByTimeAsync(5000);
    expect(saved).toEqual([]);
    controller.schedule(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(saved).toEqual([]);
  });
});
