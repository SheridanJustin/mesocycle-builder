import { expect, test } from '@playwright/test';
import { createPopulatedDraft } from './api-helpers';
import { card, center, column, dragTo, gotoStep, waitForSaved } from './helpers';

// A tall viewport keeps cards out of dnd-kit's edge auto-scroll zones, so drags are deterministic.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
});

const days = [
  {
    name: 'Day 1',
    muscles: ['chest', 'triceps'],
    slots: [
      { muscle: 'chest', exercise: 'Barbell Bench Press', sets: 5, repMin: 5, repMax: 10, rir: 1, weight: 102.5 },
      { muscle: 'chest', exercise: 'Cable Fly', sets: 3 },
      { muscle: 'triceps', exercise: 'Cable Pushdown', sets: 4, repMin: 12, repMax: 15, rir: 2, weight: 40 },
    ],
  },
  { name: 'Day 2', muscles: ['lats'], slots: [{ muscle: 'lats', exercise: 'Lat Pulldown', sets: 3 }] },
  { name: 'Day 3', muscles: ['quads'], slots: [{ muscle: 'quads', exercise: 'Leg Press', sets: 3 }] },
  { name: 'Day 4', muscles: [], slots: [] },
];

test('scenario 2: drag a card from column 1 to column 3, metrics survive and volume is recomputed', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Drag Block', days });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoStep(page, 'Exercises');

  // Before: all chest work is on Day 1.
  await expect(page.getByTestId('volume-total-chest')).toHaveText('8');
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('1×/wk');

  const handle = card(page, 'Day 1', 'Barbell Bench Press').getByRole('button', { name: 'Drag Barbell Bench Press' });
  await dragTo(page, await center(handle), await center(column(page, 'Day 3')));

  // The card now lives in column 3 under a freshly created Chest section, with every metric intact.
  await expect(card(page, 'Day 1', 'Barbell Bench Press')).toHaveCount(0);
  const moved = card(page, 'Day 3', 'Barbell Bench Press');
  await expect(moved).toBeVisible();
  await expect(column(page, 'Day 3').getByRole('region', { name: 'Chest section' })).toBeVisible();
  await expect(moved.getByTestId('value-Sets')).toHaveText('5');
  await expect(moved.getByLabel('Reps', { exact: true })).toHaveValue('5–10');
  await expect(moved.getByLabel('RIR')).toHaveValue('1');
  await expect(moved.getByLabel(/Weight/)).toHaveValue('102.5');
  // The other cards were untouched.
  await expect(card(page, 'Day 1', 'Cable Fly')).toBeVisible();
  await expect(card(page, 'Day 3', 'Leg Press')).toBeVisible();

  // Volume recomputed: same chest total, but chest is now trained on two days.
  await expect(page.getByTestId('volume-total-chest')).toHaveText('8');
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('2×/wk');
  await expect(column(page, 'Day 1')).toContainText('2 exercises');
  await expect(column(page, 'Day 3')).toContainText('2 exercises');

  // It was saved: survives a reload.
  await waitForSaved(page);
  await page.reload();
  await gotoStep(page, 'Exercises');
  const reloaded = card(page, 'Day 3', 'Barbell Bench Press');
  await expect(reloaded.getByTestId('value-Sets')).toHaveText('5');
  await expect(reloaded.getByLabel(/Weight/)).toHaveValue('102.5');
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('2×/wk');
});

test('M7: dropping on a specific card positions the dragged card; same-column drags reorder', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Position Block', days });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoStep(page, 'Exercises');

  // Drag Cable Fly (below) onto Bench Press (above) within the Chest section.
  const chestCards = column(page, 'Day 1').getByRole('region', { name: 'Chest section' }).getByRole('article');
  await expect(chestCards.nth(0)).toHaveAccessibleName('Barbell Bench Press');
  const fly = card(page, 'Day 1', 'Cable Fly');
  await dragTo(page, await center(fly.getByRole('button', { name: 'Drag Cable Fly' })), await center(card(page, 'Day 1', 'Barbell Bench Press')));
  await expect(chestCards.nth(0)).toHaveAccessibleName('Cable Fly');
  await expect(chestCards.nth(1)).toHaveAccessibleName('Barbell Bench Press');

  // Drag the Lat Pulldown card from column 2 onto the Leg Press card in column 3: it joins the
  // Lats section it needs there, because the Leg Press card is in a different (Quads) section.
  const lat = card(page, 'Day 2', 'Lat Pulldown');
  await dragTo(page, await center(lat.getByRole('button', { name: 'Drag Lat Pulldown' })), await center(card(page, 'Day 3', 'Leg Press')));
  await expect(card(page, 'Day 2', 'Lat Pulldown')).toHaveCount(0);
  await expect(column(page, 'Day 3').getByRole('region', { name: 'Lats section' }).getByRole('article')).toHaveAccessibleName('Lat Pulldown');
  await expect(column(page, 'Day 3').getByRole('region', { name: 'Quads section' }).getByRole('article')).toHaveAccessibleName('Leg Press');
});

test('M7: the board auto-scrolls sideways when a dragged card nears the edge', async ({ page, request }) => {
  await page.setViewportSize({ width: 700, height: 800 });
  const id = await createPopulatedDraft(request, {
    name: 'Scroll Block',
    days: [days[0]!, days[1]!, { name: 'Day 3', muscles: [], slots: [] }, { name: 'Day 4', muscles: [], slots: [] }, { name: 'Day 5', muscles: [], slots: [] }, { name: 'Day 6', muscles: [], slots: [] }],
  });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoStep(page, 'Exercises');

  const board = page.getByTestId('board');
  const startLeft = await board.evaluate((el) => el.scrollLeft);
  const handle = card(page, 'Day 1', 'Barbell Bench Press').getByRole('button', { name: 'Drag Barbell Bench Press' });
  const from = await center(handle);
  // Hold near the right edge of the board without releasing.
  await dragTo(page, from, { x: 690, y: from.y }, { release: false });
  await expect.poll(() => board.evaluate((el) => el.scrollLeft), { timeout: 5000 }).toBeGreaterThan(startLeft + 100);
  await page.mouse.up();

  // The card ended up in a later column (not Day 1), and the page itself never scrolled sideways.
  await expect(card(page, 'Day 1', 'Barbell Bench Press')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('M7: cards can be reordered with the keyboard and announce the result', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Keyboard Block', days });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoStep(page, 'Exercises');

  const chestCards = column(page, 'Day 1').getByRole('region', { name: 'Chest section' }).getByRole('article');
  await expect(chestCards.nth(0)).toHaveAccessibleName('Barbell Bench Press');

  await card(page, 'Day 1', 'Barbell Bench Press').getByRole('button', { name: 'Drag Barbell Bench Press' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('drag-preview')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Barbell Bench Press is in its original position in Day 1.' })).toHaveCount(1);
  await page.keyboard.press('ArrowDown');
  // Wait for the move to register (it is announced) before dropping.
  await expect(page.getByRole('status').filter({ hasText: 'Barbell Bench Press is over Cable Fly in Day 1.' })).toHaveCount(1);
  await page.keyboard.press('Space');

  await expect(chestCards.nth(0)).toHaveAccessibleName('Cable Fly');
  await expect(chestCards.nth(1)).toHaveAccessibleName('Barbell Bench Press');
  await expect(page.getByRole('status').filter({ hasText: 'Moved Barbell Bench Press within Day 1, Chest section, position 2 of 2.' })).toHaveCount(1);
});

test('scenario 3: duplicate "Push A" into "Push B" and confirm the cards and metrics copied', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, {
    name: 'Duplicate Block',
    days: [{ ...days[0]!, name: 'Push A' }, { ...days[1]!, name: 'Pull A' }, { ...days[2]!, name: 'Legs' }],
    priorities: [{ muscle: 'chest', priority: 'focus' }],
  });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoStep(page, 'Exercises');

  await expect(page.getByTestId('volume-total-chest')).toHaveText('8');
  await column(page, 'Push A').getByRole('button', { name: 'Push A menu' }).click();
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();

  // The copy appears immediately to the right of the source, ready to be renamed inline.
  const copy = column(page, 'Push A (copy)');
  await expect(copy).toBeVisible();
  const names = await page.getByTestId('day-column').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
  expect(names).toEqual(['Push A column', 'Push A (copy) column', 'Pull A column', 'Legs column']);
  const nameInput = copy.getByLabel('Day name for Push A (copy)');
  await expect(nameInput).toBeFocused();
  await nameInput.fill('Push B');
  await nameInput.press('Enter');
  await expect(column(page, 'Push B')).toBeVisible();

  // Every card and every metric was copied.
  const bench = card(page, 'Push B', 'Barbell Bench Press');
  await expect(bench.getByTestId('value-Sets')).toHaveText('5');
  await expect(bench.getByLabel('Reps', { exact: true })).toHaveValue('5–10');
  await expect(bench.getByLabel('RIR')).toHaveValue('1');
  await expect(bench.getByLabel(/Weight/)).toHaveValue('102.5');
  await expect(card(page, 'Push B', 'Cable Fly').getByTestId('value-Sets')).toHaveText('3');
  const pushdown = card(page, 'Push B', 'Cable Pushdown');
  await expect(pushdown.getByTestId('value-Sets')).toHaveText('4');
  await expect(pushdown.getByLabel('Reps', { exact: true })).toHaveValue('custom');
  await expect(pushdown.getByLabel('Minimum reps')).toHaveValue('12');
  await expect(pushdown.getByLabel('Maximum reps')).toHaveValue('15');
  await expect(pushdown.getByLabel('RIR')).toHaveValue('2');
  await expect(pushdown.getByLabel(/Weight/)).toHaveValue('40');
  await expect(column(page, 'Push B').getByRole('region', { name: 'Chest section' })).toBeVisible();
  await expect(column(page, 'Push B').getByRole('region', { name: 'Triceps section' })).toBeVisible();

  // The source is unchanged, and the copy counts toward volume.
  await expect(card(page, 'Push A', 'Barbell Bench Press').getByTestId('value-Sets')).toHaveText('5');
  await expect(page.getByTestId('volume-total-chest')).toHaveText('16');
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('2×/wk');

  // The copy is independent of the source: editing it leaves the original alone.
  await bench.getByRole('button', { name: 'Increase Sets' }).click();
  await expect(card(page, 'Push A', 'Barbell Bench Press').getByTestId('value-Sets')).toHaveText('5');

  // Persists, in order.
  await waitForSaved(page);
  await page.reload();
  await gotoStep(page, 'Exercises');
  const reloaded = await page.getByTestId('day-column').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
  expect(reloaded).toEqual(['Push A column', 'Push B column', 'Pull A column', 'Legs column']);
  await expect(card(page, 'Push B', 'Barbell Bench Press').getByTestId('value-Sets')).toHaveText('6');
});

test('M7: duplicating is blocked at 7 days and deleting a day with exercises asks first', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, {
    name: 'Seven Block',
    days: [days[0]!, days[1]!, days[2]!, { name: 'Day 4', muscles: [], slots: [] }, { name: 'Day 5', muscles: [], slots: [] }, { name: 'Day 6', muscles: [], slots: [] }],
  });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoStep(page, 'Exercises');

  // The 7th day is allowed via Duplicate (the "Add day" column disappears at 6).
  await expect(page.getByRole('button', { name: '+ Add day' })).toHaveCount(0);
  await column(page, 'Day 1').getByRole('button', { name: 'Day 1 menu' }).click();
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect(column(page, 'Day 1 (copy)')).toBeVisible();
  await expect(page.getByTestId('day-column')).toHaveCount(7);

  // At 7 days Duplicate is disabled.
  await column(page, 'Day 2').getByRole('button', { name: 'Day 2 menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeDisabled();
  await page.keyboard.press('Escape');

  // Deleting a day that has exercises asks for confirmation with the counts.
  await column(page, 'Day 1 (copy)').getByRole('button', { name: 'Day 1 (copy) menu' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByRole('dialog')).toContainText('2 muscle group(s) and 3 exercise(s)');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete day' }).click();
  await expect(page.getByTestId('day-column')).toHaveCount(6);
});
