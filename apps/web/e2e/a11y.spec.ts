import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createPopulatedDraft, type DaySpec } from './api-helpers';
import { gotoTab } from './helpers';

// M9: automated accessibility audit (axe, the engine behind Lighthouse's accessibility score) on
// every main screen. Any violation fails the test, with its rule id and the offending elements.
const week: DaySpec[] = [
  { slots: [{ exercise: 'Barbell Bench Press', sets: 5 }, { exercise: 'Cable Fly', sets: 3 }] },
  {},
  {},
  { slots: [{ exercise: 'Barbell Bench Press', sets: 5 }] },
  {},
  {},
  {},
];

async function audit(page: Page, name: string) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  const summary = result.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  expect(summary, `${name} accessibility violations`).toEqual([]);
}

test('the builder, Review and dialogs have no accessibility violations', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'A11y Plan', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  await expect(page.getByTestId('day-column').first()).toBeVisible();
  await audit(page, 'Build');

  await page.getByRole('button', { name: 'Add exercises to Tue' }).click();
  await expect(page.getByRole('dialog', { name: /Add exercises/ })).toBeVisible();
  await audit(page, 'Add exercises panel');
  await page.keyboard.press('Escape');

  await gotoTab(page, 'Review');
  await expect(page.getByTestId('stat-weekly-sets')).toBeVisible();
  await audit(page, 'Review');
  await page.getByRole('button', { name: 'Lock in mesocycle' }).click();
  await audit(page, 'Lock-in dialog');
});

test('the list, the plan and the account panel have no accessibility violations', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'A11y Locked', days: week });
  expect((await request.post(`/api/v1/mesocycles/${id}/lock`, { data: { start_date: '2026-10-05' } })).ok()).toBe(true);
  await page.goto(`/mesocycles/${id}`);
  await expect(page.getByTestId('session-card').first()).toBeVisible();
  await audit(page, 'Plan');
  await page.getByRole('button', { name: 'Account' }).click();
  await expect(page.getByTestId('stat-workouts')).toBeVisible();
  await audit(page, 'Account panel');

  await page.goto('/mesocycles');
  await expect(page.getByTestId('mesocycle-card').first()).toBeVisible();
  await audit(page, 'Mesocycle list');
  await page.getByRole('button', { name: 'Start from a template' }).click();
  await audit(page, 'Template picker');
});

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the login page has no accessibility violations', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await audit(page, 'Login');
    await page.getByRole('tab', { name: 'Create account' }).click();
    await audit(page, 'Create account');
  });
});
