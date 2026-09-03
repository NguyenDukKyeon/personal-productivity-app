import { expect, test } from '@playwright/test';

test.describe('Habits & Routines Acceptance Journeys', () => {
  test('Journey 1: creates a habit with Cue + Minimum version, marks Full, reloads, and persists as Full', async ({
    page,
  }) => {
    await page.goto('/habits');

    await expect(page.getByRole('heading', { name: 'Habits & Routines' })).toBeVisible();

    // Create habit
    await page.getByRole('button', { name: 'New Habit' }).click();
    await expect(page.getByRole('heading', { name: 'Create Habit' })).toBeVisible();

    await page.getByLabel('Habit Title').fill('Calculus Problem Set');
    await page.getByLabel('Cue / Context (When or where does this happen?)').fill('After morning coffee');
    await page.getByLabel('Minimum Viable Version (Low friction fallback)').fill('Solve 1 derivative');
    await page.getByLabel('Description (Optional)').fill('Chapter 3 derivatives practice');

    await page.getByRole('button', { name: 'Save Habit' }).click();

    // Habit card rendered with cue and minimum version
    await expect(page.getByRole('heading', { name: 'Calculus Problem Set' })).toBeVisible();
    await expect(page.getByText('📍 After morning coffee')).toBeVisible();
    await expect(page.getByText('Solve 1 derivative')).toBeVisible();

    // Check in Full
    await page.getByRole('button', { name: 'Full check-in for Calculus Problem Set' }).click();
    await expect(page.getByText('Full Done')).toBeVisible();

    // Verify persistence across reload
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Calculus Problem Set' })).toBeVisible();
    await expect(page.getByText('Full Done')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo check-in for Calculus Problem Set' })).toBeVisible();
  });

  test('Journey 2: creates a habit, marks Minimum, reloads, and persists as Minimum', async ({
    page,
  }) => {
    await page.goto('/habits');

    await expect(page.getByRole('heading', { name: 'Habits & Routines' })).toBeVisible();

    // Create habit
    await page.getByRole('button', { name: 'New Habit' }).click();
    await page.getByLabel('Habit Title').fill('Read Novel');
    await page.getByLabel('Cue / Context (When or where does this happen?)').fill('Before sleep');
    await page.getByLabel('Minimum Viable Version (Low friction fallback)').fill('Read 1 paragraph');

    await page.getByRole('button', { name: 'Save Habit' }).click();

    await expect(page.getByRole('heading', { name: 'Read Novel' })).toBeVisible();

    // Check in Minimum
    await page.getByRole('button', { name: 'Minimum check-in for Read Novel' }).click();
    await expect(page.getByText('Minimum Done')).toBeVisible();

    // Verify persistence across reload
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Read Novel' })).toBeVisible();
    await expect(page.getByText('Minimum Done')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo check-in for Read Novel' })).toBeVisible();
  });

  test('Journey 3: simulates missed scheduled day in controlled date environment, recovers with Minimum, and persists', async ({
    page,
  }) => {
    await page.goto('/habits');
    await expect(page.getByRole('heading', { name: 'Habits & Routines' })).toBeVisible();

    // 1. Create habit via UI
    await page.getByRole('button', { name: 'New Habit' }).click();
    await page.getByLabel('Habit Title').fill('Morning Jog');
    await page.getByLabel('Cue / Context (When or where does this happen?)').fill('06:00 AM');
    await page.getByLabel('Minimum Viable Version (Low friction fallback)').fill('Put on running shoes and walk 5 min');
    await page.getByRole('button', { name: 'Save Habit' }).click();
    await expect(page.getByTestId('habit-card-Morning Jog')).toBeVisible();

    // 2. Adjust creation date & lifecycle to 2 local calendar days ago so yesterday counts as a missed occurrence
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('personal-productivity-guest');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction(['habits'], 'readwrite');
      const store = tx.objectStore('habits');
      const allHabits = await new Promise<any[]>((resolve, reject) => {
        const r = store.getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const jog = allHabits.find((h) => h.title === 'Morning Jog');
      if (jog) {
        const now = new Date();
        const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 12, 0, 0);
        const y = twoDaysAgo.getFullYear();
        const m = String(twoDaysAgo.getMonth() + 1).padStart(2, '0');
        const d = String(twoDaysAgo.getDate()).padStart(2, '0');
        const twoDaysAgoKey = `${y}-${m}-${d}`;

        jog.createdAt = twoDaysAgo.toISOString();
        jog.updatedAt = twoDaysAgo.toISOString();
        jog.activeIntervals = [{ startDate: twoDaysAgoKey, endDate: null }];
        jog.scheduleRevisions = [{ effectiveFromDate: twoDaysAgoKey, schedule: { kind: 'daily' } }];

        await new Promise<void>((resolve, reject) => {
          const putReq = store.put(jog);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        });
      }
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
      });
      db.close();
    });

    // 3. Reload page to reflect updated lifecycle
    await page.reload();

    // On Today, Morning Jog is active and yesterday was missed -> Recovery banner appears
    await expect(page.getByTestId('habit-card-Morning Jog')).toBeVisible();
    await expect(page.getByText(/Missed last occurrence/i)).toBeVisible();
    await expect(page.getByText(/Resume today with a small start/i)).toBeVisible();

    // Complete recovery with Minimum check-in on Today
    await page.getByRole('button', { name: 'Minimum check-in for Morning Jog' }).click();
    await expect(page.getByText('Minimum Done')).toBeVisible();

    // Reload and assert state persists
    await page.reload();
    await expect(page.getByTestId('habit-card-Morning Jog')).toBeVisible();
    await expect(page.getByText('Minimum Done')).toBeVisible();
  });

  test('Journey 4: creates two habits, creates a routine, assigns both, reorders sequence, and persists exact order across reload', async ({
    page,
  }) => {
    await page.goto('/habits');

    // Create Habit 1
    await page.getByRole('button', { name: 'New Habit' }).click();
    await page.getByLabel('Habit Title').fill('Drink Water');
    await page.getByLabel('Cue / Context (When or where does this happen?)').fill('Right upon waking');
    await page.getByLabel('Minimum Viable Version (Low friction fallback)').fill('1 glass');
    await page.getByRole('button', { name: 'Save Habit' }).click();
    await expect(page.getByTestId('habit-card-Drink Water')).toBeVisible();

    // Create Habit 2
    await page.getByRole('button', { name: 'New Habit' }).click();
    await page.getByLabel('Habit Title').fill('Stretching');
    await page.getByLabel('Cue / Context (When or where does this happen?)').fill('After water');
    await page.getByLabel('Minimum Viable Version (Low friction fallback)').fill('30 seconds stretch');
    await page.getByRole('button', { name: 'Save Habit' }).click();
    await expect(page.getByTestId('habit-card-Stretching')).toBeVisible();

    // Create Routine
    await page.getByRole('button', { name: 'New Routine' }).click();
    await page.getByLabel('Routine Name').fill('Morning Launchpad');
    await page.getByLabel('Context Label (Optional)').fill('07:00');
    await page.getByRole('button', { name: 'Save Routine' }).click();

    await expect(page.getByRole('heading', { name: 'Morning Launchpad' })).toBeVisible();

    // Assign Habit 1 ('Drink Water') to routine
    await page.getByTestId('habit-card-Drink Water').getByRole('button', { name: 'Habit options' }).click();
    await page.getByRole('button', { name: 'Edit Habit' }).click();
    await page.getByLabel('Assign to Routine (Optional)').selectOption({ label: 'Morning Launchpad (07:00)' });
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Assign Habit 2 ('Stretching') to routine
    await page.getByTestId('habit-card-Stretching').getByRole('button', { name: 'Habit options' }).click();
    await page.getByRole('button', { name: 'Edit Habit' }).click();
    await page.getByLabel('Assign to Routine (Optional)').selectOption({ label: 'Morning Launchpad (07:00)' });
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Verify initial sequence in routine: [Drink Water, Stretching]
    const routineSection = page.locator('section').filter({ hasText: 'Morning Launchpad' });
    const habitHeadings = routineSection.getByRole('heading', { level: 3 });
    await expect(habitHeadings.nth(0)).toHaveText('Drink Water');
    await expect(habitHeadings.nth(1)).toHaveText('Stretching');

    // Reorder: Move 'Stretching' up
    await page.getByTestId('routine-item-Stretching').getByRole('button', { name: 'Move habit up' }).click();

    // Verify sequence updated to: [Stretching, Drink Water]
    await expect(habitHeadings.nth(0)).toHaveText('Stretching');
    await expect(habitHeadings.nth(1)).toHaveText('Drink Water');

    // Reload page and assert EXACT visual order persists across reload
    await page.reload();

    const routineSectionAfter = page.locator('section').filter({ hasText: 'Morning Launchpad' });
    const habitHeadingsAfter = routineSectionAfter.getByRole('heading', { level: 3 });
    await expect(habitHeadingsAfter.nth(0)).toHaveText('Stretching');
    await expect(habitHeadingsAfter.nth(1)).toHaveText('Drink Water');
  });
});
