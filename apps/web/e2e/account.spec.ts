import { expect, test, type Page } from '@playwright/test';
import { createPopulatedDraft, type DaySpec } from './api-helpers';
import { gotoTab } from './helpers';

// Each test uses a brand-new account, so the RIR preference and the stats start fresh.
test.use({ storageState: { cookies: [], origins: [] } });

async function freshAccount(page: Page, name: string): Promise<string> {
  const email = `${name.toLowerCase()}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;
  const created = await page.request.post('/api/v1/auth/register', { data: { email, password: 'account-test-1', name } });
  expect(created.status()).toBe(201);
  await page.goto('/login');
  const form = page.getByRole('form', { name: 'Sign in' });
  await form.getByLabel('Email').fill(email);
  await form.getByLabel('Password').fill('account-test-1');
  await form.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/mesocycles$/);
  return email;
}

const week: DaySpec[] = [{ slots: [{ exercise: 'Barbell Bench Press', sets: 5, rir: 2 }] }, {}, {}, { slots: [{ exercise: 'Barbell Bench Press', sets: 5 }] }, {}, {}, {}];

async function openAccount(page: Page) {
  await page.getByRole('button', { name: 'Account' }).click();
  return page.getByRole('dialog', { name: 'Account' });
}

test('the account menu shows who is signed in and their training stats', async ({ page }) => {
  const email = await freshAccount(page, 'Robin');
  let panel = await openAccount(page);
  await expect(panel.getByTestId('account-name')).toHaveText('Robin');
  await expect(panel.getByTestId('account-email')).toHaveText(email);
  await expect(panel).toContainText('Signs in with email and password');
  await expect(panel.getByTestId('stat-workouts')).toHaveText('0');
  await expect(panel).toContainText('No active mesocycle');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);

  // Lock a mesocycle and finish one workout: the stats follow.
  const id = await createPopulatedDraft(page.request, { name: 'Robin Plan', days: week });
  expect((await page.request.post(`/api/v1/mesocycles/${id}/lock`, { data: { start_date: '2026-10-05' } })).ok()).toBe(true);
  await page.goto(`/mesocycles/${id}`);
  await page.getByTestId('week-tab-1').click();
  await page.getByTestId('session-card').first().getByRole('button', { name: 'Complete' }).click();
  await expect(page.getByTestId('session-card').first().getByTestId('session-status')).toHaveText('✓ Completed');

  panel = await openAccount(page);
  await expect(panel.getByTestId('stat-workouts')).toHaveText('1');
  await expect(panel.getByTestId('stat-sets')).toHaveText('5');
  await expect(panel.getByTestId('account-active')).toContainText('Robin Plan');
  await expect(panel.getByTestId('account-active')).toContainText('1/8 workouts');
});

test('RIR can be switched off: it disappears from cards, the plan and the deload text, and the choice is saved', async ({ page }) => {
  await freshAccount(page, 'Casey');
  const id = await createPopulatedDraft(page.request, { name: 'No RIR', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  const card = page.getByRole('article', { name: 'Barbell Bench Press' }).first();
  await expect(card.getByLabel('RIR')).toBeVisible();

  const panel = await openAccount(page);
  await panel.getByText('Show RIR', { exact: true }).click();
  await expect(panel.getByRole('switch', { name: 'Show RIR' })).not.toBeChecked();
  await page.keyboard.press('Escape');
  await expect(card.getByLabel('RIR')).toHaveCount(0);
  await expect(card.getByLabel('Reps', { exact: true })).toBeVisible();

  await gotoTab(page, 'Review');
  await page.getByRole('button', { name: 'What does the deload week do?' }).hover();
  await expect(page.getByTestId('deload-info')).not.toContainText('RIR');

  // Saved to the account: still off after a reload, and on the locked plan.
  await page.reload();
  await expect(page.getByRole('article', { name: 'Barbell Bench Press' }).first().getByLabel('RIR')).toHaveCount(0);
  expect((await page.request.post(`/api/v1/mesocycles/${id}/lock`, { data: { start_date: '2026-10-05' } })).ok()).toBe(true);
  await page.goto(`/mesocycles/${id}`);
  await page.getByTestId('week-tab-1').click();
  await expect(page.getByTestId('session-exercise').first()).toHaveText(/5 × 8–12$/);

  // And back on.
  await (await openAccount(page)).getByText('Show RIR', { exact: true }).click();
  await expect(page.getByTestId('session-exercise').first()).toContainText('RIR 2');
});
