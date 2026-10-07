import { expect, test, type Page } from '@playwright/test';
import { createPopulatedDraft, type DaySpec } from './api-helpers';
import { addExercises, card, center, column, columnNames, createMesocycleViaUi, dragTo, durationRadio, gotoTab, setDuration, settingsSaved, waitForSaved } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
});

// Mon: bench, Tue: lat pulldown, Wed: leg press, Thu-Sun: rest.
const week: DaySpec[] = [
  { slots: [{ exercise: 'Barbell Bench Press', sets: 4 }] },
  { slots: [{ exercise: 'Lat Pulldown' }] },
  { slots: [{ exercise: 'Leg Press' }] },
  {},
  {},
  {},
  {},
];

const dayGrip = (page: Page, dayName: string) => column(page, dayName).getByTestId('day-grip');
const exercisesIn = (page: Page, dayName: string) => column(page, dayName).getByRole('article');

test('a day column is dragged by its header; weekday names stay in place so its exercises become Monday', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Reorder Days', days: week });
  await page.goto(`/mesocycles/${id}/build`);

  await dragTo(page, await center(dayGrip(page, 'Wed')), await center(dayGrip(page, 'Mon')));

  expect(await columnNames(page)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  await expect(exercisesIn(page, 'Mon')).toHaveText([/Leg Press/]);
  await expect(exercisesIn(page, 'Tue')).toHaveText([/Barbell Bench Press/]);
  await expect(exercisesIn(page, 'Wed')).toHaveText([/Lat Pulldown/]);
  await expect(card(page, 'Tue', 'Barbell Bench Press').getByTestId('value-Sets')).toHaveText('4');

  await waitForSaved(page);
  await page.reload();
  await expect(exercisesIn(page, 'Mon')).toHaveText([/Leg Press/]);
  await expect(exercisesIn(page, 'Tue')).toHaveText([/Barbell Bench Press/]);
});

test('numbered days renumber after a move, and typed names move with their day', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, {
    name: 'Reorder Numbered',
    days: [{ slots: [{ exercise: 'Barbell Bench Press' }] }, { slots: [{ exercise: 'Lat Pulldown' }] }, { name: 'Legs', slots: [{ exercise: 'Leg Press' }] }],
  });
  await page.goto(`/mesocycles/${id}/build`);
  expect(await columnNames(page)).toEqual(['Day 1', 'Day 2', 'Legs']);

  await dragTo(page, await center(dayGrip(page, 'Day 2')), await center(dayGrip(page, 'Day 1')));
  expect(await columnNames(page)).toEqual(['Day 1', 'Day 2', 'Legs']);
  await expect(exercisesIn(page, 'Day 1')).toHaveText([/Lat Pulldown/]);
  await expect(exercisesIn(page, 'Day 2')).toHaveText([/Barbell Bench Press/]);

  await dragTo(page, await center(dayGrip(page, 'Legs')), await center(dayGrip(page, 'Day 1')));
  expect(await columnNames(page)).toEqual(['Legs', 'Day 2', 'Day 3']);
  await expect(exercisesIn(page, 'Day 2')).toHaveText([/Lat Pulldown/]);
});

test('a day moves with the keyboard: focus its header, Space, arrow keys, Space', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Keyboard Days', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  const status = (text: string) => page.getByRole('status').filter({ hasText: text });

  await page.getByRole('group', { name: 'Move Tue', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(status('Tue is over position 2 of 7.')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(status('Tue is over position 4 of 7.')).toHaveCount(1);
  await page.keyboard.press('Space');
  await expect(status('Tue moved to position 4 of 7.')).toHaveCount(1);

  // Old Wed and Thu shift left into Tue and Wed; the moved day is now Thursday.
  await expect(exercisesIn(page, 'Tue')).toHaveText([/Leg Press/]);
  await expect(column(page, 'Wed').getByTestId('rest-day')).toBeVisible();
  await expect(exercisesIn(page, 'Thu')).toHaveText([/Lat Pulldown/]);
  // Focus follows the moved day, now named Thu.
  await expect(page.getByRole('group', { name: 'Move Thu', exact: true })).toBeFocused();
});

test('a visible tip explains dragging and can be dismissed for good', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Tip', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  const tip = page.getByTestId('drag-tip');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('press and hold an exercise to drag it');
  await expect(tip).toContainText("Drag a day's header to reorder days");
  await tip.getByRole('button', { name: 'Dismiss tip' }).click();
  await expect(tip).toHaveCount(0);
  await page.reload();
  await page.getByTestId('day-column').first().waitFor();
  await expect(page.getByTestId('drag-tip')).toHaveCount(0);
});

test('"Start from a template" on the list creates a named, filled-in mesocycle', async ({ page }) => {
  await page.goto('/mesocycles');
  await page.getByRole('button', { name: 'Start from a template' }).click();
  const picker = page.getByRole('dialog', { name: 'Start from a template' });
  await expect(picker.getByRole('list', { name: 'Templates' }).getByRole('listitem')).toHaveCount(4);
  await picker.getByTestId('template-upper-lower-4').click();

  await page.waitForURL(/\/mesocycles\/[0-9a-f-]+\/build/);
  await expect(page.getByTestId('mesocycle-title')).toHaveValue('Upper / Lower');
  expect(await columnNames(page)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  await expect(exercisesIn(page, 'Mon').first()).toContainText('Barbell Bench Press');
  await expect(exercisesIn(page, 'Tue').first()).toContainText('Barbell Back Squat');
  for (const rest of ['Wed', 'Sat', 'Sun']) await expect(column(page, rest).getByTestId('rest-day')).toBeVisible();
  // Upper A bench 4 sets + Upper B incline press 3 + cable fly 3 = 10 chest sets.
  await expect(page.getByTestId('volume-total-chest')).toHaveText('10');
});

test('Templates on the board replaces the days after confirming, and renames an untitled mesocycle', async ({ page }) => {
  await createMesocycleViaUi(page);
  await addExercises(page, 'Mon', ['Cable Fly']);
  await page.getByRole('button', { name: 'Templates' }).click();
  const picker = page.getByRole('dialog', { name: 'Start from a template' });
  await expect(picker).toContainText('replaces all of your current days and exercises');
  await picker.getByTestId('template-full-body-3').click();

  const confirm = page.getByRole('dialog', { name: 'Replace your days?' });
  await confirm.getByRole('button', { name: 'Use template' }).click();
  await expect(picker).toBeHidden();
  await expect(page.getByTestId('mesocycle-title')).toHaveValue('Full Body');
  await expect(exercisesIn(page, 'Mon')).toHaveCount(7);
  await expect(card(page, 'Mon', 'Cable Fly')).toHaveCount(0);
  await expect(column(page, 'Tue').getByTestId('rest-day')).toBeVisible();
  await expect(exercisesIn(page, 'Fri')).toHaveCount(8);

  await waitForSaved(page);
  await page.reload();
  await expect(exercisesIn(page, 'Wed')).toHaveCount(7);
  await expect(page.getByTestId('mesocycle-title')).toHaveValue('Full Body');
});

test('Review tiles explain themselves on hover, and duration is a 3-10 week radio row', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Tiles', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoTab(page, 'Review');

  await page.getByTestId('stat-training-days').hover();
  const training = page.getByTestId('stat-training-days-info');
  await expect(training).toContainText('Days with at least one exercise');
  await expect(training).toContainText('Mon');
  await expect(training).toContainText('Wed');

  await page.getByTestId('stat-rest-days').hover();
  await expect(page.getByTestId('stat-rest-days-info')).toContainText('Thu · Fri · Sat · Sun');

  await page.getByTestId('stat-weekly-sets').hover();
  const sets = page.getByTestId('stat-weekly-sets-info');
  await expect(sets).toContainText('added up across the week');
  await expect(sets).toContainText('4 sets');

  await page.getByTestId('stat-average-minutes').hover();
  await expect(page.getByTestId('stat-average-minutes-info')).toContainText('5 min warm-up');
  await page.mouse.move(0, 0);
  await expect(page.getByTestId('stat-average-minutes-info')).toHaveCount(0);

  await expect(page.getByTestId('duration-options').getByRole('radio')).toHaveCount(8);
  await expect(durationRadio(page, 4)).toBeChecked();
  await setDuration(page, 10);
  const saved = settingsSaved(page, 'duration_weeks');
  await setDuration(page, 3);
  await saved;
  await expect(page.getByText(/^3 weeks · Mon–Sun week/)).toBeVisible();
  await waitForSaved(page);
  await page.reload();
  await gotoTab(page, 'Review');
  await expect(durationRadio(page, 3)).toBeChecked();
});

test('the app says mesocycles, not blocks', async ({ page }) => {
  await page.goto('/mesocycles');
  await expect(page.getByRole('link', { name: 'My mesocycles' })).toBeVisible();
  await createMesocycleViaUi(page);
  await gotoTab(page, 'Review');
  await expect(page.getByRole('button', { name: 'Lock in mesocycle' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mesocycle settings' })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/\bblocks?\b/i);
});
