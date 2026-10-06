import { STEP_LABELS, type StepNumber } from '../../lib/builder/completion';

type Props = {
  current: StepNumber;
  completion: Record<StepNumber, boolean>;
  onSelect: (step: StepNumber) => void;
};

// Steps are always clickable (no hard gating); each shows a check once its completion rule is met.
export function Stepper({ current, completion, onSelect }: Props) {
  return (
    <nav aria-label="Builder steps">
      <ol className="flex gap-1 overflow-x-auto py-1">
        {STEP_LABELS.map((label, index) => {
          const step = (index + 1) as StepNumber;
          const isCurrent = step === current;
          const done = completion[step];
          return (
            <li key={label} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(step)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${
                  isCurrent ? 'bg-blue-700 text-white' : 'bg-white text-slate-800 hover:bg-slate-100'
                } border border-slate-300`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    done ? 'bg-green-700 text-white' : isCurrent ? 'bg-white text-blue-800' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {done ? '✓' : step}
                </span>
                {label}
                {done && <span className="sr-only">(complete)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
