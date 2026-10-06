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
