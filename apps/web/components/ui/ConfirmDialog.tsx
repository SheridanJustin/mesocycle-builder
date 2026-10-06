import { Button } from './Button';
import { Dialog } from './Dialog';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <p className="text-sm text-graphite-200">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
