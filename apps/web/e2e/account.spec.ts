import { expect, test, type Page } from '@playwright/test';
import { createPopulatedDraft, type DaySpec } from './api-helpers';
import { gotoTab } from './helpers';

// Each test uses a brand-new account, so the RIR preference and the stats start fresh.
test.use({ storageState: { cookies: [], origins: [] } });

async function freshAccount(page: Page, name: string): Promise<string> {
  const email = `${name.toLowerCase()}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;
  const created = await page.request.post('/api/v1/auth/register', { data: { email, password: 'account-test-1', name } });
  expect(created.status()).toBe(201);
  await page.goto('/login');
  const form = page.getByRole('form', { name: 'Sign in' });
  await form.getByLabel('Email').fill(email);
  await form.getByLabel('Password').fill('account-test-1');
  await form.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/mesocycles$/);
  return email;
}

const week: DaySpec[] = [{ slots: [{ exercise: 'Barbell Bench Press', sets: 5, rir: 2 }] }, {}, {}, { slots: [{ exercise: 'Barbell Bench Press', sets: 5 }] }, {}, {}, {}];

async function openAccount(page: Page) {
  await page.getByRole('button', { name: 'Account' }).click();
  return page.getByRole('dialog', { name: 'Account' });
}

// Opens Settings from the account popup (client navigation, like a user would).
async function openSettings(page: Page) {
  await (await openAccount(page)).getByRole('link', { name: /Settings/ }).click();
  await page.waitForURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
}

const mePatched = (page: Page) => page.waitForResponse((r) => r.url().endsWith('/api/v1/me') && r.request().method() === 'PATCH');

test('the account popup keeps the basics; settings shows the account and training stats', async ({ page }) => {
  const email = await freshAccount(page, 'Robin');
  let panel = await openAccount(page);
  await expect(panel.getByTestId('account-name')).toHaveText('Robin');
  await expect(panel.getByTestId('account-email')).toHaveText(email);
  await expect(panel).toContainText('No active mesocycle');
  await expect(panel.getByRole('link', { name: /Personal bests/ })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(panel.getByRole('switch', { name: 'Show RIR' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);

  await openSettings(page);
  await expect(page.getByTestId('settings-email')).toHaveText(email);
  await expect(page.getByRole('main')).toContainText('email and password');
  await expect(page.getByTestId('stat-workouts')).toHaveText('0');

  // Lock a mesocycle and finish one workout: the stats follow.
  const id = await createPopulatedDraft(page.request, { name: 'Robin Plan', days: week });
  expect((await page.request.post(`/api/v1/mesocycles/${id}/lock`, { data: { start_date: '2026-10-05' } })).ok()).toBe(true);
  await page.goto(`/mesocycles/${id}`);
  // The pointer is still where the Settings link was, over a summary tile whose tooltip would cover the week tabs.
  await page.mouse.move(0, 0);
  await page.getByTestId('week-tab-1').click();
  await page.getByTestId('session-card').first().getByRole('link', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page.getByRole('dialog', { name: 'Some sets are empty' }).getByRole('button', { name: 'Finish anyway' }).click();
  await page.waitForURL(new RegExp(`/mesocycles/${id}$`));

  panel = await openAccount(page);
  await expect(panel.getByTestId('account-active')).toContainText('Robin Plan');
  await expect(panel.getByTestId('account-active')).toContainText('1/8 workouts');
  await page.keyboard.press('Escape');
  await openSettings(page);
  await expect(page.getByTestId('stat-workouts')).toHaveText('1');
  await expect(page.getByTestId('stat-sets')).toHaveText('5');
});

test('profile: the avatar icon, its color and the name are saved and shown in the header', async ({ page }) => {
  await freshAccount(page, 'Alex');
  const headerAvatar = page.getByRole('button', { name: 'Account' }).getByTestId('avatar');
  await expect(headerAvatar).toHaveAttribute('data-icon', 'initial');
  await expect(headerAvatar).toHaveText('A');

  await openSettings(page);
  let saved = mePatched(page);
  await page.getByRole('group', { name: 'Avatar icon' }).getByTitle('Kettlebell').click();
  expect((await saved).ok()).toBe(true);
  await expect(headerAvatar).toHaveAttribute('data-icon', 'kettlebell');
  saved = mePatched(page);
  await page.getByRole('group', { name: 'Avatar color' }).getByTitle('Red').click();
  expect((await saved).ok()).toBe(true);
  await expect(page.getByRole('group', { name: 'Avatar color' }).getByRole('radio', { name: 'Red' })).toBeChecked();

  saved = mePatched(page);
  await page.getByLabel('Name').fill('Alex Strong');
  await page.getByRole('button', { name: 'Save' }).click();
  expect((await saved).ok()).toBe(true);
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();

  await page.reload();
  await expect(headerAvatar).toHaveAttribute('data-icon', 'kettlebell');
  const panel = await openAccount(page);
  await expect(panel.getByTestId('account-name')).toHaveText('Alex Strong');
});

test('RIR can be switched off in settings: it disappears from cards, the plan and the deload text', async ({ page }) => {
  await freshAccount(page, 'Casey');
  const id = await createPopulatedDraft(page.request, { name: 'No RIR', days: week });
  await page.goto(`/mesocycles/${id}/build`);
  const card = page.getByRole('article', { name: 'Barbell Bench Press' }).first();
  await expect(card.getByLabel('RIR')).toBeVisible();

  await openSettings(page);
  const saved = mePatched(page);
  await page.getByText('Show RIR', { exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await expect(page.getByRole('switch', { name: 'Show RIR' })).not.toBeChecked();
  await page.goBack();
  await expect(card.getByLabel('RIR')).toHaveCount(0);
  await expect(card.getByLabel('Reps', { exact: true })).toBeVisible();

  await gotoTab(page, 'Review');
  await page.getByRole('button', { name: 'What does the deload week do?' }).hover();
  await expect(page.getByTestId('deload-info')).not.toContainText('RIR');

  // Saved to the account: still off after a reload, and on the locked plan.
  await page.reload();
  await expect(page.getByRole('article', { name: 'Barbell Bench Press' }).first().getByLabel('RIR')).toHaveCount(0);
  expect((await page.request.post(`/api/v1/mesocycles/${id}/lock`, { data: { start_date: '2026-10-05' } })).ok()).toBe(true);
  await page.goto(`/mesocycles/${id}`);
  await page.getByTestId('week-tab-1').click();
  await expect(page.getByTestId('session-exercise').first()).toHaveText(/5 × 8–12$/);

  // And back on.
  await openSettings(page);
  const again = mePatched(page);
  await page.getByText('Show RIR', { exact: true }).click();
  expect((await again).ok()).toBe(true);
  await page.goBack();
  await page.getByTestId('week-tab-1').click();
  await expect(page.getByTestId('session-exercise').first()).toContainText('RIR 2');
});

test('appearance: a palette and light or dark mode apply at once and are saved to the account', async ({ page }) => {
  await freshAccount(page, 'Jordan');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-palette', 'graphite');
  await expect(html).toHaveAttribute('data-mode', 'dark');
  const pageBackground = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-graphite-950').trim());
  const darkBackground = await pageBackground();

  await openSettings(page);
  await expect(page.getByRole('radiogroup', { name: 'Color palette' }).getByRole('radio')).toHaveCount(6);
  // Frost was designed light, so picking it switches to light mode.
  await page.getByTestId('palette-frost').click();
  await expect(html).toHaveAttribute('data-palette', 'frost');
  await expect(html).toHaveAttribute('data-mode', 'light');
  await expect(page.getByTestId('palette-frost')).toHaveAttribute('aria-checked', 'true');
  expect(await pageBackground()).not.toBe(darkBackground);

  // Any palette also has the other mode.
  const saved = mePatched(page);
  await page.getByRole('radiogroup', { name: 'Mode' }).getByRole('radio', { name: 'Dark' }).click();
  await expect(html).toHaveAttribute('data-mode', 'dark');
  expect((await saved).ok()).toBe(true);

  // Saved: the server renders the chosen theme after a reload (no flash of the default).
  await page.reload();
  await expect(html).toHaveAttribute('data-palette', 'frost');
  await expect(html).toHaveAttribute('data-mode', 'dark');
});
