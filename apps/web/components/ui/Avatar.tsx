import type { Me } from '@mesocycle/shared';
import type { ReactNode } from 'react';

export type AvatarIcon = Me['avatar']['icon'];
export type AvatarColor = Me['avatar']['color'];

// Line icons on a 24-unit grid (stroke = currentColor), one per AVATAR_ICONS entry except 'initial'.
const ICONS: Record<Exclude<AvatarIcon, 'initial'>, ReactNode> = {
  dumbbell: <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />,
  kettlebell: (
    <>
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="M9 9.5V7a3 3 0 0 1 6 0v2.5" />
    </>
  ),
  flame: <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1.5 1 2.5 2.5 3 4 .5-2 0-5 0-7z" />,
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7z" />,
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z" />,
  mountain: <path d="m3 19 6-10 4 6 2-3 6 7H3z" />,
  leaf: (
    <>
      <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z" />
      <path d="m5 19 8-8" />
    </>
  ),
  crown: <path d="m4 8 4 4 4-6 4 6 4-4-2 10H6L4 8z" />,
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
};

export const AVATAR_ICON_LABEL: Record<AvatarIcon, string> = {
  initial: 'Initial',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  flame: 'Flame',
  bolt: 'Lightning bolt',
  heart: 'Heart',
  star: 'Star',
  mountain: 'Mountain',
  leaf: 'Leaf',
  crown: 'Crown',
  trophy: 'Trophy',
  sun: 'Sun',
  moon: 'Moon',
};

// Gradients from the palette tokens, so every palette and light/dark mode restyles them.
export const AVATAR_BACKGROUND: Record<AvatarColor, string> = {
  aqua: 'bg-gradient-to-br from-aqua-400 to-verdigris-600',
  verdigris: 'bg-gradient-to-br from-verdigris-300 to-verdigris-600',
  shamrock: 'bg-gradient-to-br from-shamrock-300 to-shamrock-600',
  snow: 'bg-gradient-to-br from-snow-300 to-snow-600',
  graphite: 'bg-gradient-to-br from-graphite-200 to-graphite-500',
};

export const AVATAR_COLOR_LABEL: Record<AvatarColor, string> = {
  aqua: 'Aqua',
  verdigris: 'Teal',
  shamrock: 'Green',
  snow: 'Red',
  graphite: 'Grey',
};

const SIZE = {
  sm: { box: 'h-8 w-8 text-sm', icon: 'h-4 w-4' },
  md: { box: 'h-11 w-11 text-lg', icon: 'h-6 w-6' },
  lg: { box: 'h-16 w-16 text-2xl', icon: 'h-8 w-8' },
} as const;

type Props = { icon: AvatarIcon; color: AvatarColor; name: string; size?: keyof typeof SIZE; className?: string };

// The profile avatar (SPEC decision 22). Decorative: the name is always shown or labelled nearby.
export function Avatar({ icon, color, name, size = 'md', className = '' }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      data-testid="avatar"
      data-icon={icon}
      className={`grid shrink-0 place-items-center rounded-full font-bold text-graphite-950 ${AVATAR_BACKGROUND[color]} ${SIZE[size].box} ${className}`}
    >
      {icon === 'initial' ? (
        initial
      ) : (
        <svg viewBox="0 0 24 24" className={`${SIZE[size].icon} fill-none stroke-current`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[icon]}
        </svg>
      )}
    </span>
  );
}
