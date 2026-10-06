import { expect, test } from '@playwright/test';
import { createPopulatedDraft } from './api-helpers';
import { addExercises, card, column, createMesocycleViaUi, pageScrollsSideways, waitForSaved } from './helpers';

test('the Add panel adds several exercises at once, filtered by muscle chips', async ({ page }) => {
  await createMesocycleViaUi(page);
  await column(page, 'Mon').getByRole('button', { name: 'Add exercises to Mon' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Add exercises · Mon');
  await expect(dialog.getByRole('button', { name: 'Add 0 exercises' })).toBeDisabled();

  // Two muscle chips at once: only chest and triceps exercises are listed.
  await dialog.getByRole('button', { name: 'Chest', exact: true }).click();
  await dialog.getByRole('button', { name: 'Triceps', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Chest', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('checkbox', { name: /^Cable Pushdown/ })).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: /^Cable Fly/ })).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: /^Leg Press/ })).toHaveCount(0);

  await dialog.getByRole('checkbox', { name: /^Barbell Bench Press/ }).check();
  await dialog.getByRole('checkbox', { name: /^Cable Fly/ }).check();
  // Selections survive filter changes.
  await dialog.getByRole('button', { name: 'Chest', exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: /^Cable Fly/ })).toHaveCount(0);
  await dialog.getByRole('checkbox', { name: /^Cable Pushdown/ }).check();
  await expect(dialog.getByText('3 selected')).toBeVisible();
  await dialog.getByRole('button', { name: 'Add 3 exercises' }).click();
  await expect(dialog).toBeHidden();

  const cards = column(page, 'Mon').getByRole('article');
  await expect(cards).toHaveText([/Barbell Bench Press/, /Cable Fly/, /Cable Pushdown/]);
  await expect(card(page, 'Mon', 'Cable Pushdown').getByTestId('muscle-tag')).toHaveText('Triceps');
  await expect(column(page, 'Mon')).toContainText('3 exercises');
  await expect(column(page, 'Mon').getByTestId('day-duration')).toContainText('min');
  await expect(column(page, 'Mon').getByTestId('rest-day')).toHaveCount(0);
});

test('metrics are edited inline, cards reorder and delete, and everything persists', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, {
    name: 'Metrics Block',
    days: [{ slots: [{ exercise: 'Barbell Bench Press' }, { exercise: 'Cable Fly' }, { exercise: 'Cable Pushdown' }] }, {}, {}, {}, {}, {}, {}],
  });
  await page.goto(`/mesocycles/${id}/build`);
  const bench = card(page, 'Mon', 'Barbell Bench Press');
  const fly = card(page, 'Mon', 'Cable Fly');

  // Defaults.
  await expect(bench.getByTestId('value-Sets')).toHaveText('3');
  await expect(bench.getByLabel('Reps', { exact: true })).toHaveValue('8–12');
  await expect(bench.getByLabel('RIR')).toHaveValue('3');
  await expect(bench.getByLabel(/Weight/)).toHaveValue('');

  await bench.getByRole('button', { name: 'Increase Sets' }).click();
  await bench.getByRole('button', { name: 'Increase Sets' }).click();
  await expect(bench.getByTestId('value-Sets')).toHaveText('5');
  await bench.getByLabel('Reps', { exact: true }).selectOption('5–10');
  await bench.getByLabel('RIR').selectOption('1');
  await bench.getByLabel(/Weight/).fill('102.5');

  // Custom rep range: invalid values show an error and are not kept.
  await fly.getByLabel('Reps', { exact: true }).selectOption('custom');
  await fly.getByLabel('Minimum reps').fill('15');
  await fly.getByLabel('Maximum reps').fill('12');
  await expect(fly.getByRole('alert')).toContainText('Min must be below max');
  await fly.getByLabel('Maximum reps').fill('25');
  await expect(fly.getByRole('alert')).toHaveCount(0);
  await fly.getByLabel(/Weight/).fill('12.345');
  await expect(fly.getByRole('alert')).toContainText('At most 2 decimals');
  await fly.getByLabel(/Weight/).fill('40');

  // Move up / down within the day.
  const cards = column(page, 'Mon').getByRole('article');
  await expect(bench.getByRole('button', { name: 'Move Barbell Bench Press up' })).toBeDisabled();
  await card(page, 'Mon', 'Cable Pushdown').getByRole('button', { name: 'Move Cable Pushdown up' }).click();
  await expect(cards).toHaveText([/Barbell Bench Press/, /Cable Pushdown/, /Cable Fly/]);
  await bench.getByRole('button', { name: 'Move Barbell Bench Press down' }).click();
  await expect(cards).toHaveText([/Cable Pushdown/, /Barbell Bench Press/, /Cable Fly/]);

  await card(page, 'Mon', 'Cable Pushdown').getByRole('button', { name: 'Delete Cable Pushdown' }).click();
  await expect(cards).toHaveCount(2);

  await waitForSaved(page);
  await page.reload();
  await expect(cards).toHaveText([/Barbell Bench Press/, /Cable Fly/]);
  const reloaded = card(page, 'Mon', 'Barbell Bench Press');
  await expect(reloaded.getByTestId('value-Sets')).toHaveText('5');
  await expect(reloaded.getByLabel('Reps', { exact: true })).toHaveValue('5–10');
  await expect(reloaded.getByLabel('RIR')).toHaveValue('1');
  await expect(reloaded.getByLabel(/Weight/)).toHaveValue('102.5');
  await expect(card(page, 'Mon', 'Cable Fly').getByLabel('Minimum reps')).toHaveValue('15');
  await expect(card(page, 'Mon', 'Cable Fly').getByLabel('Maximum reps')).toHaveValue('25');
  await expect(card(page, 'Mon', 'Cable Fly').getByLabel(/Weight/)).toHaveValue('40');
  expect(await pageScrollsSideways(page)).toBe(false);
});

test('a custom exercise is created from the panel, selected, and duplicate names are rejected', async ({ page }) => {
  await createMesocycleViaUi(page);
  const open = column(page, 'Tue').getByRole('button', { name: 'Add exercises to Tue' });
  await open.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '+ Custom' }).click();
  await dialog.getByLabel('Exercise name').fill('Zottman Curl');
  await dialog.getByLabel('Primary muscle').selectOption('biceps');
  await dialog.getByLabel('Equipment').selectOption('dumbbell');
  await dialog.getByRole('checkbox', { name: 'Forearms' }).check();
  await dialog.getByRole('button', { name: 'Create and select' }).click();
  await expect(dialog.getByRole('checkbox', { name: /^Zottman Curl/ })).toBeChecked();
  await dialog.getByRole('button', { name: 'Add 1 exercise' }).click();
  await expect(card(page, 'Tue', 'Zottman Curl').getByTestId('muscle-tag')).toHaveText('Biceps');

  await open.click();
  await dialog.getByRole('button', { name: '+ Custom' }).click();
  await dialog.getByLabel('Exercise name').fill('zottman curl');
  await dialog.getByRole('button', { name: 'Create and select' }).click();
  await expect(dialog.getByRole('alert')).toContainText('already have an exercise named');
});

test('the board scrolls sideways on its own while the page does not (390 px viewport)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await createMesocycleViaUi(page);
  await addExercises(page, 'Mon', ['Cable Fly']);
  const board = page.getByTestId('board');
  expect(await board.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  expect(await pageScrollsSideways(page)).toBe(false);
  await board.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect(column(page, 'Sun')).toBeInViewport();
  expect(await pageScrollsSideways(page)).toBe(false);
});
