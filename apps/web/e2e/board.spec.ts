import { expect, test } from '@playwright/test';
import { addExercise, assignMuscles, card, column, createMesocycleViaUi, gotoStep, pageScrollsSideways, waitForSaved } from './helpers';

test('M5: add exercises to the board, edit metrics inline, reorder, move and delete', async ({ page }) => {
  await createMesocycleViaUi(page, { name: 'Board Block', days: 4 });
  await assignMuscles(page, { 'Day 1': ['Chest', 'Triceps'], 'Day 2': ['Lats'] });

  // Empty columns show the empty state; empty sections show a hint.
  await expect(column(page, 'Day 3')).toContainText('Add a muscle group to get started.');
  await expect(column(page, 'Day 1').getByRole('region', { name: 'Chest section' })).toContainText('No exercises yet.');

  // Add exercises through the catalog panel (results default to the section's muscle).
  await column(page, 'Day 1').getByRole('button', { name: 'Add exercise to Chest' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Muscle')).toHaveValue('chest');
  await expect(dialog.getByRole('button', { name: /^Cable Fly/ })).toBeVisible();
  await dialog.getByLabel('Search exercises').fill('bench');
  await expect(dialog.getByRole('button', { name: /^Barbell Bench Press/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /^Cable Fly/ })).toHaveCount(0);
  await dialog.getByRole('button', { name: /^Barbell Bench Press/ }).click();
  await expect(dialog).toBeHidden();

  await addExercise(page, 'Day 1', 'Chest', 'cable fly', 'Cable Fly');
  await addExercise(page, 'Day 1', 'Triceps', 'pushdown', 'Cable Pushdown');
  await addExercise(page, 'Day 2', 'Lats', 'lat pulldown', 'Lat Pulldown');

  const bench = card(page, 'Day 1', 'Barbell Bench Press');
  const fly = card(page, 'Day 1', 'Cable Fly');
  await expect(bench).toBeVisible();
  await expect(column(page, 'Day 1')).toContainText('3 exercises');
  await expect(column(page, 'Day 1').getByTestId('day-duration')).toContainText('min');

  // Defaults: 3 sets, 8–12 reps, RIR 3, no weight.
  await expect(bench.getByTestId('value-Sets')).toHaveText('3');
  await expect(bench.getByLabel('Reps')).toHaveValue('8–12');
  await expect(bench.getByLabel('RIR')).toHaveValue('3');
  await expect(bench.getByLabel(/Weight/)).toHaveValue('');

  // Edit metrics inline.
  await bench.getByRole('button', { name: 'Increase Sets' }).click();
  await bench.getByRole('button', { name: 'Increase Sets' }).click();
  await expect(bench.getByTestId('value-Sets')).toHaveText('5');
  await bench.getByLabel('Reps').selectOption('5–10');
  await bench.getByLabel('RIR').selectOption('1');
  await bench.getByLabel(/Weight/).fill('102.5');

  // Custom rep range: invalid values show an error and are not kept; valid ones are saved.
  await fly.getByLabel('Reps').selectOption('custom');
  await fly.getByLabel('Minimum reps').fill('15');
  await fly.getByLabel('Maximum reps').fill('12');
  await expect(fly.getByRole('alert')).toContainText('Min must be below max');
  await fly.getByLabel('Maximum reps').fill('25');
  await expect(fly.getByRole('alert')).toHaveCount(0);

  // Weight validation.
  await fly.getByLabel(/Weight/).fill('12.345');
  await expect(fly.getByRole('alert')).toContainText('At most 2 decimals');
  await fly.getByLabel(/Weight/).fill('40');

  await waitForSaved(page);

  // Sets stepper is bounded.
  for (let i = 0; i < 10; i++) {
    if (await fly.getByRole('button', { name: 'Decrease Sets' }).isEnabled()) await fly.getByRole('button', { name: 'Decrease Sets' }).click();
  }
  await expect(fly.getByTestId('value-Sets')).toHaveText('1');
  await expect(fly.getByRole('button', { name: 'Decrease Sets' })).toBeDisabled();

  // Move up / down within the section (keyboard-friendly buttons).
  const chestCards = column(page, 'Day 1').getByRole('region', { name: 'Chest section' }).getByRole('article');
  await expect(chestCards).toHaveCount(2);
  await expect(chestCards.nth(0)).toHaveAccessibleName('Barbell Bench Press');
  await expect(bench.getByRole('button', { name: 'Move Barbell Bench Press up' })).toBeDisabled();
  await fly.getByRole('button', { name: 'Move Cable Fly up' }).click();
  await expect(chestCards.nth(0)).toHaveAccessibleName('Cable Fly');
  await expect(chestCards.nth(1)).toHaveAccessibleName('Barbell Bench Press');
  await expect(fly.getByRole('button', { name: 'Move Cable Fly up' })).toBeDisabled();
  await bench.getByRole('button', { name: 'Move Barbell Bench Press up' }).click();
  await expect(chestCards.nth(0)).toHaveAccessibleName('Barbell Bench Press');

  // Move to another day: lands in the primary-muscle section with every metric intact.
  await bench.getByLabel('Move Barbell Bench Press to day').selectOption({ label: 'Day 3' });
  await expect(card(page, 'Day 1', 'Barbell Bench Press')).toHaveCount(0);
  const moved = card(page, 'Day 3', 'Barbell Bench Press');
  await expect(column(page, 'Day 3').getByRole('region', { name: 'Chest section' })).toBeVisible();
  await expect(moved.getByTestId('value-Sets')).toHaveText('5');
  await expect(moved.getByLabel('Reps')).toHaveValue('5–10');
  await expect(moved.getByLabel('RIR')).toHaveValue('1');
  await expect(moved.getByLabel(/Weight/)).toHaveValue('102.5');

  // Deleting a section with exercises asks for confirmation.
  await column(page, 'Day 2').getByRole('button', { name: 'Remove Lats section' }).click();
  await expect(page.getByRole('dialog')).toContainText('also removes its 1 exercise(s)');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(card(page, 'Day 2', 'Lat Pulldown')).toBeVisible();
  await card(page, 'Day 2', 'Lat Pulldown').getByRole('button', { name: 'Delete Lat Pulldown' }).click();
  await expect(card(page, 'Day 2', 'Lat Pulldown')).toHaveCount(0);

  // Everything persists across a reload.
  await waitForSaved(page);
  await page.reload();
  await gotoStep(page, 'Exercises');
  const reloaded = card(page, 'Day 3', 'Barbell Bench Press');
  await expect(reloaded.getByTestId('value-Sets')).toHaveText('5');
  await expect(reloaded.getByLabel('Reps')).toHaveValue('5–10');
  await expect(reloaded.getByLabel(/Weight/)).toHaveValue('102.5');
  const reloadedFly = card(page, 'Day 1', 'Cable Fly');
  await expect(reloadedFly.getByLabel('Minimum reps')).toHaveValue('15');
  await expect(reloadedFly.getByLabel('Maximum reps')).toHaveValue('25');
  await expect(reloadedFly.getByLabel(/Weight/)).toHaveValue('40');

  // The page body never scrolls sideways.
  expect(await pageScrollsSideways(page)).toBe(false);
});

test('M5: create a custom exercise from the panel and add it; duplicate names are rejected', async ({ page }) => {
  await createMesocycleViaUi(page, { name: 'Custom Block', days: 2 });
  await assignMuscles(page, { 'Day 1': ['Biceps'] });

  const add = column(page, 'Day 1').getByRole('button', { name: 'Add exercise to Biceps' });
  await add.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Create custom exercise' }).click();
  await dialog.getByLabel('Exercise name').fill('Zottman Curl');
  await dialog.getByLabel('Equipment').selectOption('dumbbell');
  await dialog.getByRole('checkbox', { name: 'Forearms' }).check();
  await dialog.getByRole('button', { name: 'Create and add' }).click();
  await expect(dialog).toBeHidden();
  const created = card(page, 'Day 1', 'Zottman Curl');
  await expect(created).toBeVisible();
  await expect(created).toContainText('Dumbbell');

  // Second attempt with the same name: the API's 409 is shown.
  await add.click();
  await dialog.getByRole('button', { name: 'Create custom exercise' }).click();
  await dialog.getByLabel('Exercise name').fill('zottman curl');
  await dialog.getByRole('button', { name: 'Create and add' }).click();
  await expect(dialog.getByRole('alert')).toContainText('already have an exercise named');
  await dialog.getByRole('button', { name: 'Back to search' }).click();
  await dialog.getByLabel('Search exercises').fill('zottman');
  await expect(dialog.getByRole('button', { name: /^Zottman Curl.*custom/ })).toBeVisible();
});

test('M5: a mismatched primary muscle shows a warning but is allowed', async ({ page }) => {
  await createMesocycleViaUi(page, { name: 'Mismatch Block', days: 2 });
  await assignMuscles(page, { 'Day 1': ['Chest'] });
  await column(page, 'Day 1').getByRole('button', { name: 'Add exercise to Chest' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Muscle').selectOption('quads');
  await dialog.getByRole('button', { name: /^Leg Press/ }).click();
  const legPress = card(page, 'Day 1', 'Leg Press');
  await expect(legPress.getByTestId('muscle-mismatch')).toContainText('Primary muscle is Quads, placed under Chest');
});

test('M5: board scrolls sideways on its own while the page does not (390 px viewport)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await createMesocycleViaUi(page, { name: 'Narrow Block', days: 4 });
  await gotoStep(page, 'Exercises');
  const board = page.getByTestId('board');
  const scrollable = await board.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(scrollable).toBe(true);
  expect(await pageScrollsSideways(page)).toBe(false);
  await board.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  expect(await pageScrollsSideways(page)).toBe(false);
});
