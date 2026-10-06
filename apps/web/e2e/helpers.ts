import { expect, type Page } from '@playwright/test';

// Creates a mesocycle through the real form and lands on the builder.
export async function createMesocycleViaUi(page: Page, opts: { name: string; days?: number; weeks?: number }) {
  await page.goto('/mesocycles/new');
  await page.getByLabel('Name').fill(opts.name);
  if (opts.weeks) await page.getByLabel('Duration (weeks)').selectOption(String(opts.weeks));
  if (opts.days) await page.getByLabel('Training days per week').selectOption(String(opts.days));
  await page.getByRole('button', { name: 'Create and start building' }).click();
  await page.waitForURL(/\/mesocycles\/[0-9a-f-]+\/build/);
  await expect(page.getByTestId('mesocycle-title')).toHaveText(opts.name);
  return page.url().match(/\/mesocycles\/([0-9a-f-]+)\/build/)![1] as string;
}

export async function gotoStep(page: Page, label: string) {
  await page.getByRole('navigation', { name: 'Builder steps' }).getByRole('button', { name: new RegExp(label) }).click();
}

// Waits until autosave has finished ("Saved" or "All changes saved").
export async function waitForSaved(page: Page) {
  await expect(page.getByTestId('save-indicator')).toHaveText(/Saved|All changes saved/);
}

export function column(page: Page, dayName: string) {
  return page.getByRole('region', { name: `${dayName} column` });
}

// Assigns muscles on step 2, e.g. { 'Day 1': ['Chest', 'Triceps'] }, then opens the board (step 3).
export async function assignMuscles(page: Page, assignments: Record<string, string[]>) {
  await gotoStep(page, 'Muscles');
  for (const [day, muscles] of Object.entries(assignments)) {
    for (const muscle of muscles) await page.getByRole('button', { name: `${day}: ${muscle}`, exact: true }).click();
  }
  await gotoStep(page, 'Exercises');
}

// Adds an exercise to a section through the catalog side panel.
export async function addExercise(page: Page, dayName: string, muscle: string, search: string, exactName: string) {
  await column(page, dayName).getByRole('button', { name: `Add exercise to ${muscle}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Search exercises').fill(search);
  await dialog.getByRole('button', { name: new RegExp(`^${exactName}`) }).click();
  await expect(dialog).toBeHidden();
}

export function card(page: Page, dayName: string, exerciseName: string) {
  return column(page, dayName).getByRole('article', { name: exerciseName });
}

// True when the page itself (not the board) scrolls sideways.
export async function pageScrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}
