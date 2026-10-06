import { expect, test } from '@playwright/test';
import { createPopulatedDraft } from './api-helpers';
import { addExercises, card, column, columnNames, createMesocycleViaUi, gotoTab, openDayMenu, waitForSaved } from './helpers';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const numberedToggle = (page: import('@playwright/test').Page) => page.getByRole('switch', { name: 'Number the days (Day 1, Day 2, …)' });

test('New mesocycle opens straight onto an empty Mon-Sun board of rest days', async ({ page }) => {
  await createMesocycleViaUi(page);
  expect(await columnNames(page)).toEqual(WEEK);
  await expect(page.getByTestId('rest-day')).toHaveCount(7);
  for (const day of WEEK) await expect(column(page, day).getByRole('button', { name: `Add exercises to ${day}` })).toBeVisible();
  await expect(numberedToggle(page)).not.toBeChecked();
  await expect(page.getByTestId('volume-bar')).toContainText('Weekly sets per muscle group appear here as you add exercises.');
  // Only two tabs remain.
  const tabs = page.getByRole('navigation', { name: 'Builder tabs' }).getByRole('button');
  await expect(tabs).toHaveText(['Build', 'Review']);
});

test('"Number the days" switches names between weekdays and numbers, keeping custom names, and persists', async ({ page }) => {
  await createMesocycleViaUi(page);
  const monName = column(page, 'Mon').getByLabel('Day name for Mon');
  await monName.fill('Push A');
  await monName.press('Enter');
  await expect(column(page, 'Push A')).toBeVisible();

  await numberedToggle(page).check();
  expect(await columnNames(page)).toEqual(['Push A', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']);
  await waitForSaved(page);
  await page.reload();
  await expect(numberedToggle(page)).toBeChecked();
  expect(await columnNames(page)).toEqual(['Push A', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']);

  await numberedToggle(page).uncheck();
  expect(await columnNames(page)).toEqual(['Push A', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  await waitForSaved(page);
  await page.reload();
  expect(await columnNames(page)).toEqual(['Push A', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
});

test('adding an 8th day switches to numbered days; cycles go up to 10 days and back down', async ({ page }) => {
  await createMesocycleViaUi(page);
  await expect(page.getByText('Adding an 8th day switches to numbered days.')).toBeVisible();
  await page.getByRole('button', { name: '+ Add day' }).click();
  expect(await columnNames(page)).toEqual(['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8']);
  await expect(numberedToggle(page)).toBeChecked();
  // Weekday names need exactly 7 days, so the toggle is locked on.
  await expect(numberedToggle(page)).toBeDisabled();
  await expect(page.getByText('Weekday names need exactly 7 days.')).toBeVisible();

  await page.getByRole('button', { name: '+ Add day' }).click();
  await page.getByRole('button', { name: '+ Add day' }).click();
  await expect(page.getByTestId('day-column')).toHaveCount(10);
  await expect(page.getByRole('button', { name: '+ Add day' })).toHaveCount(0);

  // Removing a rest day needs no confirmation; the rest are renumbered.
  await (await openDayMenu(page, 'Day 3')).getByRole('menuitem', { name: 'Remove day' }).click();
  await expect(page.getByTestId('day-column')).toHaveCount(9);
  expect((await columnNames(page)).slice(0, 4)).toEqual(['Day 1', 'Day 2', 'Day 3', 'Day 4']);

  // Removing a day with exercises asks first.
  await addExercises(page, 'Day 1', ['Cable Fly']);
  await (await openDayMenu(page, 'Day 1')).getByRole('menuitem', { name: 'Remove day' }).click();
  await expect(page.getByRole('dialog')).toContainText('“Day 1” and its 1 exercise(s) will be removed.');
  await page.getByRole('dialog').getByRole('button', { name: 'Remove day' }).click();
  await expect(page.getByTestId('day-column')).toHaveCount(8);

  // Back at 7 days, weekday names are allowed again.
  await (await openDayMenu(page, 'Day 8')).getByRole('menuitem', { name: 'Remove day' }).click();
  await expect(numberedToggle(page)).toBeEnabled();
  await numberedToggle(page).uncheck();
  expect(await columnNames(page)).toEqual(WEEK);

  await waitForSaved(page);
  await page.reload();
  expect(await columnNames(page)).toEqual(WEEK);
});

test('a Mon-Sun week cannot lose days, but a day can be cleared into a rest day', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, {
    name: 'Week Block',
    days: [{ slots: [{ exercise: 'Cable Fly' }, { exercise: 'Barbell Bench Press' }] }, {}, {}, {}, {}, {}, {}],
  });
  await page.goto(`/mesocycles/${id}/build`);
  const menu = await openDayMenu(page, 'Mon');
  await expect(menu.getByRole('menuitem', { name: 'Remove day' })).toHaveCount(0);
  await menu.getByRole('menuitem', { name: 'Clear (make rest day)' }).click();
  await expect(page.getByRole('dialog')).toContainText('All 2 exercise(s) on “Mon” will be removed');
  await page.getByRole('dialog').getByRole('button', { name: 'Clear day' }).click();
  await expect(column(page, 'Mon').getByTestId('rest-day')).toBeVisible();
  await expect(page.getByTestId('day-column')).toHaveCount(7);
});

test('Review holds the block settings: name, duration and deload', async ({ page }) => {
  await createMesocycleViaUi(page);
  await addExercises(page, 'Mon', ['Cable Fly']);
  await gotoTab(page, 'Review');
  await expect(page.getByTestId('stat-training-days')).toHaveText('1');
  await expect(page.getByTestId('stat-rest-days')).toHaveText('6');

  await page.getByLabel('Mesocycle name').fill('Fall Block');
  await page.getByLabel('Mesocycle name').press('Enter');
  await expect(page.getByTestId('mesocycle-title')).toHaveText('Fall Block');
  await page.getByLabel('Duration').selectOption('6');
  await page.getByLabel('Deload in the final week').check();
  await waitForSaved(page);

  await page.reload();
  await expect(page.getByTestId('mesocycle-title')).toHaveText('Fall Block');
  await gotoTab(page, 'Review');
  await expect(page.getByLabel('Duration')).toHaveValue('6');
  await expect(page.getByLabel('Deload in the final week')).toBeChecked();
  await gotoTab(page, 'Build');
  await expect(card(page, 'Mon', 'Cable Fly')).toBeVisible();
});

test('the mesocycle list shows drafts and can delete one', async ({ page, request }) => {
  await createPopulatedDraft(request, { name: 'Listed Block', days: [{}, {}, {}] });
  await page.goto('/mesocycles');
  const row = page.getByRole('listitem').filter({ hasText: 'Listed Block' });
  await expect(row).toContainText('draft');
  await expect(row).toContainText('3-day cycle');
  await page.getByRole('button', { name: 'Delete Listed Block' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Listed Block')).toHaveCount(0);
});
