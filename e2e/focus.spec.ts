import { expect, test, type Page } from '@playwright/test';

function clockToSeconds(value: string | null): number {
  if (!value) return 0;
  const parts = value.trim().split(':').map(Number);
  if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

async function createScheduledAlgebra(page: Page) {
  await page.goto('/today');
  await page.getByLabel('Task title').fill('Algebra');
  await page.getByLabel('Estimated minutes').fill('50');
  await page.getByLabel('Priority').selectOption('p1_urgent');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('button', { name: 'Complete Algebra' })).toBeVisible();

  await page.getByLabel('Time block task').selectOption({ label: 'Algebra' });
  await page.getByLabel('Time block start').fill('17:00');
  await page.getByLabel('Time block end').fill('18:00');
  await page.getByRole('button', { name: 'Add time block' }).click();
  await expect(page.getByText('17:00–18:00')).toBeVisible();
}

test('guest records a scheduled task as focus evidence after pause, distraction and reload', async ({ page }) => {
  await createScheduledAlgebra(page);
  const startLink = page.getByRole('link', { name: 'Start focus Algebra' });
  await expect(startLink).toHaveAttribute('href', /\/focus\?workItemId=.+&timeBlockId=.+/);
  await startLink.click();
  await expect(page).toHaveURL(/\/focus\?workItemId=.+&timeBlockId=.+/);
  await expect(page.getByRole('heading', { name: 'Focus Station' })).toBeVisible();
  await expect(page.getByLabel('Focus task')).toHaveValue(/./);

  await page.getByRole('button', { name: 'Start focus' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.getByText('Algebra')).toBeVisible();

  await expect
    .poll(async () => clockToSeconds(await page.getByLabel('Elapsed focus time').textContent()))
    .toBeGreaterThan(0);

  await page.getByLabel('Distraction').fill('TikTok');
  await page.getByRole('button', { name: 'Capture distraction' }).click();
  await expect(page.getByText('TikTok')).toBeVisible();
  await expect(page.getByText('Interruptions 1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

  await page.getByLabel('Session note').fill('Worked the hard problems');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText(/Focused \d{2}:\d{2}/)).toBeVisible();
  await expect(page.getByText('Interruptions 1')).toBeVisible();
  await expect(page.getByText('Worked the hard problems')).toBeVisible();
  await expect(page.getByText('TikTok')).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Focused \d{2}:\d{2}/)).toBeVisible();
  await expect(page.getByText('Interruptions 1')).toBeVisible();
  await expect(page.getByText('TikTok')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start focus' })).toBeVisible();
});

test('running focus reconstructs elapsed time after reload', async ({ page }) => {
  await createScheduledAlgebra(page);
  const startLink = page.getByRole('link', { name: 'Start focus Algebra' });
  await expect(startLink).toHaveAttribute('href', /\/focus\?workItemId=.+&timeBlockId=.+/);
  await startLink.click();
  await page.getByRole('button', { name: 'Start focus' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

  await expect
    .poll(async () => clockToSeconds(await page.getByLabel('Elapsed focus time').textContent()))
    .toBeGreaterThan(0);
  const before = clockToSeconds(await page.getByLabel('Elapsed focus time').textContent());

  await page.reload();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.getByText('Algebra')).toBeVisible();
  await expect
    .poll(async () => clockToSeconds(await page.getByLabel('Elapsed focus time').textContent()))
    .toBeGreaterThanOrEqual(before);
});
