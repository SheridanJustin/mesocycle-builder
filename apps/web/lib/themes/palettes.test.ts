import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COLOR_MODES, THEME_PALETTES } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { contrast, GRAPHITE_DARK, oklchHex, PALETTES, paletteScales, STATUS_COLORS, themesCss } from './palettes';

const AA = 4.5;

describe('palettes', () => {
  it('match the ids the API accepts', () => {
    expect(PALETTES.map((p) => p.id)).toEqual([...THEME_PALETTES]);
  });

  it('app/themes.css is up to date (run `pnpm --filter @mesocycle/web themes` after editing palettes.ts)', () => {
    expect(readFileSync(join(__dirname, '../../app/themes.css'), 'utf8')).toBe(themesCss());
  });

  it('keep the original graphite dark palette exactly', () => {
    expect(paletteScales(PALETTES[0]!, 'dark')).toBe(GRAPHITE_DARK);
  });

  it('convert OKLCH to sRGB (and clip to the gamut)', () => {
    expect(oklchHex(1, 0, 0)).toBe('#ffffff');
    expect(oklchHex(0, 0, 0)).toBe('#000000');
    expect(oklchHex(0.628, 0.2577, 29.23)).toBe('#ff0000');
    expect(oklchHex(0.7, 0.4, 150)).toMatch(/^#[0-9a-f]{6}$/);
  });

  // The pairs the components actually use, in every palette and mode (WCAG AA for text).
  for (const palette of PALETTES) {
    for (const mode of COLOR_MODES) {
      it(`${palette.id} ${mode}: text, muted text, accents and buttons are readable`, () => {
        const s = paletteScales(palette, mode);
        const surfaces = [s.graphite[950], s.graphite[900]];
        for (const bg of surfaces) {
          expect(contrast(s.graphite[50], bg), 'text').toBeGreaterThanOrEqual(7);
          expect(contrast(s.graphite[300], bg), 'secondary text').toBeGreaterThanOrEqual(AA);
          expect(contrast(s.graphite[400], bg), 'muted text').toBeGreaterThanOrEqual(AA);
          expect(contrast(s.aqua[300], bg), 'accent text').toBeGreaterThanOrEqual(AA);
        }
        expect(contrast(s.graphite[200], s.graphite[800]), 'text on chips').toBeGreaterThanOrEqual(AA);
        expect(contrast(s.graphite[950], s.aqua[500]), 'primary button').toBeGreaterThanOrEqual(AA);
        expect(contrast(s.graphite[950], s.aqua[400]), 'primary button hover').toBeGreaterThanOrEqual(AA);
        expect(contrast(s.snow[100], s.snow[900]), 'error message').toBeGreaterThanOrEqual(AA);
        expect(contrast(s.shamrock[300], s.shamrock[950]), 'success badge').toBeGreaterThanOrEqual(AA);
        expect(contrast(s.verdigris[200], s.verdigris[950]), 'paused banner').toBeGreaterThanOrEqual(AA);
      });
    }
  }

  for (const mode of COLOR_MODES) {
    it(`${mode}: status text is readable on its tint`, () => {
      for (const parts of Object.values(STATUS_COLORS[mode])) {
        expect(contrast(parts.text, parts.bg)).toBeGreaterThanOrEqual(AA);
      }
    });
  }
});
