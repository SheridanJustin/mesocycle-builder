import { expect, test, type Page } from '@playwright/test';
import { createPopulatedDraft } from './api-helpers';
import { addExercises, card, column, createMesocycleViaUi, waitForSaved } from './helpers';

const chip = (page: Page, muscle: string) => page.getByTestId(`volume-chip-${muscle}`);

async function setSets(page: Page, day: string, exercise: string, target: number) {
  const c = card(page, day, exercise);
  const current = Number(await c.getByTestId('value-Sets').textContent());
  const button = c.getByRole('button', { name: target > current ? 'Increase Sets' : 'Decrease Sets' });
  for (let i = 0; i < Math.abs(target - current); i++) await button.click();
  await expect(c.getByTestId('value-Sets')).toHaveText(String(target));
}

// The spec's fixed status hues (SPEC 7.4), dark-tuned (globals.css): the chip border color.
const BORDER = {
  amber: 'rgb(245, 158, 11)',
  lightgreen: 'rgb(163, 230, 53)',
  green: 'rgb(34, 197, 94)',
  orange: 'rgb(249, 115, 22)',
  red: 'rgb(239, 68, 68)',
};

test('scenario 1: build a week and watch the volume chips change with every edit', async ({ page }) => {
  await createMesocycleViaUi(page);
  await expect(chip(page, 'chest')).toHaveCount(0);

  // Bench press: 3 sets chest, 1.5 each to front delts and triceps.
  await addExercises(page, 'Mon', ['Barbell Bench Press']);
  await expect(page.getByTestId('volume-total-chest')).toHaveText('3');
  await expect(page.getByTestId('volume-total-triceps')).toHaveText('1.5');
  // Only major groups are shown: front delts count toward Shoulders.
  await expect(page.getByTestId('volume-total-shoulders')).toHaveText('1.5');
  await expect(page.getByTestId('volume-chip-front_delts')).toHaveCount(0);
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('1×/wk');

  const expectStatus = async (status: string, color: keyof typeof BORDER, total: string) => {
    await expect(chip(page, 'chest')).toHaveAttribute('data-status', status);
    await expect(chip(page, 'chest')).toHaveAttribute('data-color', color);
    await expect(chip(page, 'chest')).toHaveCSS('border-top-color', BORDER[color]);
    await expect(page.getByTestId('volume-total-chest')).toHaveText(total);
  };
  await expectStatus('BELOW_MV', 'amber', '3');
  await setSets(page, 'Mon', 'Barbell Bench Press', 8);
  await expectStatus('MAINTENANCE', 'amber', '8');
  await setSets(page, 'Mon', 'Barbell Bench Press', 10);
  await expectStatus('ABOVE_MEV', 'lightgreen', '10');
  await addExercises(page, 'Thu', ['Cable Fly']);
  await expectStatus('MAV', 'green', '13');
  await expect(page.getByTestId('volume-frequency-chest')).toHaveText('2×/wk');
  await setSets(page, 'Thu', 'Cable Fly', 10);
  await expectStatus('MAV', 'green', '20');
  await addExercises(page, 'Mon', ['Machine Chest Press']);
  await expectStatus('EXCEEDS_MRV', 'red', '23');
  await setSets(page, 'Mon', 'Machine Chest Press', 2);
  await expectStatus('HIGH', 'orange', '22');

  await card(page, 'Mon', 'Machine Chest Press').getByRole('button', { name: 'Delete Machine Chest Press' }).click();
  await expect(page.getByTestId('volume-total-chest')).toHaveText('20');

  await waitForSaved(page);
  await page.reload();
  await expect(page.getByTestId('volume-total-chest')).toHaveText('20');
  await expect(page.getByTestId('volume-total-triceps')).toHaveText('5');
});

test('back and shoulders are each one group, counted once per exercise', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, {
    name: 'Group Block',
    days: [
      { slots: [{ exercise: 'Pull-Up', sets: 4 }, { exercise: 'Barbell Row', sets: 4 }, { exercise: 'Barbell Shrug', sets: 3 }] },
      { slots: [{ exercise: 'Dumbbell Lateral Raise', sets: 4 }, { exercise: 'Face Pull', sets: 3 }] },
      {}, {}, {}, {}, {},
    ],
  });
  await page.goto(`/mesocycles/${id}/build`);
  // Pull-ups (lats + upper back) count once: 4 + rows 4 + shrugs 3 = 11 direct back sets, plus face pulls'
  // upper-back secondary 3 x 0.5 = 12.5.
  await expect(page.getByTestId('volume-total-back')).toHaveText('12.5');
  // Lateral raises 4 + face pulls 3 + barbell row's rear-delt secondary 2 = 9 shoulder sets.
  await expect(page.getByTestId('volume-total-shoulders')).toHaveText('9');
  for (const muscle of ['lats', 'upper_back', 'traps', 'side_delts', 'rear_delts', 'forearms']) {
    await expect(page.getByTestId(`volume-chip-${muscle}`)).toHaveCount(0);
  }
  await expect(page.getByTestId('volume-chip-back')).toHaveAccessibleName(/^Back: 12.5 sets per week/);
});

test('chips explain themselves in text, and priorities and target bands are hidden', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, {
    name: 'Chip Block',
    days: [{ slots: [{ exercise: 'Cable Fly', sets: 10 }, { exercise: 'Pec Deck', sets: 2 }] }, {}, {}, {}, {}, {}, {}],
  });
  await page.goto(`/mesocycles/${id}/build`);
  const chest = chip(page, 'chest');
  await expect(page.getByTestId('volume-status-chest')).toHaveText('In MAV');
  await expect(chest).toHaveAccessibleName('Chest: 12 sets per week. Status In MAV, ideal zone. Trained directly on 1 day per week.');
  await expect(page.getByTestId('target-band')).toHaveCount(0);

  await chest.click();
  const popover = page.getByTestId('volume-popover');
  await expect(chest).toHaveAttribute('aria-expanded', 'true');
  await expect(popover).toContainText('In MAV — ideal zone');
  await expect(popover).toContainText('12–20'); // MAV range
  await expect(popover).toContainText('Cable Fly');
  await expect(popover).toContainText('Pec Deck');
  await expect(popover).toContainText('Mon');
  await expect(popover).not.toContainText('Priority');
  await expect(popover).not.toContainText('Target band');
  await expect(popover).not.toContainText('target band');
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
});

test('the volume bar stays visible while the board scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await createMesocycleViaUi(page);
  await addExercises(page, 'Mon', ['Cable Fly']);
  const bar = page.getByTestId('volume-bar');
  // The page never scrolls; the bar sits above the board, which scrolls on its own.
  await page.getByTestId('board').evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect(column(page, 'Sun')).toBeInViewport();
  await expect(bar).toBeInViewport();
  await expect(chip(page, 'chest')).toBeInViewport();
});
