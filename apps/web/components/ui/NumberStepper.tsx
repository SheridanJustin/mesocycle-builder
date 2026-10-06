type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

// +/- buttons keep the value inside [min, max]; keyboard users can tab to either button.
export function NumberStepper({ label, value, min, max, onChange }: Props) {
  const button =
    'grid h-7 w-5 place-items-center text-base leading-none text-graphite-200 hover:bg-graphite-700 hover:text-graphite-50 disabled:text-graphite-600 disabled:hover:bg-transparent';
  return (
    <div role="group" aria-label={label} className="inline-flex h-7 items-center overflow-hidden rounded-md border border-graphite-700 bg-graphite-950">
      <button type="button" aria-label={`Decrease ${label}`} className={button} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output aria-label={label} data-testid={`value-${label}`} className="w-5 text-center text-sm font-semibold tabular-nums">
        {value}
      </output>
      <button type="button" aria-label={`Increase ${label}`} className={button} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
