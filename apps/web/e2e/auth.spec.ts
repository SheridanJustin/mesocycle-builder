import { expect, test, type Browser, type Page } from '@playwright/test';
import { E2E_EMAIL } from './global-setup';

// Next.js adds its own empty role="alert" route announcer; match ours by text.
const alert = (page: Page, text: string) => page.getByRole('alert').filter({ hasText: text });

// These tests start signed out.
test.use({ storageState: { cookies: [], origins: [] } });

const unique = (name: string) => `${name}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;

async function createAccount(page: Page, email: string, password: string, name?: string) {
  await page.goto('/login');
  await page.getByRole('tab', { name: 'Create account' }).click();
  const form = page.getByRole('form', { name: 'Create account' });
  if (name) await form.getByLabel('Name').fill(name);
  await form.getByLabel('Email').fill(email);
  await form.getByLabel('Password').fill(password);
  await form.getByRole('button', { name: 'Create account' }).click();
}

async function signIn(page: Page, email: string, password: string) {
  const form = page.getByRole('form', { name: 'Sign in' });
  await form.getByLabel('Email').fill(email);
  await form.getByLabel('Password').fill(password);
  await form.getByRole('button', { name: 'Sign in' }).click();
}

test('signed-out visitors are sent to the login page and the API refuses them', async ({ page, request }) => {
  await page.goto('/mesocycles');
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fmesocycles$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  // Google is offered only when it is configured (it is not in the e2e environment).
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);

  const response = await request.get('/api/v1/mesocycles');
  expect(response.status()).toBe(401);
  expect(((await response.json()) as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
});

test('create an account, sign out, and sign back in', async ({ page }) => {
  const email = unique('new');
  await createAccount(page, email, 'my long password', 'Pat Lifter');
  await page.waitForURL(/\/mesocycles$/);
  await expect(page.getByTestId('account-label')).toHaveText('Pat Lifter');
  await expect(page.getByText('No mesocycles yet')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL(/\/login/);
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();

  await signIn(page, email, 'wrong password');
  await expect(alert(page, 'Email or password is incorrect.')).toBeVisible();
  await signIn(page, email, 'my long password');
  await page.waitForURL(/\/mesocycles$/);
  await expect(page.getByTestId('account-label')).toHaveText('Pat Lifter');
});

test('an email that already has an account cannot be registered again', async ({ page }) => {
  await createAccount(page, E2E_EMAIL, 'another password');
  await expect(alert(page, 'already exists')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('after signing in, the visitor returns to the page they asked for', async ({ page }) => {
  const email = unique('back');
  await createAccount(page, email, 'password-123');
  await page.waitForURL(/\/mesocycles$/);
  await page.getByRole('button', { name: 'New mesocycle' }).click();
  await page.waitForURL(/\/build$/);
  const buildPath = new URL(page.url()).pathname;

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL(/\/login/);
  await page.goto(buildPath);
  await expect(page).toHaveURL(new RegExp(`/login\\?callbackUrl=${encodeURIComponent(buildPath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  await signIn(page, email, 'password-123');
  await page.waitForURL(new RegExp(`${buildPath}$`));
  await expect(page.getByTestId('mesocycle-title')).toHaveValue('Untitled mesocycle');
});

async function newUserPage(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await createAccount(page, email, 'password-456');
  await page.waitForURL(/\/mesocycles$/);
  return page;
}

test("each account sees only its own mesocycles", async ({ browser }) => {
  const alice = await newUserPage(browser, unique('alice'));
  await alice.getByRole('button', { name: 'New mesocycle' }).click();
  await alice.waitForURL(/\/build$/);
  const alicePlan = new URL(alice.url()).pathname;
  await alice.getByTestId('mesocycle-title').fill("Alice's plan");
  await alice.getByTestId('mesocycle-title').press('Enter');
  await expect(alice.getByTestId('save-indicator')).toHaveText(/Saved|All changes saved/);

  const bob = await newUserPage(browser, unique('bob'));
  await expect(bob.getByText('No mesocycles yet')).toBeVisible();
  await expect(bob.getByText("Alice's plan")).toHaveCount(0);
  await bob.goto(alicePlan);
  await expect(alert(bob, 'Mesocycle not found.')).toBeVisible();
});
