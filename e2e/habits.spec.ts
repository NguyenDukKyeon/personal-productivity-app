import { expect, test } from '@playwright/test';

const BANGKOK_TODAY = new Date('2026-08-31T01:00:00.000Z'); // 08:00 Asia/Bangkok

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
    await page.clock.setFixedTime(BANGKOK_TODAY);
    await page.goto('/habits');
    await expect(page.getByRole('heading', { name: 'Habits & Routines' })).toBeVisible();

    // 1. Create habit via UI
    await page.getByRole('button', { name: 'New Habit' }).click();
    await page.getByLabel('Habit Title').fill('Morning Jog');
    await page.getByLabel('Cue / Context (When or where does this happen?)').fill('06:00 AM');
    await page.getByLabel('Minimum Viable Version (Low friction fallback)').fill('Put on running shoes and walk 5 min');
    await page.getByRole('button', { name: 'Save Habit' }).click();
    await expect(page.getByRole('heading', { name: 'Morning Jog' })).toBeVisible();

    // 2. Backdate creation using local-calendar arithmetic (Asia/Bangkok), never UTC ISO slicing
    await page.evaluate(async () => {
      function toLocalDateKey(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      const now = new Date();
      const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
      const twoDaysAgoKey = toLocalDateKey(twoDaysAgo);

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('personal-productivity-guest');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction(['habits'], 'readwrite');
      const store = tx.objectStore('habits');
      const getAllReq = store.getAll();
      await new Promise<void>((resolve, reject) => {
        getAllReq.onsuccess = () => {
          const habits = getAllReq.result;
          const jog = habits.find((h: { title: string }) => h.title === 'Morning Jog');
          if (jog) {
            jog.createdAt = twoDaysAgo.toISOString();
            jog.activeIntervals = [{ startDate: twoDaysAgoKey, endDate: null }];
            jog.scheduleRevisions = [{ effectiveFromDate: twoDaysAgoKey, schedule: { kind: 'daily' } }];
            store.put(jog);
          }
          resolve();
        };
        getAllReq.onerror = () => reject(getAllReq.error);
      });
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
      });
    });

    // 3. Reload page to reflect updated lifecycle
    await page.reload();

    // On Today, Morning Jog is active and yesterday was missed -> Recovery banner appears
    await expect(page.getByRole('heading', { name: 'Morning Jog' })).toBeVisible();
    await expect(page.getByText(/Missed last occurrence/i)).toBeVisible();
    await expect(page.getByText(/Resume today with a small start/i)).toBeVisible();

    // Complete recovery with Minimum check-in on Today
    await page.getByRole('button', { name: 'Minimum check-in for Morning Jog' }).click();
    await expect(page.getByText('Minimum Done')).toBeVisible();

    // Reload and assert state persists
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Morning Jog' })).toBeVisible();
    await expect(page.getByText('Minimum Done')).toBeVisible();
  });

  test('Journey 4: creates two habits, creates a routine, assigns both, reorders, and persists exact order', async ({
    page,
  }) => {
    await page.goto('/habits');

    // Create Habit 1
    await page.getByRole('button', { name: 'New Habit' }).click();
    await page.getByLabel('Habit Title').fill('Drink Water');
    await page.getByLabel('Cue / Context (When or where does this happen?)').fill('Right upon waking');
    await page.getByLabel('Minimum Viable Version (Low friction fallback)').fill('1 glass');
    await page.getByRole('button', { name: 'Save Habit' }).click();
    await expect(page.getByRole('heading', { name: 'Drink Water' })).toBeVisible();

    // Create Habit 2
    await page.getByRole('button', { name: 'New Habit' }).click();
    await page.getByLabel('Habit Title').fill('Stretching');
    await page.getByLabel('Cue / Context (When or where does this happen?)').fill('After water');
    await page.getByLabel('Minimum Viable Version (Low friction fallback)').fill('30 seconds stretch');
    await page.getByRole('button', { name: 'Save Habit' }).click();
    await expect(page.getByRole('heading', { name: 'Stretching' })).toBeVisible();

    // Create Routine
    await page.getByRole('button', { name: 'New Routine' }).click();
    await page.getByLabel('Routine Name').fill('Morning Launchpad');
    await page.getByLabel('Context Label (Optional)').fill('07:00');
    await page.getByRole('button', { name: 'Save Routine' }).click();

    await expect(page.getByRole('heading', { name: 'Morning Launchpad' })).toBeVisible();

    // Assign Habit 1 to routine
    const optionsButtons = page.getByRole('button', { name: 'Habit options' });
    await optionsButtons.nth(0).click();
    await page.getByRole('button', { name: 'Edit Habit' }).click();
    await page.getByLabel('Assign to Routine (Optional)').selectOption({ label: 'Morning Launchpad (07:00)' });
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Assign Habit 2 to routine
    await optionsButtons.nth(1).click();
    await page.getByRole('button', { name: 'Edit Habit' }).click();
    await page.getByLabel('Assign to Routine (Optional)').selectOption({ label: 'Morning Launchpad (07:00)' });
    await page.getByRole('button', { name: 'Save Changes' }).click();

    const routineSection = page.locator('section').filter({ hasText: 'Morning Launchpad' });
    await expect(routineSection.getByRole('heading', { name: 'Drink Water' })).toBeVisible();
    await expect(routineSection.getByRole('heading', { name: 'Stretching' })).toBeVisible();

    // Reorder Stretching above Drink Water and persist
    await routineSection.getByRole('button', { name: 'Move Stretching up' }).click();
    await expect(routineSection.locator('h3')).toHaveText(['Stretching', 'Drink Water']);

    await page.reload();

    const routineSectionAfter = page.locator('section').filter({ hasText: 'Morning Launchpad' });
    await expect(routineSectionAfter.locator('h3')).toHaveText(['Stretching', 'Drink Water']);
  });
});
