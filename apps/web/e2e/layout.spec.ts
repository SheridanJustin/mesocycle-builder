import { expect, test } from '@playwright/test';
import { createPopulatedDraft, type DaySpec } from './api-helpers';
import { column, gotoTab, settingsSaved } from './helpers';

const week: DaySpec[] = [
  { slots: [{ exercise: 'Barbell Bench Press', sets: 4 }, { exercise: 'Incline Dumbbell Press' }, { exercise: 'Cable Lateral Raise', sets: 4 }, { exercise: 'Cable Pushdown' }] },
  { slots: [{ exercise: 'Pull-Up', sets: 4 }, { exercise: 'Seated Cable Row' }, { exercise: 'Face Pull' }, { exercise: 'Hammer Curl' }] },
  {},
  { slots: [{ exercise: 'Barbell Back Squat', sets: 4 }, { exercise: 'Romanian Deadlift' }, { exercise: 'Leg Extension' }, { exercise: 'Standing Calf Raise', sets: 4 }] },
  { slots: [{ exercise: 'Machine Chest Press' }, { exercise: 'Dumbbell Lateral Raise', sets: 4 }, { exercise: 'Lat Pulldown' }] },
  {},
  {},
];

const overflows = (selector: string) => (page: import('@playwright/test').Page) =>
  page.locator(selector).first().evaluate((el) => ({ x: el.scrollWidth > el.clientWidth + 1, y: el.scrollHeight > el.clientHeight + 1 }));

test('a full week fits a 1440x900 window: no page scrolling, no sideways board, no volume-bar scrollbar', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const id = await createPopulatedDraft(request, { name: 'Fit Block', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  await expect(page.getByTestId('volume-chip-chest')).toBeVisible();

  expect(await overflows('html')(page)).toEqual({ x: false, y: false });
  expect((await overflows('[data-testid="board"]')(page)).x).toBe(false);
  expect((await overflows('[data-testid="volume-bar"] ul')(page)).x).toBe(false);
  for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) await expect(column(page, day)).toBeInViewport();

  // The day menu of a short rest-day column is not clipped.
  await column(page, 'Wed').getByRole('button', { name: 'Wed menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeInViewport();
  await page.keyboard.press('Escape');

  await gotoTab(page, 'Review');
  await expect(page.getByTestId('review-row-chest')).toBeVisible();
  expect(await overflows('html')(page)).toEqual({ x: false, y: false });
});

test('a short cycle is centered on wide screens', async ({ page, request }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const id = await createPopulatedDraft(request, { name: 'Center Block', days: [week[0]!, week[1]!, week[3]!] });
  await page.goto(`/mesocycles/${id}/build`);
  const first = await column(page, 'Day 1').boundingBox();
  const last = await column(page, 'Day 3').boundingBox();
  if (!first || !last) throw new Error('columns not rendered');
  const leftGap = first.x;
  const rightGap = 1920 - (last.x + last.width);
  expect(leftGap).toBeGreaterThan(200);
  expect(Math.abs(leftGap - rightGap)).toBeLessThan(40);
});

test('the mesocycle name can be renamed right on the main screen', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Untitled mesocycle', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  const title = page.getByTestId('mesocycle-title');
  const saved = settingsSaved(page, 'name');
  await title.fill('Summer Push Block');
  await title.press('Enter');
  await saved;
  await expect(page.getByTestId('save-indicator')).toHaveText(/Saved|All changes saved/);
  await page.reload();
  await expect(page.getByTestId('mesocycle-title')).toHaveValue('Summer Push Block');
});

test('an info button explains MV, MEV, MAV and MRV in plain language', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Info Block', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  await page.getByTestId('volume-bar').getByRole('button', { name: 'What do MV, MEV, MAV and MRV mean?' }).click();
  const info = page.getByTestId('landmark-info');
  await expect(info).toContainText('MV (Maintenance Volume): ~6 sets per week maintains current muscle mass');
  await expect(info).toContainText('MEV (Minimum Effective Volume): Starting point for growth, varies by training experience');
  await expect(info).toContainText('MAV (Maximum Adaptive Volume): Sweet spot range between MEV and MRV for optimal gains');
  await expect(info).toContainText('MRV (Maximum Recoverable Volume): Upper limit before recovery fails and gains stop');
  // Each term carries the chip color of its zone, with the five zones listed in order.
  await expect(info.locator('[data-color]').filter({ hasText: /^MV$/ })).toHaveAttribute('data-color', 'amber');
  await expect(info.locator('[data-color]').filter({ hasText: /^MRV$/ })).toHaveAttribute('data-color', 'red');
  await expect(info.getByTestId('volume-zones').locator('span')).toHaveText(['Below MEV', 'MEV to MAV', 'In MAV', 'Above MAV', 'Over MRV']);
  await page.keyboard.press('Escape');
  await expect(info).toHaveCount(0);
});

test('Review explains the deload week on hover and Lock in opens a confirmation', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Deload Block', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoTab(page, 'Review');

  await page.getByRole('button', { name: 'What does the deload week do?' }).hover();
  const tip = page.getByTestId('deload-info');
  await expect(tip).toContainText('half its sets');
  await expect(tip).toContainText('same rep range');
  await expect(tip).toContainText('Week 1 RIR');
  // 51 weekly sets; deload = sum of ceil(sets / 2) = 30.
  await expect(page.getByTestId('deload-example')).toHaveText('For this mesocycle: 51 sets per week → 30 sets in the deload week.');
  await page.mouse.move(0, 0);
  await expect(tip).toHaveCount(0);

  await page.getByRole('button', { name: 'Lock in mesocycle' }).click();
  await expect(page.getByRole('dialog', { name: 'Lock in mesocycle' })).toContainText('freezes this plan');
  await page.getByRole('dialog', { name: 'Lock in mesocycle' }).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Lock in mesocycle' })).toBeHidden();
});

test('unknown pages show a friendly 404 with a way back', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to my mesocycles' }).click();
  await page.waitForURL(/\/mesocycles$/);
});

test('a mesocycle that does not exist shows a clear message on both of its pages', async ({ page }) => {
  for (const path of ['/mesocycles/00000000-0000-4000-8000-000000000000', '/mesocycles/00000000-0000-4000-8000-000000000000/build']) {
    await page.goto(path);
    await expect(page.getByRole('alert').filter({ hasText: 'Mesocycle not found.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to mesocycles' })).toBeVisible();
  }
});

test('training-day columns keep a fixed width whatever the window size', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Width Block', days: [week[0]!, week[1]!, week[3]!] });
  for (const [width, expected] of [
    [600, 320],
    [1024, 224],
    [1920, 224],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/mesocycles/${id}/build`);
    const box = await column(page, 'Day 1').boundingBox();
    expect(Math.round(box!.width), `at ${width}px`).toBe(expected);
  }
});

test('a rest day shows its whole name', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Rest Names', days: [week[0]!, { name: 'Wednesday' }, { name: 'Day 10' }], numbered: true });
  await page.goto(`/mesocycles/${id}/build`);
  for (const name of ['Wednesday', 'Day 10']) {
    const input = column(page, name).getByRole('textbox', { name: `Day name for ${name}` });
    await expect(input).toHaveValue(name);
    expect(await input.evaluate((el) => el.scrollWidth <= el.clientWidth), name).toBe(true);
  }
});
