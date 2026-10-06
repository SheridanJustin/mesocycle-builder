import type { SaveStatus } from '../../lib/builder/autosave';
import { Button } from './Button';

type Props = { status: SaveStatus; onRetry: () => void };

export function SaveIndicator({ status, onRetry }: Props) {
  return (
    <div role="status" aria-live="polite" data-testid="save-indicator" className="flex items-center gap-2 text-sm">
      {status.kind === 'idle' && <span className="text-graphite-400">All changes saved</span>}
      {status.kind === 'saving' && <span className="text-graphite-300">Saving…</span>}
      {status.kind === 'saved' && <span className="text-shamrock-400">Saved</span>}
      {status.kind === 'error' && (
        <>
          <span className="text-snow-300">Save failed — {status.message}</span>
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
        </>
      )}
    </div>
  );
}
