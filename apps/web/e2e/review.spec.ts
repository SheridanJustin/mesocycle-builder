import { expect, test } from '@playwright/test';
import { createPopulatedDraft } from './api-helpers';
import { gotoTab, setDuration } from './helpers';

const days = [
  { slots: [{ exercise: 'Barbell Bench Press', sets: 4 }, { exercise: 'Cable Lateral Raise', sets: 3 }] },
  { slots: [{ exercise: 'Pull-Up', sets: 5 }, { exercise: 'Barbell Row', sets: 3 }] },
  {},
  { slots: [{ exercise: 'Barbell Bench Press', sets: 3 }] },
  {},
  {},
  {},
];

test('Review shows overall volume per major muscle group, weekly and for the whole block', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Review Block', days });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoTab(page, 'Review');

  await expect(page.getByTestId('stat-training-days')).toHaveText('3');
  await expect(page.getByTestId('stat-rest-days')).toHaveText('4');
  await expect(page.getByTestId('stat-weekly-sets')).toHaveText('18');
  await expect(page.getByTestId('stat-average-minutes')).toContainText('min');

  // Chest: 4 + 3 = 7 per week, 28 over the default 4 weeks.
  await expect(page.getByTestId('review-weekly-chest')).toHaveText('7');
  await expect(page.getByTestId('review-block-chest')).toHaveText('28');
  await expect(page.getByTestId('review-status-chest')).toHaveText('Below MV');
  // Back: pull-ups 5 + rows 3 = 8 (each exercise counts once), 32 over the mesocycle.
  await expect(page.getByTestId('review-weekly-back')).toHaveText('8');
  await expect(page.getByTestId('review-block-back')).toHaveText('32');
  // Shoulders: lateral raises 3 + bench 0.5 x 7 + row's rear delts 0.5 x 3 = 8.
  await expect(page.getByTestId('review-weekly-shoulders')).toHaveText('8');
  // Only major groups are listed, in a fixed order.
  const rows = await page.locator('[data-testid^="review-row-"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')));
  expect(rows).toEqual(['review-row-chest', 'review-row-back', 'review-row-shoulders', 'review-row-biceps', 'review-row-triceps']);
  await expect(page.getByTestId('review-untrained')).toHaveText('Not trained: Quads, Hamstrings, Glutes, Calves, Abs');

  // Longer mesocycle and a deload week: 5 weeks = 4 full weeks + a deload at ceil(sets/2) per slot.
  await setDuration(page, 5);
  await page.getByLabel('Deload in the final week').check();
  // Chest: 7 x 4 + (2 + 2) = 32.
  await expect(page.getByTestId('review-block-chest')).toHaveText('32');
  await expect(page.getByTestId('review-weekly-chest')).toHaveText('7');
});

test('Review has a clear empty state before any exercises are added', async ({ page, request }) => {
  const id = await createPopulatedDraft(request, { name: 'Empty Review', days: [{}, {}, {}, {}, {}, {}, {}] });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoTab(page, 'Review');
  await expect(page.getByText('Add exercises on the Build tab to see volume here.')).toBeVisible();
  await expect(page.getByTestId('stat-average-minutes')).toHaveText('—');
});

test('weekly numbers carry their status color, also on a phone where the badge is hidden', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const id = await createPopulatedDraft(request, {
    name: 'Colored Numbers',
    // Chest 3 sets (below MEV: amber); quads 10 + 10 + 3 = 23 sets (over MRV 20: red).
    days: [
      {
        slots: [
          { exercise: 'Barbell Bench Press', sets: 3 },
          { exercise: 'Leg Press', sets: 10 },
          { exercise: 'Hack Squat', sets: 10 },
          { exercise: 'Leg Extension', sets: 3 },
        ],
      },
      {},
      {},
      {},
      {},
      {},
      {},
    ],
  });
  await page.goto(`/mesocycles/${id}/build`);
  await gotoTab(page, 'Review');
  await expect(page.getByTestId('review-status-chest')).toBeHidden();
  await expect(page.getByTestId('review-weekly-chest')).toHaveAttribute('data-color', 'amber');
  await expect(page.getByTestId('review-weekly-quads')).toHaveAttribute('data-color', 'red');
  await expect(page.getByTestId('review-weekly-quads')).toHaveCSS('border-top-color', 'rgb(239, 68, 68)');
});
