import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { createPopulatedDraft, type DaySpec } from './api-helpers';
import { gotoTab } from './helpers';

// Mon and Thu train (balanced enough that lock-in has no warnings); the other days rest.
const week: DaySpec[] = [
  { slots: [{ exercise: 'Barbell Bench Press', sets: 5 }] },
  {},
  {},
  { slots: [{ exercise: 'Barbell Bench Press', sets: 5 }] },
  {},
  {},
  {},
];

async function lockedMesocycle(request: APIRequestContext, name: string, weeks = 3): Promise<string> {
  const id = await createPopulatedDraft(request, { name, days: week });
  expect((await request.patch(`/api/v1/mesocycles/${id}`, { data: { duration_weeks: weeks } })).ok()).toBe(true);
  expect((await request.post(`/api/v1/mesocycles/${id}/lock`, { data: { start_date: '2026-10-05' } })).ok()).toBe(true);
  return id;
}

const unique = (name: string) => `${name} ${Date.now().toString(36)}`;
const card = (page: Page, day: string) => page.getByTestId('session-card').filter({ has: page.getByRole('heading', { name: day, exact: true }) });

test('workouts can be completed, skipped and undone; a finished week and mesocycle are marked complete', async ({ page, request }) => {
  const name = unique('Tracked');
  const id = await lockedMesocycle(request, name);
  await page.goto(`/mesocycles/${id}`);
  await page.getByTestId('week-tab-1').click();

  // Rest days are shown too, with their dates.
  await expect(page.getByTestId('session-card')).toHaveCount(2);
  await expect(page.getByTestId('rest-card')).toHaveCount(5);
  await expect(page.getByTestId('rest-card').first()).toContainText('Tue');
  await expect(page.getByTestId('rest-card').first()).toContainText('Rest day');
  await expect(page.getByTestId('rest-card').first()).toContainText('Oct 6');

  await card(page, 'Mon').getByRole('button', { name: 'Complete' }).click();
  await expect(card(page, 'Mon').getByTestId('session-status')).toHaveText('✓ Completed');
  await expect(page.getByTestId('plan-progress')).toContainText('1 of 6 workouts done');
  await expect(page.getByTestId('week-complete')).toHaveCount(0);

  await card(page, 'Thu').getByRole('button', { name: 'Skip' }).click();
  await expect(card(page, 'Thu').getByTestId('session-status')).toHaveText('Skipped');
  await expect(page.getByTestId('week-complete')).toHaveText('✓ Week 1 complete.');
  await expect(page.getByTestId('week-tab-1')).toHaveAttribute('data-complete', 'true');

  await card(page, 'Thu').getByRole('button', { name: 'Undo' }).click();
  await expect(card(page, 'Thu').getByRole('button', { name: 'Skip' })).toBeVisible();
  await expect(page.getByTestId('week-complete')).toHaveCount(0);
  await card(page, 'Thu').getByRole('button', { name: 'Complete' }).click();
  await expect(page.getByTestId('week-complete')).toBeVisible();

  for (const n of [2, 3]) {
    await page.getByTestId(`week-tab-${n}`).click();
    for (const day of ['Mon', 'Thu']) {
      await card(page, day).getByRole('button', { name: 'Complete' }).click();
      await expect(card(page, day).getByTestId('session-status')).toHaveText('✓ Completed');
    }
  }
  await expect(page.getByRole('status').filter({ hasText: 'Mesocycle complete' })).toBeVisible();
  await expect(page.getByTestId('status-badge')).toHaveText('completed');
  await expect(page.getByTestId('plan-progress')).toContainText('6 of 6 workouts done');

  // Progress is saved, and the finished mesocycle moves to the archive.
  await page.reload();
  await page.getByTestId('week-tab-1').click();
  await expect(card(page, 'Mon').getByTestId('session-status')).toHaveText('✓ Completed');
  await page.goto('/mesocycles');
  await expect(page.getByTestId('mesocycle-card').filter({ hasText: name })).toHaveCount(0);
  await page.getByRole('tab', { name: /Archive/ }).click();
  await expect(page.getByTestId('mesocycle-card').filter({ hasText: name })).toContainText('completed');
});

test('an active mesocycle can be dropped; it goes to the archive and can then be deleted', async ({ page, request }) => {
  const name = unique('Dropped');
  const id = await lockedMesocycle(request, name);
  await page.goto('/mesocycles');
  const active = page.getByTestId('mesocycle-card').filter({ hasText: name });
  await expect(active).toContainText('active');
  await expect(active.getByRole('button', { name: `Delete ${name}` })).toHaveCount(0);

  await page.goto(`/mesocycles/${id}`);
  await page.getByRole('button', { name: 'Drop mesocycle' }).click();
  await page.getByRole('dialog', { name: 'Drop this mesocycle?' }).getByRole('button', { name: 'Drop mesocycle' }).click();
  await expect(page.getByTestId('status-badge')).toHaveText('dropped');
  await expect(page.getByRole('status').filter({ hasText: 'You dropped this mesocycle' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Drop mesocycle' })).toHaveCount(0);

  await page.goto('/mesocycles');
  await page.getByRole('tab', { name: /Archive/ }).click();
  const archived = page.getByTestId('mesocycle-card').filter({ hasText: name });
  await expect(archived).toContainText('dropped');
  await expect(archived).toContainText('Dropped ');
  await archived.getByRole('button', { name: `Delete ${name}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(archived).toHaveCount(0);
});

function pngSize(path: string): { width: number; height: number } {
  const buffer = readFileSync(path);
  expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('Review exports the schedule as a plain week PNG; so does the locked plan', async ({ page, request }) => {
  const name = unique('Export Me');
  const id = await createPopulatedDraft(request, { name, days: week });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoTab(page, 'Review');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export week as PNG' }).click()]);
  expect(download.suggestedFilename()).toBe(`${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-week.png`);
  // Seven 210 px columns, 14 px gaps and 32 px margins, drawn at 2x.
  expect(pngSize(await download.path()).width).toBe(2 * (64 + 7 * 210 + 6 * 14));

  await request.post(`/api/v1/mesocycles/${id}/lock`, { data: { start_date: '2026-10-05' } });
  await page.goto(`/mesocycles/${id}`);
  const [planDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export week as PNG' }).click()]);
  expect(pngSize(await planDownload.path()).height).toBeGreaterThan(200);
});

test('quick clicks on several workouts are all saved', async ({ page, request }) => {
  const id = await lockedMesocycle(request, unique('Quick'));
  await page.goto(`/mesocycles/${id}`);
  await page.getByTestId('week-tab-1').click();
  // Thu is clicked while Mon is still saving: each workout has its own pending state.
  await card(page, 'Mon').getByRole('button', { name: 'Complete' }).click();
  await card(page, 'Thu').getByRole('button', { name: 'Skip' }).click();
  await expect(card(page, 'Mon').getByTestId('session-status')).toHaveText('✓ Completed');
  await expect(card(page, 'Thu').getByTestId('session-status')).toHaveText('Skipped');
  await expect(page.getByTestId('week-complete')).toBeVisible();
  await page.reload();
  await page.getByTestId('week-tab-1').click();
  await expect(card(page, 'Mon').getByTestId('session-status')).toHaveText('✓ Completed');
  await expect(card(page, 'Thu').getByTestId('session-status')).toHaveText('Skipped');
});

test('only one mesocycle runs at a time: locking in pauses the running one, which can be resumed', async ({ page, request }) => {
  const firstName = unique('First');
  const first = await lockedMesocycle(request, firstName);

  // Locking in a second one through the UI warns that the first will be paused.
  const secondName = unique('Second');
  const second = await createPopulatedDraft(request, { name: secondName, days: week });
  await page.goto(`/mesocycles/${second}/build`);
  await gotoTab(page, 'Review');
  await page.getByRole('button', { name: 'Lock in mesocycle' }).click();
  const dialog = page.getByRole('dialog', { name: 'Lock in mesocycle' });
  await expect(dialog.getByTestId('lock-pauses')).toContainText(`${firstName} will be paused`);
  await dialog.getByRole('button', { name: 'Lock in', exact: true }).click();
  await page.waitForURL(new RegExp(`/mesocycles/${second}$`));

  await page.goto(`/mesocycles/${first}`);
  await expect(page.getByTestId('status-badge')).toHaveText('paused');
  await expect(page.getByRole('status').filter({ hasText: 'Paused' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume mesocycle' }).click();
  await expect(page.getByTestId('status-badge')).toHaveText('active');
  await expect(page.getByRole('button', { name: 'Complete' }).first()).toBeVisible();

  await page.goto('/mesocycles');
  const secondCard = page.getByTestId('mesocycle-card').filter({ hasText: secondName });
  await expect(secondCard).toContainText('paused');
  await expect(secondCard.getByRole('button', { name: `Delete ${secondName}` })).toHaveCount(0);
});
