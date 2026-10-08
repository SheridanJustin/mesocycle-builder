import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { themesCss } from '../lib/themes/palettes';

// Writes app/themes.css from lib/themes/palettes.ts (cross-platform: run with tsx).
const target = join(__dirname, '../app/themes.css');
writeFileSync(target, themesCss());
console.log(`Wrote ${target}`);
