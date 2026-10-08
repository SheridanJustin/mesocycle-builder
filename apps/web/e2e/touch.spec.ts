import { expect, test, type Page } from '@playwright/test';
import { createPopulatedDraft, type DaySpec } from './api-helpers';
import { card, center, column, columnNames } from './helpers';

// Phones: real touch events (Chrome DevTools Protocol), as a finger would send them. Pressing and
// holding a card or a day header picks it up; moving the finger then drags it instead of scrolling.
test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, holdAtEndMs = 0) {
  const cdp = await page.context().newCDPSession(page);
  const point = (p: { x: number; y: number }) => [{ x: Math.round(p.x), y: Math.round(p.y) }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from) });
  // Hold still long enough for the press-and-hold to pick it up.
  await page.waitForTimeout(450);
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: point({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }),
    });
    await page.waitForTimeout(16);
  }
  // Resting near the board's edge lets it auto-scroll (as a finger would wait for it).
  for (let waited = 0; waited < holdAtEndMs; waited += 100) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(to) });
    await page.waitForTimeout(100);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

const days: DaySpec[] = [
  { name: 'Push', slots: [{ exercise: 'Barbell Bench Press', sets: 4 }, { exercise: 'Cable Fly' }, { exercise: 'Cable Pushdown' }] },
  { name: 'Pull', slots: [{ exercise: 'Lat Pulldown' }] },
];

test('a card is dragged by touch to a new position', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Touch Cards', days, numbered: true });
  await page.goto(`/mesocycles/${id}/build`);
  const push = column(page, 'Push').getByRole('article');
  await expect(push).toHaveText([/Barbell Bench Press/, /Cable Fly/, /Cable Pushdown/]);

  await touchDrag(page, await center(card(page, 'Push', 'Cable Pushdown').getByRole('heading')), await center(card(page, 'Push', 'Barbell Bench Press').getByRole('heading')));
  await expect(push).toHaveText([/Cable Pushdown/, /Barbell Bench Press/, /Cable Fly/]);
  await expect(card(page, 'Push', 'Barbell Bench Press').getByTestId('value-Sets')).toHaveText('4');
});

test('a day is dragged by touch on its header', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Touch Days', days, numbered: true });
  await page.goto(`/mesocycles/${id}/build`);
  expect(await columnNames(page)).toEqual(['Push', 'Pull']);
  const board = page.getByTestId('board');
  // Pull is off to the right on a phone: bring it into view, then drag it to the left edge.
  await board.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect(column(page, 'Pull').getByTestId('day-grip')).toBeInViewport();
  const from = await center(column(page, 'Pull').getByTestId('day-grip'));
  await touchDrag(page, from, { x: 8, y: from.y }, 2500);
  await expect.poll(() => columnNames(page), { timeout: 10_000 }).toEqual(['Pull', 'Push']);
});

test('a quick swipe on a card still scrolls the board instead of dragging', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Touch Scroll', days, numbered: true });
  await page.goto(`/mesocycles/${id}/build`);
  const board = page.getByTestId('board');
  const before = await board.evaluate((el) => el.scrollLeft);
  const from = await center(card(page, 'Push', 'Cable Fly').getByRole('heading'));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x - i * 25, y: from.y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => board.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before);
  await expect(column(page, 'Push').getByRole('article')).toHaveText([/Barbell Bench Press/, /Cable Fly/, /Cable Pushdown/]);
});

test('mesocycles on the list are reordered by touch with their grip', async ({ page, request }) => {
  const stamp = Date.now().toString(36);
  const [a, b] = ['A', 'B'].map((n) => `Touch ${n} ${stamp}`) as [string, string];
  for (const name of [a, b]) await createPopulatedDraft(request, { name, days: [{}, {}, {}, {}, {}, {}, {}] });
  await page.goto('/mesocycles');
  const order = async () => (await page.getByTestId('mesocycle-card').getByRole('link').allTextContents()).filter((n) => n.endsWith(stamp));
  await expect.poll(order).toEqual([b, a]);
  // On a phone the cards are stacked: drag A's grip up onto B.
  const saved = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().endsWith('/mesocycles/order'));
  await touchDrag(page, await center(page.getByRole('button', { name: `Move ${a}` })), await center(page.getByRole('button', { name: `Move ${b}` })));
  await expect.poll(order).toEqual([a, b]);
  await saved;
});
