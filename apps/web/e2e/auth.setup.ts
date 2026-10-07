import { expect, test as setup } from '@playwright/test';
import { AUTH_STATE } from './auth-state';
import { E2E_EMAIL, E2E_PASSWORD } from './global-setup';

// Signs in once through the real login page and saves the session for the other tests.
setup('sign in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(E2E_EMAIL);
  await page.getByLabel('Password').fill(E2E_PASSWORD);
  await page.getByRole('form', { name: 'Sign in' }).getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/mesocycles$/);
  await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
  await page.context().storageState({ path: AUTH_STATE });
});
