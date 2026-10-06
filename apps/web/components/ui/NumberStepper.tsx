type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

// +/- buttons keep the value inside [min, max]; keyboard users can tab to either button.
export function NumberStepper({ label, value, min, max, onChange }: Props) {
  const button = 'h-7 w-7 rounded border border-graphite-700 bg-graphite-800 text-base leading-none text-graphite-50 hover:bg-graphite-700 disabled:text-graphite-600';
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-1">
      <button type="button" aria-label={`Decrease ${label}`} className={button} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output aria-label={label} data-testid={`value-${label}`} className="w-6 text-center text-sm font-medium tabular-nums">
        {value}
      </output>
      <button type="button" aria-label={`Increase ${label}`} className={button} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
