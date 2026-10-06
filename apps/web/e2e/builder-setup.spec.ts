import { expect, test } from '@playwright/test';
import { createMesocycleViaUi, gotoStep, waitForSaved } from './helpers';

test('M4: create a draft, define days and muscle groups, reload and see everything restored', async ({ page }) => {
  await createMesocycleViaUi(page, { name: 'Setup Block', days: 3 });

  // Step 1: rename days, add one, remove one.
  await expect(page.getByLabel('Day 1 name')).toHaveValue('Day 1');
  await page.getByLabel('Day 1 name').fill('Push A');
  await page.getByLabel('Day 1 name').press('Enter');
  await page.getByLabel('Day 2 name').fill('Pull A');
  await page.getByLabel('Day 2 name').press('Enter');
  await page.getByRole('button', { name: 'Add day' }).click();
  await expect(page.getByLabel('Day 4 name')).toBeVisible();
  await page.getByRole('button', { name: 'Remove day 4' }).click();
  await expect(page.getByLabel('Day 4 name')).toHaveCount(0);

  // Step 2: assign muscles and set a priority.
  await gotoStep(page, 'Muscles');
  await page.getByRole('button', { name: 'Push A: Chest' }).click();
  await page.getByRole('button', { name: 'Push A: Triceps' }).click();
  await page.getByRole('button', { name: 'Pull A: Lats' }).click();
  await page.getByRole('button', { name: 'Day 3: Quads' }).click();
  await page.getByLabel('Chest', { exact: true }).selectOption('focus');
  await waitForSaved(page);

  // Stepper shows progress.
  const stepper = page.getByRole('navigation', { name: 'Builder steps' });
  await expect(stepper.getByRole('button', { name: /Schedule/ })).toContainText('(complete)');
  await expect(stepper.getByRole('button', { name: /Muscles/ })).toContainText('(complete)');
  await expect(stepper.getByRole('button', { name: /Exercises/ })).not.toContainText('(complete)');

  // Reload: everything is restored from the server.
  await page.reload();
  await expect(page.getByTestId('mesocycle-title')).toHaveText('Setup Block');
  await expect(page.getByLabel('Day 1 name')).toHaveValue('Push A');
  await expect(page.getByLabel('Day 2 name')).toHaveValue('Pull A');
  await expect(page.getByLabel('Day 3 name')).toHaveValue('Day 3');
  await expect(page.getByLabel('Day 4 name')).toHaveCount(0);

  await gotoStep(page, 'Muscles');
  await expect(page.getByRole('button', { name: 'Push A: Chest' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Push A: Triceps' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Push A: Biceps' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Pull A: Lats' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Chest', { exact: true })).toHaveValue('focus');
  await expect(page.getByLabel('Triceps', { exact: true })).toHaveValue('normal');
});

test('M4: calendar mode needs unique weekdays before step 1 is complete', async ({ page }) => {
  await page.goto('/mesocycles/new');
  await page.getByLabel('Name').fill('Calendar Block');
  await page.getByLabel('Training days per week').selectOption('2');
  await page.getByLabel('Calendar (specific weekdays)').check();
  await page.getByRole('button', { name: 'Create and start building' }).click();
  await page.waitForURL(/\/build/);

  const step1 = page.getByRole('navigation', { name: 'Builder steps' }).getByRole('button', { name: /Schedule/ });
  await expect(step1).not.toContainText('(complete)');
  await page.getByLabel('Day 1 weekday').selectOption('0');
  await page.getByLabel('Day 2 weekday').selectOption('2');
  await expect(step1).toContainText('(complete)');
  // A weekday taken by another day is not selectable.
  await expect(page.getByLabel('Day 2 weekday').locator('option', { hasText: 'Mon' })).toBeDisabled();
  await waitForSaved(page);

  await page.reload();
  await expect(page.getByLabel('Day 1 weekday')).toHaveValue('0');
  await expect(page.getByLabel('Day 2 weekday')).toHaveValue('2');
});

test('M4: the mesocycle list shows drafts and can delete one', async ({ page }) => {
  await createMesocycleViaUi(page, { name: 'Listed Block', days: 2 });
  await page.goto('/mesocycles');
  const row = page.getByRole('listitem').filter({ hasText: 'Listed Block' });
  await expect(row).toContainText('draft');
  await expect(row).toContainText('2 days');
  await page.getByRole('button', { name: 'Delete Listed Block' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Listed Block')).toHaveCount(0);
});
