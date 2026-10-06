import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-aqua-500 text-graphite-950 hover:bg-aqua-400 disabled:bg-graphite-700 disabled:text-graphite-400',
  secondary: 'border border-graphite-700 bg-graphite-800 text-graphite-50 hover:bg-graphite-700 disabled:text-graphite-500',
  danger: 'bg-snow-500 text-white hover:bg-snow-400 disabled:bg-graphite-700 disabled:text-graphite-400',
  ghost: 'text-graphite-200 hover:bg-graphite-800 disabled:text-graphite-600',
};
const SIZE: Record<Size, string> = { sm: 'px-2 py-1 text-sm', md: 'px-3 py-2 text-sm', lg: 'px-4 py-3 text-base' };

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant = 'secondary', size = 'md', className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1 rounded-md font-medium disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    />
  );
}
