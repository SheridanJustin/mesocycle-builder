import { expect, test } from '@playwright/test';
import { createPopulatedDraft, type DaySpec } from './api-helpers';
import { card, center, column, columnNames, dragTo, openDayMenu, waitForSaved } from './helpers';

// A tall viewport keeps cards out of dnd-kit's edge auto-scroll zones, so drags are deterministic.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
});

const pushDay: DaySpec = {
  slots: [
    { exercise: 'Barbell Bench Press', sets: 5, repMin: 5, repMax: 10, rir: 1, weight: 102.5 },
    { exercise: 'Cable Fly', sets: 3 },
    { exercise: 'Cable Pushdown', sets: 4, repMin: 12, repMax: 15, rir: 2, weight: 40 },
  ],
};
// Mon: push, Tue: lat pulldown, Wed: leg press, Thu-Sun: rest.
const week: DaySpec[] = [pushDay, { slots: [{ exercise: 'Lat Pulldown' }] }, { slots: [{ exercise: 'Leg Press' }] }, {}, {}, {}, {}];

test('scenario 2: drag a card from column 1 to column 3, metrics survive and volume is recomputed', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Drag Block', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  await expect(page.getByTestId('volume-total-chest')).toHaveText('8');
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('1×/wk');

  const handle = card(page, 'Mon', 'Barbell Bench Press').getByRole('button', { name: 'Drag Barbell Bench Press' });
  await dragTo(page, await center(handle), await center(column(page, 'Wed').getByTestId('day-duration')));

  await expect(card(page, 'Mon', 'Barbell Bench Press')).toHaveCount(0);
  const moved = card(page, 'Wed', 'Barbell Bench Press');
  await expect(moved.getByTestId('value-Sets')).toHaveText('5');
  await expect(moved.getByLabel('Reps', { exact: true })).toHaveValue('5–10');
  await expect(moved.getByLabel('RIR')).toHaveValue('1');
  await expect(moved.getByLabel(/Weight/)).toHaveValue('102.5');
  await expect(card(page, 'Mon', 'Cable Fly')).toBeVisible();
  await expect(card(page, 'Wed', 'Leg Press')).toBeVisible();

  // Same chest total, now trained on two days.
  await expect(page.getByTestId('volume-total-chest')).toHaveText('8');
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('2×/wk');

  await waitForSaved(page);
  await page.reload();
  await expect(card(page, 'Wed', 'Barbell Bench Press').getByLabel(/Weight/)).toHaveValue('102.5');
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('2×/wk');
});

test('dropping on a card positions the dragged card, within a day and across days, including onto a rest day', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Position Block', days: week });
  await page.goto(`/mesocycles/${id}/build`);

  const mon = column(page, 'Mon').getByRole('article');
  const fly = card(page, 'Mon', 'Cable Fly');
  await dragTo(page, await center(fly.getByRole('button', { name: 'Drag Cable Fly' })), await center(card(page, 'Mon', 'Barbell Bench Press')));
  await expect(mon).toHaveText([/Cable Fly/, /Barbell Bench Press/, /Cable Pushdown/]);

  // Onto a card in another day: lands before it.
  const lat = card(page, 'Tue', 'Lat Pulldown');
  await dragTo(page, await center(lat.getByRole('button', { name: 'Drag Lat Pulldown' })), await center(card(page, 'Wed', 'Leg Press')));
  await expect(column(page, 'Wed').getByRole('article')).toHaveText([/Lat Pulldown/, /Leg Press/]);
  await expect(column(page, 'Tue').getByTestId('rest-day')).toBeVisible();

  // Onto a rest day column.
  const pushdown = card(page, 'Mon', 'Cable Pushdown');
  await dragTo(page, await center(pushdown.getByRole('button', { name: 'Drag Cable Pushdown' })), await center(column(page, 'Thu').getByRole('button', { name: 'Add exercises to Thu' })));
  await expect(column(page, 'Thu').getByRole('article')).toHaveText([/Cable Pushdown/]);
});

test('the board auto-scrolls sideways when a dragged card nears the edge', async ({ page, request }) => {
  await page.setViewportSize({ width: 700, height: 800 });
  const id = await createPopulatedDraft(request, { name: 'Scroll Block', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  const board = page.getByTestId('board');
  const startLeft = await board.evaluate((el) => el.scrollLeft);
  const from = await center(card(page, 'Mon', 'Barbell Bench Press').getByRole('button', { name: 'Drag Barbell Bench Press' }));
  await dragTo(page, from, { x: 690, y: from.y }, { release: false });
  await expect.poll(() => board.evaluate((el) => el.scrollLeft), { timeout: 5000 }).toBeGreaterThan(startLeft + 100);
  await page.mouse.up();
  await expect(card(page, 'Mon', 'Barbell Bench Press')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('cards move with the keyboard: up/down within a day, right to the next day, with announcements', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Keyboard Block', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  const status = (text: string) => page.getByRole('status').filter({ hasText: text });

  await card(page, 'Mon', 'Barbell Bench Press').getByRole('button', { name: 'Drag Barbell Bench Press' }).focus();
  await page.keyboard.press('Space');
  await expect(status('Barbell Bench Press is in its original position in Mon.')).toHaveCount(1);
  await page.keyboard.press('ArrowDown');
  await expect(status('Barbell Bench Press is over Cable Fly in Mon.')).toHaveCount(1);
  await page.keyboard.press('Space');
  await expect(column(page, 'Mon').getByRole('article')).toHaveText([/Cable Fly/, /Barbell Bench Press/, /Cable Pushdown/]);
  await expect(status('Moved Barbell Bench Press within Mon, position 2 of 3.')).toHaveCount(1);

  await card(page, 'Mon', 'Cable Pushdown').getByRole('button', { name: 'Drag Cable Pushdown' }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await expect(status('Cable Pushdown is over Tue.')).toHaveCount(1);
  await page.keyboard.press('Space');
  await expect(column(page, 'Tue').getByRole('article')).toHaveText([/Lat Pulldown/, /Cable Pushdown/]);
  await expect(status('Moved Cable Pushdown to Tue, position 2 of 2.')).toHaveCount(1);
});

test('scenario 3: duplicate "Push A" into "Push B" and confirm the cards and metrics copied', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, {
    name: 'Duplicate Block',
    days: [{ ...pushDay, name: 'Push A' }, { slots: [{ exercise: 'Lat Pulldown' }] }, { slots: [{ exercise: 'Leg Press' }] }],
  });
  await page.goto(`/mesocycles/${id}/build`);
  await expect(page.getByTestId('volume-total-chest')).toHaveText('8');

  await (await openDayMenu(page, 'Push A')).getByRole('menuitem', { name: 'Duplicate as new day' }).click();
  expect(await columnNames(page)).toEqual(['Push A', 'Push A (copy)', 'Day 3', 'Day 4']);
  const nameInput = column(page, 'Push A (copy)').getByLabel('Day name for Push A (copy)');
  await expect(nameInput).toBeFocused();
  await nameInput.fill('Push B');
  await nameInput.press('Enter');

  const bench = card(page, 'Push B', 'Barbell Bench Press');
  await expect(bench.getByTestId('value-Sets')).toHaveText('5');
  await expect(bench.getByLabel('Reps', { exact: true })).toHaveValue('5–10');
  await expect(bench.getByLabel('RIR')).toHaveValue('1');
  await expect(bench.getByLabel(/Weight/)).toHaveValue('102.5');
  const pushdown = card(page, 'Push B', 'Cable Pushdown');
  await expect(pushdown.getByLabel('Minimum reps')).toHaveValue('12');
  await expect(pushdown.getByLabel('Maximum reps')).toHaveValue('15');
  await expect(pushdown.getByLabel(/Weight/)).toHaveValue('40');
  await expect(column(page, 'Push B').getByRole('article')).toHaveCount(3);

  await expect(page.getByTestId('volume-total-chest')).toHaveText('16');
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('2×/wk');
  // The copy is independent of the source.
  await bench.getByRole('button', { name: 'Increase Sets' }).click();
  await expect(card(page, 'Push A', 'Barbell Bench Press').getByTestId('value-Sets')).toHaveText('5');

  await waitForSaved(page);
  await page.reload();
  expect(await columnNames(page)).toEqual(['Push A', 'Push B', 'Day 3', 'Day 4']);
  await expect(card(page, 'Push B', 'Barbell Bench Press').getByTestId('value-Sets')).toHaveText('6');
});

test('in a Mon-Sun week a day is copied into another day instead of duplicated', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Copy Block', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  const menu = await openDayMenu(page, 'Mon');
  await expect(menu.getByRole('menuitem', { name: 'Duplicate as new day' })).toHaveCount(0);
  await menu.getByRole('group', { name: 'Copy exercises to' }).getByRole('menuitem', { name: 'Thu' }).click();
  await expect(column(page, 'Thu').getByRole('article')).toHaveText([/Barbell Bench Press/, /Cable Fly/, /Cable Pushdown/]);
  await expect(card(page, 'Thu', 'Barbell Bench Press').getByLabel(/Weight/)).toHaveValue('102.5');
  await expect(page.getByTestId('day-column')).toHaveCount(7);
  await expect(page.getByTestId('volume-total-chest')).toHaveText('16');
});

test('duplicating stops at 10 days', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Ten Block', days: [pushDay, {}, {}, {}, {}, {}, {}, {}, {}] });
  await page.goto(`/mesocycles/${id}/build`);
  await (await openDayMenu(page, 'Day 1')).getByRole('menuitem', { name: 'Duplicate as new day' }).click();
  await expect(page.getByTestId('day-column')).toHaveCount(10);
  await expect(page.getByRole('button', { name: '+ Add day' })).toHaveCount(0);
  await expect((await openDayMenu(page, 'Day 1')).getByRole('menuitem', { name: 'Duplicate as new day' })).toHaveCount(0);
});
