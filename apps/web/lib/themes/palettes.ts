import type { COLOR_MODES, THEME_PALETTES } from '@mesocycle/shared';

// Color palettes (SPEC 10.12). Components use five token scales (50-950) whose names come from the
// original palette: graphite = neutrals, aqua = accent, verdigris = secondary accent, shamrock =
// positive, snow = destructive. Each palette re-defines those scales for a dark and a light mode;
// `pnpm --filter @mesocycle/web themes` writes them to app/themes.css. Scales are generated in OKLCH
// (perceptual lightness steps) and clipped to sRGB, so every palette has the same contrast structure.

export type PaletteId = (typeof THEME_PALETTES)[number];
export type ColorMode = (typeof COLOR_MODES)[number];
export type ScaleName = 'graphite' | 'aqua' | 'verdigris' | 'shamrock' | 'snow';
export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Step = (typeof STEPS)[number];
export type Scale = Record<Step, string>;
export type Scales = Record<ScaleName, Scale>;

type Hue = { h: number; c: number };

export type PaletteSpec = {
  id: PaletteId;
  name: string;
  description: string;
  // The mode it was designed for; picking the palette switches to it (the other mode stays available).
  defaultMode: ColorMode;
  neutral: Hue;
  accent: Hue;
  secondary: Hue;
  danger: Hue;
};

const SUCCESS: Hue = { h: 150, c: 0.17 };

export const PALETTES: readonly PaletteSpec[] = [
  {
    id: 'graphite',
    name: 'Graphite & Aqua',
    description: 'The original: warm graphite with an electric aqua accent.',
    defaultMode: 'dark',
    neutral: { h: 320, c: 0.008 },
    accent: { h: 205, c: 0.16 },
    secondary: { h: 182, c: 0.13 },
    danger: { h: 20, c: 0.07 },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep navy with a bright blue accent.',
    defaultMode: 'dark',
    neutral: { h: 250, c: 0.035 },
    accent: { h: 252, c: 0.17 },
    secondary: { h: 210, c: 0.12 },
    danger: { h: 18, c: 0.12 },
  },
  {
    id: 'indigo',
    name: 'Indigo Night',
    description: 'Inky violet greys with an indigo accent and magenta highlights.',
    defaultMode: 'dark',
    neutral: { h: 285, c: 0.032 },
    accent: { h: 285, c: 0.18 },
    secondary: { h: 330, c: 0.14 },
    danger: { h: 18, c: 0.12 },
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Soft charcoal with a rose-pink accent.',
    defaultMode: 'dark',
    neutral: { h: 350, c: 0.018 },
    accent: { h: 355, c: 0.17 },
    secondary: { h: 300, c: 0.12 },
    danger: { h: 22, c: 0.12 },
  },
  {
    id: 'plum',
    name: 'Plum & Sand',
    description: 'Warm sand and paper whites with a plum accent.',
    defaultMode: 'light',
    neutral: { h: 75, c: 0.018 },
    accent: { h: 320, c: 0.15 },
    secondary: { h: 195, c: 0.1 },
    danger: { h: 22, c: 0.12 },
  },
  {
    id: 'frost',
    name: 'Frost',
    description: 'Cool, airy greys with a teal accent.',
    defaultMode: 'light',
    neutral: { h: 230, c: 0.015 },
    accent: { h: 190, c: 0.12 },
    secondary: { h: 262, c: 0.12 },
    danger: { h: 22, c: 0.12 },
  },
];

// The original dark palette, kept exactly as designed (it is also the @theme default in globals.css).
export const GRAPHITE_DARK: Scales = {
  graphite: scale(['#f3f2f3', '#e6e4e7', '#cdcace', '#b5afb6', '#9c959d', '#837a85', '#69626a', '#4f4950', '#343135', '#1a181b', '#121113']),
  snow: scale(['#f6eeee', '#eddede', '#dbbdbd', '#c99c9c', '#b87a7a', '#a65959', '#854747', '#633636', '#422424', '#211212', '#170c0c']),
  aqua: scale(['#e5fcff', '#ccfaff', '#99f5ff', '#66f0ff', '#33ebff', '#00e5ff', '#00b8cc', '#008a99', '#005c66', '#002e33', '#002024']),
  verdigris: scale(['#e9fcfa', '#d2f9f4', '#a6f2e9', '#79ecde', '#4ce6d4', '#20dfc9', '#19b3a1', '#138678', '#0d5950', '#062d28', '#041f1c']),
  shamrock: scale(['#e8fdf1', '#d1fae2', '#a3f5c5', '#75f0a8', '#46ec8b', '#18e76e', '#13b958', '#0f8a42', '#0a5c2c', '#052e16', '#03200f']),
};

function scale(values: readonly string[]): Scale {
  return Object.fromEntries(STEPS.map((step, i) => [step, values[i] as string])) as Scale;
}

// OKLCH lightness per step. Dark mode: 50 is the lightest (text), 950 the darkest (page). Light mode
// mirrors it, so the same class (e.g. text-graphite-50 on bg-graphite-950) stays readable.
const LIGHTNESS: Record<ColorMode, Record<'neutral' | 'color', readonly number[]>> = {
  dark: {
    neutral: [0.965, 0.925, 0.85, 0.77, 0.7, 0.6, 0.5, 0.41, 0.32, 0.215, 0.175],
    color: [0.97, 0.94, 0.885, 0.83, 0.77, 0.72, 0.6, 0.5, 0.4, 0.29, 0.22],
  },
  light: {
    neutral: [0.2, 0.26, 0.33, 0.39, 0.46, 0.55, 0.66, 0.8, 0.9, 0.995, 0.965],
    color: [0.24, 0.29, 0.35, 0.42, 0.45, 0.5, 0.6, 0.72, 0.85, 0.935, 0.965],
  },
};

// ---- OKLCH -> sRGB ----

type Rgb = [number, number, number];

function oklchToLinear(l: number, c: number, h: number): Rgb {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: Rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

const toByte = (linear: number) => {
  const v = Math.min(1, Math.max(0, linear));
  const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(srgb * 255);
};

// The color at this lightness and hue with as much of the wanted chroma as sRGB can show.
export function oklchHex(l: number, c: number, h: number): string {
  let low = 0;
  let high = c;
  if (!inGamut(oklchToLinear(l, c, h))) {
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2;
      if (inGamut(oklchToLinear(l, mid, h))) low = mid;
      else high = mid;
    }
  } else {
    low = c;
  }
  return `#${oklchToLinear(l, low, h)
    .map((v) => toByte(v).toString(16).padStart(2, '0'))
    .join('')}`;
}

// Chroma peaks in the middle of the scale and fades towards white and black.
function chromaAt(l: number, peak: number): number {
  const t = (l - 0.62) / 0.45;
  return peak * Math.min(1, Math.max(0.12, 1 - t * t));
}

function generateScale(hue: Hue, lightness: readonly number[], flat = false): Scale {
  return scale(lightness.map((l) => oklchHex(l, flat ? hue.c : chromaAt(l, hue.c), hue.h)));
}

export function paletteScales(palette: PaletteSpec, mode: ColorMode): Scales {
  if (palette.id === 'graphite' && mode === 'dark') return GRAPHITE_DARK;
  const { neutral, color } = LIGHTNESS[mode];
  return {
    graphite: generateScale(palette.neutral, neutral, true),
    aqua: generateScale(palette.accent, color),
    verdigris: generateScale(palette.secondary, color),
    shamrock: generateScale(SUCCESS, color),
    snow: generateScale(palette.danger, color),
  };
}

export function findPalette(id: string): PaletteSpec {
  return PALETTES.find((p) => p.id === id) ?? (PALETTES[0] as PaletteSpec);
}

// ---- Contrast (WCAG 2) ----

export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// Volume status colors (SPEC 7.4): the same five hues in both modes; the dark mode values are the
// originals. bg = tint, border and bar = vivid, text = readable on the tint.
export const STATUS_COLORS: Record<ColorMode, Record<'amber' | 'lightgreen' | 'green' | 'orange' | 'red', Record<'bg' | 'border' | 'bar' | 'text', string>>> = {
  dark: {
    amber: { bg: '#33240a', border: '#f59e0b', bar: '#fbbf24', text: '#fde68a' },
    lightgreen: { bg: '#222f0b', border: '#a3e635', bar: '#bef264', text: '#ecfccb' },
    green: { bg: '#0b2a18', border: '#22c55e', bar: '#4ade80', text: '#bbf7d0' },
    orange: { bg: '#351a08', border: '#f97316', bar: '#fb923c', text: '#fed7aa' },
    red: { bg: '#370e0e', border: '#ef4444', bar: '#f87171', text: '#fecaca' },
  },
  light: {
    amber: { bg: '#fef3c7', border: '#d97706', bar: '#f59e0b', text: '#78350f' },
    lightgreen: { bg: '#ecfccb', border: '#65a30d', bar: '#84cc16', text: '#365314' },
    green: { bg: '#dcfce7', border: '#16a34a', bar: '#22c55e', text: '#14532d' },
    orange: { bg: '#ffedd5', border: '#ea580c', bar: '#f97316', text: '#7c2d12' },
    red: { bg: '#fee2e2', border: '#dc2626', bar: '#ef4444', text: '#7f1d1d' },
  },
};

// ---- CSS ----

const SCALE_NAMES: readonly ScaleName[] = ['graphite', 'aqua', 'verdigris', 'shamrock', 'snow'];

function declarations(scales: Scales): string {
  return SCALE_NAMES.flatMap((name) => STEPS.map((step) => `  --color-${name}-${step}: ${scales[name][step]};`)).join('\n');
}

export function themesCss(): string {
  const blocks: string[] = [
    '/* Generated by `pnpm --filter @mesocycle/web themes` from lib/themes/palettes.ts. Do not edit by hand. */',
    '/* Graphite dark is the @theme default in globals.css; every other palette/mode overrides the scales. */',
  ];
  for (const palette of PALETTES) {
    for (const mode of ['dark', 'light'] as const) {
      if (palette.id === 'graphite' && mode === 'dark') continue;
      blocks.push(`:root[data-palette='${palette.id}'][data-mode='${mode}'] {\n${declarations(paletteScales(palette, mode))}\n}`);
    }
  }
  const status = Object.entries(STATUS_COLORS.light)
    .flatMap(([color, parts]) => Object.entries(parts).map(([part, value]) => `  --color-status-${color}-${part}: ${value};`))
    .join('\n');
  blocks.push(`:root[data-mode='light'] {\n  color-scheme: light;\n${status}\n}`);
  return `${blocks.join('\n\n')}\n`;
}
