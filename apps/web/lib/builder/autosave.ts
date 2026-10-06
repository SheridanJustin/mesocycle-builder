export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string; retrying: boolean };

export type AutosaveOptions<T> = {
  save: (value: T) => Promise<void>;
  onStatus: (status: SaveStatus) => void;
  // Returns an error message when the value must not be sent (e.g. fails local validation).
  validate?: (value: T) => string | null;
  // Decides whether a failed save is worth retrying with backoff.
  isRetryable?: (error: unknown) => boolean;
  debounceMs?: number;
  retryDelaysMs?: number[];
};

const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000, 8000, 15_000, 30_000];

// Debounced, serialized autosave with retry/backoff. Local state is never discarded on failure:
// the latest value stays dirty until a save succeeds (SPEC 6 decision 6, 10.9).
export class AutosaveController<T> {
  private latest: T | undefined;
  private dirty = false;
  private inflight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private failed = false;
  private disposed = false;

  constructor(private readonly options: AutosaveOptions<T>) {}

  get hasUnsavedChanges(): boolean {
    return this.dirty || this.inflight !== null;
  }

  schedule(value: T): void {
    if (this.disposed) return;
    this.latest = value;
    this.dirty = true;
    this.attempt = 0;
    this.failed = false;
    this.options.onStatus({ kind: 'saving' });
    this.arm(this.options.debounceMs ?? 800);
  }

  // Saves right away and resolves true only if everything is saved.
  async flush(): Promise<boolean> {
    this.clearTimer();
    while (!this.disposed && (this.dirty || this.inflight)) {
      if (this.inflight) await this.inflight;
      else await this.run();
      if (this.failed) return false;
    }
    return !this.failed;
  }

  retry(): void {
    if (this.disposed || !this.dirty) return;
    this.attempt = 0;
    this.failed = false;
    this.options.onStatus({ kind: 'saving' });
    this.arm(0);
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
  }

  private arm(delayMs: number): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.run();
    }, delayMs);
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private run(): Promise<void> {
    if (this.inflight) return this.inflight;
    if (!this.dirty || this.latest === undefined) return Promise.resolve();

    const value = this.latest;
    const invalid = this.options.validate?.(value);
    if (invalid) {
      this.failed = true;
      this.options.onStatus({ kind: 'error', message: invalid, retrying: false });
      return Promise.resolve();
    }

    this.dirty = false;
    this.options.onStatus({ kind: 'saving' });
    this.inflight = this.options
      .save(value)
      .then(() => {
        this.attempt = 0;
        this.failed = false;
        if (this.disposed) return;
        if (this.dirty) this.arm(0);
        else this.options.onStatus({ kind: 'saved' });
      })
      .catch((error: unknown) => {
        // Keep the latest value dirty: it was never saved.
        this.dirty = true;
        this.failed = true;
        if (this.disposed) return;
        const retryable = this.options.isRetryable?.(error) ?? true;
        const delays = this.options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS;
        const message = error instanceof Error ? error.message : 'Save failed';
        this.options.onStatus({ kind: 'error', message, retrying: retryable });
        if (retryable) {
          const delay = delays[Math.min(this.attempt, delays.length - 1)] ?? 30_000;
          this.attempt += 1;
          this.failed = false;
          this.arm(delay);
        }
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }
}
