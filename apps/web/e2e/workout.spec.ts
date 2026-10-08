import { expect, test, type Page } from '@playwright/test';
import { createPopulatedDraft, type DaySpec } from './api-helpers';

// SPEC decision 19: logging sets, previous numbers as placeholders, personal bests.
const week: DaySpec[] = [
  { slots: [{ exercise: 'Barbell Bench Press', sets: 5 }] },
  {},
  {},
  { slots: [{ exercise: 'Barbell Bench Press', sets: 5 }] },
  {},
  {},
  {},
];

const card = (page: Page, day: string) => page.getByTestId('session-card').filter({ has: page.getByRole('heading', { name: day, exact: true }) });
const rows = (page: Page) => page.getByTestId('set-row');
const BENCH = 'Barbell Bench Press';
const weightOf = (page: Page, n: number, unit = 'lb') => page.getByLabel(`${BENCH} set ${n} weight (${unit})`);
const repsOf = (page: Page, n: number) => page.getByLabel(`${BENCH} set ${n} reps`);
const logButton = (page: Page, n: number) => page.getByRole('button', { name: `Log ${BENCH} set ${n}` });

test('log sets, repeat last workout with one tap, see PRs and personal bests', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Logbook', days: week });
  expect((await request.post(`/api/v1/mesocycles/${id}/lock`, { data: { start_date: '2026-10-05' } })).ok()).toBe(true);

  // First workout: nothing to repeat yet, so the placeholders are the plan (the rep range).
  await page.goto(`/mesocycles/${id}`);
  await page.getByTestId('week-tab-1').click();
  await card(page, 'Mon').getByRole('link', { name: 'Start workout' }).click();
  await expect(page.getByRole('heading', { name: 'Mon', level: 1 })).toBeVisible();
  await expect(rows(page)).toHaveCount(5);
  await expect(repsOf(page, 1)).toHaveAttribute('placeholder', '8–12');

  // ✓ without reps explains what is missing.
  await logButton(page, 1).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Enter the reps you did');

  // Type and tick; Enter in the reps field logs too.
  await weightOf(page, 1).fill('100');
  await repsOf(page, 1).fill('8');
  await logButton(page, 1).click();
  await expect(rows(page).nth(0)).toHaveAttribute('data-logged', 'true');
  await weightOf(page, 2).fill('100');
  await weightOf(page, 2).press('Enter');
  await expect(repsOf(page, 2)).toBeFocused();
  await repsOf(page, 2).fill('7');
  await repsOf(page, 2).press('Enter');
  await expect(rows(page).nth(1)).toHaveAttribute('data-logged', 'true');
  await expect(page.getByTestId('workout-summary')).toHaveText('2 sets logged');

  // Sets can be added and removed (planned ones too); the change carries over to later weeks.
  await expect(page.getByTestId('carry-over-hint')).toBeVisible();
  await page.getByRole('button', { name: /Add set/ }).click();
  await expect(rows(page)).toHaveCount(6);
  await expect(page.getByTestId('sets-notice')).toHaveText(`Set added. Weeks 2–4 will also have 6 sets of ${BENCH}.`);
  await page.getByRole('button', { name: `Remove ${BENCH} set 6` }).click();
  await expect(rows(page)).toHaveCount(5);
  await page.getByRole('button', { name: `Remove ${BENCH} set 5` }).click();
  await expect(rows(page)).toHaveCount(4);
  await expect(page.getByTestId('sets-notice')).toHaveText(`Set 5 removed. Weeks 2–4 will also have 4 sets of ${BENCH}.`);
  // A logged set cannot be removed (un-tick it first).
  await expect(page.getByRole('button', { name: `Remove ${BENCH} set 1` })).toHaveCount(0);

  // A logged set can be un-ticked.
  await page.getByRole('button', { name: `${BENCH} set 2 logged, tap to undo` }).click();
  await expect(rows(page).nth(1)).toHaveAttribute('data-logged', 'false');
  await repsOf(page, 2).fill('7');
  await logButton(page, 2).click();
  await expect(rows(page).nth(1)).toHaveAttribute('data-logged', 'true');

  // A logged set can be corrected in place.
  await repsOf(page, 1).fill('9');
  await repsOf(page, 1).press('Enter');
  await expect(page.getByTestId('workout-summary')).toHaveText('2 sets logged');
  await page.reload();
  await expect(repsOf(page, 1)).toHaveValue('9');

  // Empty sets count as not done: finishing asks first.
  await page.getByRole('button', { name: 'Finish workout' }).click();
  const confirm = page.getByRole('dialog', { name: 'Some sets are empty' });
  await expect(confirm).toContainText('2 sets are not logged and will count as not done.');
  await confirm.getByRole('button', { name: 'Keep logging' }).click();
  await expect(confirm).toBeHidden();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await confirm.getByRole('button', { name: 'Finish anyway' }).click();
  await page.waitForURL(new RegExp(`/mesocycles/${id}$`));
  await page.getByTestId('week-tab-2').click();
  await expect(card(page, 'Mon').getByTestId('session-exercise')).toContainText('4 × 8–12');
  await page.getByTestId('week-tab-1').click();
  await expect(card(page, 'Mon').getByTestId('session-status')).toHaveText('✓ Completed');

  // Next workout: last time's numbers are the placeholders, and ✓ on an empty row repeats them.
  await card(page, 'Thu').getByRole('link', { name: 'Start workout' }).click();
  await expect(rows(page).nth(0).getByTestId('set-previous')).toHaveText('100 × 9');
  await expect(weightOf(page, 1)).toHaveAttribute('placeholder', '100');
  await expect(repsOf(page, 1)).toHaveAttribute('placeholder', '9');
  await expect(page.getByTestId('exercise-best')).toHaveText('Best 100 × 9');
  await logButton(page, 1).click();
  await expect(repsOf(page, 1)).toHaveValue('9');
  await expect(page.getByTestId('pr-badge')).toHaveCount(0);

  // Beating the best earns a PR badge.
  await weightOf(page, 2).fill('105');
  await repsOf(page, 2).fill('8');
  await logButton(page, 2).click();
  await expect(rows(page).nth(1).getByTestId('pr-badge')).toBeVisible();
  await expect(page.getByTestId('workout-summary')).toHaveText('2 sets logged · 1 PR');

  // Leaving mid-workout keeps it in progress.
  await page.getByRole('link', { name: '← Logbook' }).click();
  await page.getByTestId('week-tab-1').click();
  await expect(card(page, 'Thu').getByTestId('session-status')).toHaveText('In progress');
  await expect(card(page, 'Thu').getByRole('link', { name: 'Continue workout' })).toBeVisible();

  // Personal bests page.
  await page.getByRole('link', { name: 'Personal bests' }).first().click();
  const bench = page.getByTestId('record-row').filter({ hasText: 'Barbell Bench Press' });
  await expect(bench.getByTestId('record-e1rm')).toContainText('133');
  await expect(bench.getByTestId('record-heaviest')).toContainText('105 × 8');

  // The weight unit is a preference (it only changes the label).
  await page.goto('/settings');
  const saved = page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'PATCH');
  await page.getByText('kg', { exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await page.goto(`/mesocycles/${id}`);
  await page.getByTestId('week-tab-1').click();
  await card(page, 'Thu').getByRole('link', { name: 'Continue workout' }).click();
  await expect(weightOf(page, 1, 'kg')).toHaveValue('100');
});
