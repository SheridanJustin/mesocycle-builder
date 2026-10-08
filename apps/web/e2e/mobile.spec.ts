import { expect, test, type Page } from '@playwright/test';
import { createPopulatedDraft, type DaySpec } from './api-helpers';
import { column, gotoTab, pageScrollsSideways } from './helpers';

// SPEC 11 scenario 6: a phone-sized viewport. Every screen fits the width; only the board (and the
// volume chip row) scroll sideways.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
});

const week: DaySpec[] = [
  {
    slots: [
      { exercise: 'Barbell Bench Press', sets: 4 },
      { exercise: 'Lat Pulldown', sets: 4 },
      { exercise: 'Barbell Back Squat', sets: 4 },
      { exercise: 'Barbell Curl', sets: 3 },
      { exercise: 'Standing Calf Raise', sets: 3 },
    ],
  },
  {},
  { slots: [{ exercise: 'Romanian Deadlift', sets: 4 }, { exercise: 'Cable Crunch', sets: 3 }] },
  {},
  { slots: [{ exercise: 'Seated Dumbbell Shoulder Press', sets: 4 }, { exercise: 'Cable Pushdown', sets: 3 }] },
  {},
  {},
];

async function expectFitsWidth(page: Page) {
  expect(await pageScrollsSideways(page)).toBe(false);
}

test('builder: the board and the volume chips scroll sideways, the page never does', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Phone Plan', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  await expect(column(page, 'Mon')).toBeVisible();
  await expectFitsWidth(page);

  // A training day takes almost the whole width, so one day is read at a time.
  const mon = await column(page, 'Mon').boundingBox();
  expect(mon!.width).toBeGreaterThan(300);
  expect(mon!.width).toBeLessThanOrEqual(390);

  const board = page.getByTestId('board');
  expect(await board.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await board.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect(column(page, 'Sun')).toBeInViewport();
  await expectFitsWidth(page);

  // Volume chips keep readable labels in a sideways-scrolling row.
  const chips = page.getByTestId('volume-bar').getByRole('list');
  expect(await chips.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  const chest = await page.getByTestId('volume-chip-chest').boundingBox();
  expect(chest!.width).toBeGreaterThanOrEqual(100);
  await expect(page.getByTestId('volume-chip-chest')).toContainText('Chest');

  // The add-exercise panel fits too.
  await column(page, 'Mon').getByRole('button', { name: 'Add exercises to Mon' }).click();
  await expect(page.getByRole('dialog', { name: /Add exercises/ })).toBeVisible();
  await expectFitsWidth(page);
});

test('review, lock-in, the plan, the list, the account panel and login fit a phone', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Phone Review', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoTab(page, 'Review');
  await expect(page.getByTestId('stat-weekly-sets')).toBeVisible();
  await expectFitsWidth(page);
  await page.getByRole('button', { name: 'Lock in mesocycle' }).click();
  const dialog = page.getByRole('dialog', { name: 'Lock in mesocycle' });
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.x + box!.width).toBeLessThanOrEqual(382);
  // This sample week has groups below MV, so lock-in asks for an acknowledgement first.
  await dialog.getByLabel('I understand and want to lock in anyway').check();
  await dialog.getByRole('button', { name: 'Lock in', exact: true }).click();
  await page.waitForURL(new RegExp(`/mesocycles/${id}$`));

  await expect(page.getByTestId('session-card').first()).toBeVisible();
  await expectFitsWidth(page);
  await page.getByTestId('session-card').first().getByRole('link', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page.waitForURL(new RegExp(`/mesocycles/${id}$`));
  await page.getByTestId('week-tab-1').click();
  await expect(page.getByTestId('session-card').first().getByTestId('session-status')).toHaveText('✓ Completed');

  await page.getByRole('button', { name: 'Account' }).click();
  const panel = page.getByRole('dialog', { name: 'Account' });
  await expect(panel.getByTestId('stat-workouts')).not.toHaveText('');
  const panelBox = await panel.boundingBox();
  expect(panelBox!.x).toBeGreaterThanOrEqual(0);
  await expectFitsWidth(page);
  await page.keyboard.press('Escape');

  await page.goto('/mesocycles');
  await expect(page.getByTestId('mesocycle-card').first()).toBeVisible();
  await expectFitsWidth(page);
});

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the login page fits a phone', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expectFitsWidth(page);
  });
});
