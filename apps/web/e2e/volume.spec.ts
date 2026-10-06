import { expect, test, type Page } from '@playwright/test';
import { addExercise, assignMuscles, card, createMesocycleViaUi, gotoStep, waitForSaved } from './helpers';

const chip = (page: Page, muscle: string) => page.getByTestId(`volume-chip-${muscle}`);

async function setSets(page: Page, day: string, exercise: string, target: number) {
  const c = card(page, day, exercise);
  const current = Number(await c.getByTestId('value-Sets').textContent());
  const button = c.getByRole('button', { name: target > current ? 'Increase Sets' : 'Decrease Sets' });
  for (let i = 0; i < Math.abs(target - current); i++) await button.click();
  await expect(c.getByTestId('value-Sets')).toHaveText(String(target));
}

// Fixed status colors from SPEC 7.4 (see globals.css): the border color of each chip.
const BORDER = { amber: 'rgb(217, 119, 6)', lightgreen: 'rgb(101, 163, 13)', green: 'rgb(22, 163, 74)', orange: 'rgb(234, 88, 12)', red: 'rgb(220, 38, 38)' };

test('scenario 1: build a 4-day block and watch the volume chips change with every edit', async ({ page }) => {
  await createMesocycleViaUi(page, { name: 'Volume Block', days: 4 });
  await assignMuscles(page, {
    'Day 1': ['Chest', 'Triceps'],
    'Day 2': ['Lats'],
    'Day 3': ['Quads'],
    'Day 4': ['Chest'],
  });

  // Assigned muscles show up with zero sets and a warning status.
  await expect(chip(page, 'chest')).toHaveAttribute('data-status', 'BELOW_MV');
  await expect(page.getByTestId('volume-total-chest')).toHaveText('0');
  await expect(chip(page, 'quads')).toBeVisible();
  await expect(chip(page, 'biceps')).toHaveCount(0);

  // Bench press: 3 sets chest, 1.5 to front delts and triceps (0.5 each per set).
  await addExercise(page, 'Day 1', 'Chest', 'bench press', 'Barbell Bench Press');
  await expect(page.getByTestId('volume-total-chest')).toHaveText('3');
  await expect(page.getByTestId('volume-total-triceps')).toHaveText('1.5');
  await expect(page.getByTestId('volume-total-front_delts')).toHaveText('1.5');
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('1×/wk');

  // Walk the chest chip through every status color by changing sets.
  const bench = 'Barbell Bench Press';
  const expectStatus = async (status: string, color: keyof typeof BORDER, total: string) => {
    await expect(chip(page, 'chest')).toHaveAttribute('data-status', status);
    await expect(chip(page, 'chest')).toHaveAttribute('data-color', color);
    await expect(chip(page, 'chest')).toHaveCSS('border-top-color', BORDER[color]);
    await expect(page.getByTestId('volume-total-chest')).toHaveText(total);
  };
  await expectStatus('BELOW_MV', 'amber', '3');
  await setSets(page, 'Day 1', bench, 8);
  await expectStatus('MAINTENANCE', 'amber', '8');
  await setSets(page, 'Day 1', bench, 10);
  await expectStatus('ABOVE_MEV', 'lightgreen', '10');
  await addExercise(page, 'Day 4', 'Chest', 'cable fly', 'Cable Fly'); // +3 sets on Day 4
  await expectStatus('MAV', 'green', '13');
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('2×/wk');
  await setSets(page, 'Day 4', 'Cable Fly', 10);
  await expectStatus('MAV', 'green', '20');
  await addExercise(page, 'Day 1', 'Chest', 'machine chest press', 'Machine Chest Press'); // +3 -> 23
  await expectStatus('EXCEEDS_MRV', 'red', '23');
  await setSets(page, 'Day 1', 'Machine Chest Press', 2); // 22 = MRV -> HIGH
  await expectStatus('HIGH', 'orange', '22');

  // Moving a card between days keeps the total but changes frequency.
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('2×/wk');
  await card(page, 'Day 4', 'Cable Fly').getByLabel('Move Cable Fly to day').selectOption({ label: 'Day 1' });
  await expect(page.getByTestId('volume-total-chest')).toHaveText('22');
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('1×/wk');

  // Removing exercises lowers the total immediately.
  await card(page, 'Day 1', 'Machine Chest Press').getByRole('button', { name: 'Delete Machine Chest Press' }).click();
  await expect(page.getByTestId('volume-total-chest')).toHaveText('20');

  // Stepper reflects progress: volume step is complete only while nothing exceeds MRV.
  await waitForSaved(page);
  await page.reload();
  await gotoStep(page, 'Exercises');
  await expect(page.getByTestId('volume-total-chest')).toHaveText('20');
  await expect(page.getByTestId('volume-total-triceps')).toHaveText('5');
});

test('M6: priority sets the target band and hint; chips expose status text and ARIA labels', async ({ page }) => {
  await createMesocycleViaUi(page, { name: 'Band Block', days: 2 });
  await gotoStep(page, 'Muscles');
  await page.getByRole('button', { name: 'Day 1: Chest', exact: true }).click();
  await page.getByLabel('Chest', { exact: true }).selectOption('focus');
  await gotoStep(page, 'Exercises');
  await addExercise(page, 'Day 1', 'Chest', 'cable fly', 'Cable Fly');
  await setSets(page, 'Day 1', 'Cable Fly', 10);
  await addExercise(page, 'Day 1', 'Chest', 'pec deck', 'Pec Deck');
  await setSets(page, 'Day 1', 'Pec Deck', 2); // 12 sets: bottom of MAV, 4 under the focus band (16-20)

  const chest = chip(page, 'chest');
  await expect(page.getByTestId('volume-status-chest')).toHaveText('In MAV');
  await expect(chest).toHaveAccessibleName(/Chest: 12 sets per week\. Status In MAV, ideal zone\. Trained directly on 1 day per week\. Focus priority\./);
  await expect(chest.getByTestId('target-band')).toBeVisible();

  await chest.click();
  const popover = page.getByTestId('volume-popover');
  await expect(chest).toHaveAttribute('aria-expanded', 'true');
  await expect(popover).toContainText('Focus muscle is 4 sets under its target band.');
  await expect(popover).toContainText('16–20 sets');
  await expect(popover).toContainText('12–20'); // MAV range
  await expect(popover).toContainText('Cable Fly');
  await expect(popover).toContainText('Pec Deck');
  await expect(popover).toContainText('Day 1');
  await expect(popover).toContainText('Contributing exercises');

  // Escape closes it and returns to the chip row.
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);

  // Lowering the priority to maintenance moves the band and the hint, never the status color.
  await gotoStep(page, 'Muscles');
  await page.getByLabel('Chest', { exact: true }).selectOption('maintenance');
  await chest.click();
  await expect(popover).toContainText('Maintenance muscle is 2 sets over its target band.');
  await expect(chest).toHaveAttribute('data-color', 'green');
});

test('M6: the volume bar stays visible while the board scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await createMesocycleViaUi(page, { name: 'Sticky Block', days: 6 });
  await assignMuscles(page, { 'Day 1': ['Chest'] });
  const bar = page.getByTestId('volume-bar');
  await expect(bar).toBeInViewport();
  const header = page.locator('div.sticky').first();
  await expect(header).toHaveCSS('position', 'sticky');

  await page.getByTestId('board').evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect(page.getByRole('region', { name: 'Day 6 column' })).toBeInViewport();
  await expect(bar).toBeInViewport();
  await expect(chip(page, 'chest')).toBeInViewport();
});
