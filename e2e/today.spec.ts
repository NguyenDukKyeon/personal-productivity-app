import { expect, test } from '@playwright/test';

test('guest plans, commits, diverges and reloads without losing truth', async ({ page }) => {
  await page.goto('/today');

  await page.getByLabel('Daily capacity minutes').fill('300');
  await page.getByRole('button', { name: 'Save capacity' }).click();

  for (const [title, minutes, priority] of [
    ['Algebra', '60', 'p1_urgent'],
    ['IELTS Writing', '45', 'p2_high'],
    ['Chemistry', '90', 'p2_high'],
  ] as const) {
    await page.getByLabel('Task title').fill(title);
    await page.getByLabel('Estimated minutes').fill(minutes);
    await page.getByLabel('Priority').selectOption(priority);
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByRole('button', { name: `Complete ${title}` })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Add Algebra to Top 3' }).click();
  await page.getByRole('button', { name: 'Add IELTS Writing to Top 3' }).click();
  await page.getByRole('button', { name: 'Add Chemistry to Top 3' }).click();

  await page.getByLabel('Time block task').selectOption({ label: 'Algebra' });
  await page.getByLabel('Time block start').fill('17:00');
  await page.getByLabel('Time block end').fill('18:00');
  await page.getByRole('button', { name: 'Add time block' }).click();

  await expect(page.getByText('Scheduled 60 min')).toBeVisible();
  await expect(page.getByText('Remaining 240 min')).toBeVisible();

  await page.getByRole('button', { name: 'Commit Today' }).click();
  await expect(page.getByText(/Committed at/)).toBeVisible();

  await page.getByLabel('Daily capacity minutes').fill('240');
  await page.getByRole('button', { name: 'Save capacity' }).click();
  await expect(page.getByText('Plan changed after commitment')).toBeVisible();
  await expect(page.getByText('Capacity changed')).toBeVisible();

  await page.getByRole('button', { name: 'Complete Algebra' }).click();
  await expect(page.getByRole('button', { name: 'Reopen Algebra' })).toBeVisible();

  await page.reload();

  await expect(page.getByText(/Committed at/)).toBeVisible();
  await expect(page.getByText('Plan changed after commitment')).toBeVisible();
  await expect(page.getByText('Capacity changed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reopen Algebra' })).toBeVisible();
  await expect(page.getByText('17:00–18:00')).toBeVisible();
  await expect(page.getByRole('paragraph').filter({ hasText: /^Algebra$/ })).toBeVisible();
});

test('overbooking is visible but does not block commitment', async ({ page }) => {
  await page.goto('/today');
  await page.getByLabel('Daily capacity minutes').fill('60');
  await page.getByRole('button', { name: 'Save capacity' }).click();

  await page.getByLabel('Task title').fill('Long Study Block');
  await page.getByLabel('Estimated minutes').fill('90');
  await page.getByLabel('Priority').selectOption('p1_urgent');
  await page.getByRole('button', { name: 'Add task' }).click();

  await page.getByLabel('Time block task').selectOption({ label: 'Long Study Block' });
  await page.getByLabel('Time block start').fill('09:00');
  await page.getByLabel('Time block end').fill('10:30');
  await page.getByRole('button', { name: 'Add time block' }).click();

  await expect(page.getByText('Overbooked by 30 min')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Commit Today' })).toBeEnabled();
  await page.getByRole('button', { name: 'Commit Today' }).click();
  await expect(page.getByText(/Committed at/)).toBeVisible();
});
