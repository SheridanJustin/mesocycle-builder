import { expect, type Locator, type Page } from '@playwright/test';

// "New mesocycle" creates an untitled Mon-Sun draft and opens the board. Returns its id.
export async function createMesocycleViaUi(page: Page): Promise<string> {
  await page.goto('/mesocycles');
  await page.getByRole('button', { name: 'New mesocycle' }).click();
  await page.waitForURL(/\/mesocycles\/[0-9a-f-]+\/build/);
  await expect(page.getByTestId('mesocycle-title')).toHaveText('Untitled block');
  return page.url().match(/\/mesocycles\/([0-9a-f-]+)\/build/)![1] as string;
}

export async function gotoTab(page: Page, label: 'Build' | 'Review') {
  await page.getByRole('navigation', { name: 'Builder tabs' }).getByRole('button', { name: label }).click();
}

// Waits until autosave has finished ("Saved" or "All changes saved").
export async function waitForSaved(page: Page) {
  await expect(page.getByTestId('save-indicator')).toHaveText(/Saved|All changes saved/);
}

export function column(page: Page, dayName: string) {
  return page.getByRole('region', { name: `${dayName} column` });
}

export function card(page: Page, dayName: string, exerciseName: string) {
  return column(page, dayName).getByRole('article', { name: exerciseName });
}

export async function columnNames(page: Page): Promise<string[]> {
  // After a reload the page shows "Loading…" first; wait for the board.
  await page.getByTestId('day-column').first().waitFor();
  const labels = await page.getByTestId('day-column').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
  return labels.map((label) => label.replace(/ column$/, ''));
}

// Opens a day's Add panel, ticks every named exercise (searching for each) and adds them in one go.
export async function addExercises(page: Page, dayName: string, names: string[]) {
  await column(page, dayName).getByRole('button', { name: `Add exercises to ${dayName}` }).click();
  const dialog = page.getByRole('dialog');
  for (const name of names) {
    await dialog.getByLabel('Search exercises').fill(name);
    await dialog.getByRole('checkbox', { name: new RegExp(`^${escapeRegExp(name)}`) }).check();
  }
  await dialog.getByRole('button', { name: names.length === 1 ? 'Add 1 exercise' : `Add ${names.length} exercises` }).click();
  await expect(dialog).toBeHidden();
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function openDayMenu(page: Page, dayName: string) {
  await column(page, dayName).getByRole('button', { name: `${dayName} menu` }).click();
  return page.getByRole('menu', { name: `${dayName} actions` });
}

// True when the page itself (not the board) scrolls sideways.
export async function pageScrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

// Press and hold a card's title, then drag with real mouse events (cards activate after a short hold).
export function grip(page: Page, dayName: string, exerciseName: string) {
  return card(page, dayName, exerciseName).getByRole('heading', { name: exerciseName });
}

export async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, opts: { release?: boolean } = {}) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.move(from.x + 4, from.y + 4, { steps: 2 });
  await page.mouse.move(to.x, to.y, { steps: 25 });
  if (opts.release !== false) await page.mouse.up();
}

export async function center(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element has no bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
