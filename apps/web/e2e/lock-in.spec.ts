import { expect, test, type Page } from '@playwright/test';
import { createPopulatedDraft, type DaySpec } from './api-helpers';
import { center, dragTo, gotoTab } from './helpers';

// Mon and Thu train chest; the rest of the week is rest days.
function week(monday: DaySpec['slots'], thursday: DaySpec['slots']): DaySpec[] {
  return [{ slots: monday }, {}, {}, { slots: thursday }, {}, {}, {}];
}

const short = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

async function openLockDialog(page: Page) {
  await gotoTab(page, 'Review');
  await page.getByRole('button', { name: 'Lock in mesocycle' }).click();
  return page.getByRole('dialog', { name: 'Lock in mesocycle' });
}

test('scenario 4: over MRV turns the chip red and lock-in asks for acknowledgement', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, {
    name: 'Too Much Chest',
    days: week(
      [
        { exercise: 'Barbell Bench Press', sets: 10 },
        { exercise: 'Cable Fly', sets: 10 },
      ],
      [{ exercise: 'Pec Deck', sets: 3 }],
    ),
  });
  await page.goto(`/mesocycles/${id}/build`);
  await expect(page.getByTestId('volume-total-chest')).toHaveText('23');
  await expect(page.getByTestId('volume-status-chest')).toHaveText('Over MRV');
  await expect(page.getByTestId('volume-chip-chest')).toHaveCSS('border-top-color', 'rgb(239, 68, 68)');

  const dialog = await openLockDialog(page);
  await expect(dialog.getByTestId('lock-warnings')).toHaveText('Chest: Over MRV (23 sets per week)');
  const confirm = dialog.getByRole('button', { name: 'Lock in', exact: true });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('I understand and want to lock in anyway').check();
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await page.waitForURL(new RegExp(`/mesocycles/${id}$`));
  await expect(page.getByRole('heading', { name: 'Too Much Chest' })).toBeVisible();
  await expect(page.getByText('active', { exact: true })).toBeVisible();
});

test('scenario 5: lock in creates every week with dates and the RIR ramp; the plan is read-only', async ({ page, request }) => {
  const rampName = `Ramp Test ${Date.now().toString(36)}`;
  const id = await createPopulatedDraft(request, {
    name: rampName,
    days: week([{ exercise: 'Barbell Bench Press', sets: 5, rir: 3 }], [{ exercise: 'Incline Dumbbell Press', sets: 5, rir: 2 }]),
  });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoTab(page, 'Review');
  const patched = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes(`/mesocycles/${id}`));
  await page.getByLabel('Deload in the final week').check();
  await patched;

  const dialog = await openLockDialog(page);
  await expect(dialog.getByTestId('lock-summary')).toContainText('4 weeks × 2 workouts = 8 workouts');
  await expect(dialog.getByTestId('lock-summary')).toContainText('Week 4 is a deload');
  // Start next week rather than this one.
  const select = dialog.getByLabel('First week starts on');
  const nextMonday = await select.locator('option').nth(1).getAttribute('value');
  await select.selectOption(nextMonday!);
  await dialog.getByRole('button', { name: 'Lock in', exact: true }).click();
  await page.waitForURL(new RegExp(`/mesocycles/${id}$`));

  const tabs = page.getByRole('tablist', { name: 'Weeks' }).getByRole('tab');
  await expect(tabs).toHaveText(['Week 1', 'Week 2', 'Week 3', 'Week 4 · Deload']);
  const cards = page.getByTestId('session-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('Mon');
  await expect(cards.nth(0)).toContainText(short(nextMonday!));
  await expect(cards.nth(1)).toContainText(short(addDays(nextMonday!, 3)));

  const expected = [
    ['5 × 8–12 · RIR 3', '5 × 8–12 · RIR 2'],
    ['5 × 8–12 · RIR 2', '5 × 8–12 · RIR 1'],
    ['5 × 8–12 · RIR 1', '5 × 8–12 · RIR 0'],
    ['3 × 8–12 · RIR 3', '3 × 8–12 · RIR 2'],
  ];
  for (const [index, [mon, thu]] of expected.entries()) {
    await page.getByTestId(`week-tab-${index + 1}`).click();
    await expect(cards.nth(0).getByTestId('session-exercise')).toContainText(mon!);
    await expect(cards.nth(1).getByTestId('session-exercise')).toContainText(thu!);
  }
  await page.getByTestId('week-tab-4').click();
  await expect(cards.nth(0)).toContainText(short(addDays(nextMonday!, 21)));

  // The builder redirects to the plan, and the list no longer offers Delete.
  await page.goto(`/mesocycles/${id}/build`);
  await page.waitForURL(new RegExp(`/mesocycles/${id}$`));
  await page.goto('/mesocycles');
  const card = page.getByTestId('mesocycle-card').filter({ hasText: rampName });
  await expect(card).toContainText('active');
  await expect(card.getByRole('button', { name: `Delete ${rampName}` })).toHaveCount(0);
  await card.getByRole('link', { name: rampName }).click();
  await page.waitForURL(new RegExp(`/mesocycles/${id}$`));
});

test('lock-in is offered only once a day has an exercise', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Empty Lock', days: [{}, {}, {}, {}, {}, {}, {}] });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoTab(page, 'Review');
  await expect(page.getByRole('button', { name: 'Lock in mesocycle' })).toBeDisabled();
  await expect(page.getByText('Add at least one exercise to lock in.')).toBeVisible();
});

test('mesocycles on the list can be reordered by dragging (pointer and keyboard)', async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const stamp = Date.now().toString(36);
  const [a, b, c] = ['A', 'B', 'C'].map((n) => `Order ${n} ${stamp}`) as [string, string, string];
  for (const name of [a, b, c]) await createPopulatedDraft(request, { name, days: [{}, {}, {}, {}, {}, {}, {}] });

  await page.goto('/mesocycles');
  const order = async () =>
    (await page.getByTestId('mesocycle-card').getByRole('link').allTextContents()).filter((name) => name.endsWith(stamp));
  await expect.poll(order).toEqual([c, b, a]);

  const grip = (name: string) => page.getByRole('button', { name: `Move ${name}` });
  const saved = () => page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().endsWith('/mesocycles/order'));
  const status = (text: string) => page.getByRole('status').filter({ hasText: text });

  let save = saved();
  await dragTo(page, await center(grip(a)), await center(grip(c)));
  await expect.poll(order).toEqual([a, c, b]);
  await save;

  save = saved();
  await grip(b).focus();
  await page.keyboard.press('Space');
  await expect(status(`${b} is over position 3 of`)).toHaveCount(1);
  // dnd-kit starts listening for arrow keys on the next tick after a pick-up; a test types faster than that.
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowLeft');
  await expect(status(`${b} is over position 2 of`)).toHaveCount(1);
  await page.keyboard.press('Space');
  await expect.poll(order).toEqual([a, b, c]);
  await save;

  await page.reload();
  await expect.poll(order).toEqual([a, b, c]);
});

test('the delete button on a draft is clearly visible', async ({ page, request }) => {
  const name = `Visible Delete ${Date.now().toString(36)}`;
  await createPopulatedDraft(request, { name, days: [{}, {}, {}, {}, {}, {}, {}] });
  await page.goto('/mesocycles');
  const button = page.getByRole('button', { name: `Delete ${name}` });
  await expect(button).toBeVisible();
  await expect(button).toHaveText('Delete');
});

test('the landmark info explains that values differ per muscle, and the ticks stand out in grey', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Ticks', days: week([{ exercise: 'Barbell Bench Press', sets: 5 }], []) });
  await page.goto(`/mesocycles/${id}/build`);
  await page.getByTestId('volume-bar').getByRole('button', { name: 'What do MV, MEV, MAV and MRV mean?' }).click();
  await expect(page.getByTestId('landmark-info-varies')).toHaveText(
    'Values differ per muscle: muscles worked hard by compound lifts (shoulders, abs, glutes) need little or no direct work to maintain.',
  );
  const tick = page.getByTestId('volume-chip-chest').locator('[data-mark]').first();
  const box = await tick.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(2);
  // A mid grey (graphite-400): visible without being as harsh as white.
  await expect(tick).toHaveCSS('background-color', 'rgb(156, 149, 157)');
});
