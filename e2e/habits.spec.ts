import { expect, test } from '@playwright/test';

test('guest creates a habit, records minimum and full check-in, groups into a routine, and reloads without loss', async ({
  page,
}) => {
  await page.goto('/habits');

  await expect(page.getByRole('heading', { name: 'Habits & Routines' })).toBeVisible();

  // Create habit
  await page.getByRole('button', { name: 'New Habit' }).click();
  await expect(page.getByRole('heading', { name: 'Create Habit' })).toBeVisible();

  await page.getByLabel('Habit Title').fill('Read English');
  await page.getByLabel('Cue / Context (When or where does this happen?)').fill('After breakfast');
  await page.getByLabel('Minimum Viable Version (Low friction fallback)').fill('Read 1 paragraph');
  await page.getByLabel('Description (Optional)').fill('Read 20 pages of fiction');

  await page.getByRole('button', { name: 'Save Habit' }).click();

  // Habit card rendered
  await expect(page.getByRole('heading', { name: 'Read English' })).toBeVisible();
  await expect(page.getByText('📍 After breakfast')).toBeVisible();
  await expect(page.getByText('Read 1 paragraph')).toBeVisible();

  // Check in Minimum
  await page.getByRole('button', { name: 'Minimum check-in for Read English' }).click();
  await expect(page.getByText('Minimum Done')).toBeVisible();
  await expect(page.getByText('1 (0/1)')).toBeVisible();

  // Undo check in
  await page.getByRole('button', { name: 'Undo check-in for Read English' }).click();
  await expect(page.getByRole('button', { name: 'Full check-in for Read English' })).toBeVisible();

  // Check in Full
  await page.getByRole('button', { name: 'Full check-in for Read English' }).click();
  await expect(page.getByText('Full Done')).toBeVisible();
  await expect(page.getByText('1 (1/0)')).toBeVisible();

  // Create Routine
  await page.getByRole('button', { name: 'New Routine' }).click();
  await expect(page.getByRole('heading', { name: 'Create Routine' })).toBeVisible();
  await page.getByLabel('Routine Name').fill('Morning Startup');
  await page.getByLabel('Context Label (Optional)').fill('07:30');
  await page.getByRole('button', { name: 'Save Routine' }).click();

  await expect(page.getByRole('heading', { name: 'Morning Startup' })).toBeVisible();

  // Edit Habit to assign to routine
  await page.getByRole('button', { name: 'Habit options' }).click();
  await page.getByRole('button', { name: 'Edit Habit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Habit' })).toBeVisible();

  await page.getByLabel('Assign to Routine (Optional)').selectOption({ label: 'Morning Startup (07:30)' });
  await page.getByRole('button', { name: 'Save Changes' }).click();

  // Verify persistence across reload
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Morning Startup' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Read English' })).toBeVisible();
  await expect(page.getByText('Full Done')).toBeVisible();
});
