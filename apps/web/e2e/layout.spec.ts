import { expect, test } from '@playwright/test';
import { createPopulatedDraft, type DaySpec } from './api-helpers';
import { column, gotoTab } from './helpers';

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

test('the block name can be renamed right on the main screen', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Untitled block', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  const title = page.getByTestId('mesocycle-title');
  await title.fill('Summer Push Block');
  await title.press('Enter');
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
  await page.keyboard.press('Escape');
  await expect(info).toHaveCount(0);
});

test('Review explains the deload week on hover and has a Lock in button', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Deload Block', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoTab(page, 'Review');

  await page.getByRole('button', { name: 'What does the deload week do?' }).hover();
  const tip = page.getByTestId('deload-info');
  await expect(tip).toContainText('half its sets');
  await expect(tip).toContainText('same rep range');
  await expect(tip).toContainText('Week 1 RIR');
  // 51 weekly sets; deload = sum of ceil(sets / 2) = 30.
  await expect(page.getByTestId('deload-example')).toHaveText('For this block: 51 sets per week → 30 sets in the deload week.');
  await page.mouse.move(0, 0);
  await expect(tip).toHaveCount(0);

  await page.getByRole('button', { name: 'Lock in block' }).click();
  await expect(page.getByRole('dialog', { name: 'Lock in block' })).toContainText('Lock-in is coming soon');
  await page.getByRole('dialog', { name: 'Lock in block' }).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Lock in block' })).toBeHidden();
});

test('Log in opens an email and password form (placeholder, sends nothing)', async ({ page }) => {
  await page.goto('/mesocycles');
  const requests: string[] = [];
  page.on('request', (req) => requests.push(req.url()));
  await page.getByRole('button', { name: 'Log in' }).click();
  const dialog = page.getByRole('dialog', { name: 'Log in' });
  await dialog.getByLabel('Email').fill('lifter@example.com');
  await dialog.getByLabel('Password').fill('not-a-real-password');
  await dialog.getByRole('button', { name: 'Log in' }).click();
  await expect(dialog.getByRole('status')).toContainText('Accounts are coming soon');
  expect(requests.filter((url) => url.includes('/api/'))).toEqual([]);
});
