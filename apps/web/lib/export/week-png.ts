import { estimateSessionMinutes } from '@mesocycle/shared';
import type { BuilderState } from '../builder/types';

// "Export week as PNG": the schedule as one plain week (no mesocycle progression), drawn on a
// canvas so it needs no extra library. Layout is a pure function of the data and a text-measuring
// function, so it can be unit tested; drawing and downloading need a browser.

export type WeekImageDay = { name: string; minutes: number; exercises: { name: string; detail: string }[] };
export type Measure = (text: string, font: string) => number;

export function weekImageDays(state: BuilderState, opts: { showRir: boolean } = { showRir: true }): WeekImageDay[] {
  return state.days.map((day) => ({
    name: day.name,
    minutes: estimateSessionMinutes(day.slots.map((slot) => ({ sets: slot.sets, movementType: slot.exercise.movement_type }))),
    exercises: day.slots.map((slot) => ({
      name: slot.exercise.name,
      detail: `${slot.sets} sets × ${slot.repMin}–${slot.repMax} reps${opts.showRir ? ` · RIR ${slot.rir}` : ''}`,
    })),
  }));
}

const FONT_FAMILY = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONTS = {
  title: `700 26px ${FONT_FAMILY}`,
  subtitle: `400 14px ${FONT_FAMILY}`,
  day: `700 17px ${FONT_FAMILY}`,
  meta: `500 12px ${FONT_FAMILY}`,
  exercise: `600 14px ${FONT_FAMILY}`,
  detail: `400 12px ${FONT_FAMILY}`,
  footer: `400 11px ${FONT_FAMILY}`,
};

const MARGIN = 32;
const COLUMN = 210;
const GAP = 14;
const PAD = 14;
const HEADER = 92;
const FOOTER = 34;
const MIN_WIDTH = 640;
const LINE = { day: 22, meta: 18, exercise: 18, detail: 16 };

export type TextLine = { text: string; font: string; x: number; y: number; color: keyof typeof COLORS };
export type ColumnBox = { x: number; y: number; width: number; height: number; rest: boolean };
export type WeekLayout = { width: number; height: number; columns: ColumnBox[]; lines: TextLine[] };

export const COLORS = {
  background: '#121113',
  card: '#1a181b',
  border: '#343135',
  accent: '#00e5ff',
  title: '#f3f2f3',
  muted: '#9c959d',
  text: '#e6e4e7',
  detail: '#b5afb6',
  rest: '#837a85',
};

// Greedy word wrap. A single word wider than the column stays on its own line.
export function wrap(text: string, font: string, maxWidth: number, measure: Measure): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function layoutWeekImage(title: string, subtitle: string, days: WeekImageDay[], measure: Measure): WeekLayout {
  const columnsWidth = days.length * COLUMN + Math.max(0, days.length - 1) * GAP;
  const width = Math.max(MIN_WIDTH, MARGIN * 2 + columnsWidth);
  const left = (width - columnsWidth) / 2;
  const top = MARGIN + HEADER - 24;
  const inner = COLUMN - PAD * 2;
  const lines: TextLine[] = [
    { text: title, font: FONTS.title, x: MARGIN, y: MARGIN + 26, color: 'title' },
    { text: subtitle, font: FONTS.subtitle, x: MARGIN, y: MARGIN + 50, color: 'muted' },
  ];

  const heights = days.map((day, index) => {
    const x = left + index * (COLUMN + GAP) + PAD;
    let y = top + PAD + 17;
    lines.push({ text: day.name, font: FONTS.day, x, y, color: day.exercises.length ? 'title' : 'muted' });
    y += LINE.meta;
    if (day.exercises.length === 0) {
      lines.push({ text: 'REST DAY', font: FONTS.meta, x, y, color: 'rest' });
      return y - top + PAD;
    }
    lines.push({ text: `~${day.minutes} min · ${day.exercises.length} exercise${day.exercises.length === 1 ? '' : 's'}`, font: FONTS.meta, x, y, color: 'muted' });
    y += 10;
    for (const exercise of day.exercises) {
      for (const text of wrap(exercise.name, FONTS.exercise, inner, measure)) {
        y += LINE.exercise;
        lines.push({ text, font: FONTS.exercise, x, y, color: 'text' });
      }
      for (const text of wrap(exercise.detail, FONTS.detail, inner, measure)) {
        y += LINE.detail;
        lines.push({ text, font: FONTS.detail, x, y, color: 'detail' });
      }
      y += 10;
    }
    return y - top + PAD - 10;
  });

  // All columns share the tallest height so the week reads as one grid.
  const columnHeight = Math.max(110, ...heights);
  const columns = days.map((day, index) => ({
    x: left + index * (COLUMN + GAP),
    y: top,
    width: COLUMN,
    height: columnHeight,
    rest: day.exercises.length === 0,
  }));
  const height = top + columnHeight + FOOTER;
  lines.push({ text: 'Made with Mesocycle Builder', font: FONTS.footer, x: MARGIN, y: height - 14, color: 'rest' });
  return { width, height, columns, lines };
}

export function drawWeekImage(ctx: CanvasRenderingContext2D, layout: WeekLayout): void {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, layout.width, layout.height);
  for (const column of layout.columns) {
    ctx.beginPath();
    ctx.roundRect(column.x, column.y, column.width, column.height, 14);
    ctx.fillStyle = column.rest ? COLORS.background : COLORS.card;
    ctx.fill();
    ctx.strokeStyle = COLORS.border;
    ctx.setLineDash(column.rest ? [5, 4] : []);
    ctx.lineWidth = 1;
    ctx.stroke();
    if (!column.rest) {
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(column.x + 14, column.y, column.width - 28, 2);
    }
  }
  ctx.setLineDash([]);
  for (const line of layout.lines) {
    ctx.font = line.font;
    ctx.fillStyle = COLORS[line.color];
    ctx.fillText(line.text, line.x, line.y);
  }
}

export function fileNameFor(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'schedule'}-week.png`;
}

// Draws the week at 2x for crisp text and downloads it as a PNG.
export async function downloadWeekPng(state: BuilderState, title: string, opts: { showRir: boolean } = { showRir: true }): Promise<void> {
  const days = weekImageDays(state, opts);
  const training = days.filter((d) => d.exercises.length > 0).length;
  const subtitle = `Weekly schedule · ${training} training day${training === 1 ? '' : 's'} · ${days.length - training} rest day${days.length - training === 1 ? '' : 's'}`;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser');
  const measure: Measure = (text, font) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  };
  const layout = layoutWeekImage(title, subtitle, days, measure);
  const scale = 2;
  canvas.width = Math.ceil(layout.width * scale);
  canvas.height = Math.ceil(layout.height * scale);
  ctx.scale(scale, scale);
  drawWeekImage(ctx, layout);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not create the image');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileNameFor(title);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
