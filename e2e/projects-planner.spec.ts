import { expect, test, type Page } from '@playwright/test';

function getTodayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftLocalDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d + days);
  const ty = target.getFullYear();
  const tm = String(target.getMonth() + 1).padStart(2, '0');
  const td = String(target.getDate()).padStart(2, '0');
  return `${ty}-${tm}-${td}`;
}

async function clearIndexedDB(page: Page) {
  await page.goto('/today');
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('personal-productivity-guest');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
  await page.goto('/today');
}

async function getStoreCount(page: Page, storeName: string): Promise<number> {
  return await page.evaluate((name) => {
    return new Promise<number>((resolve) => {
      const req = indexedDB.open('personal-productivity-guest', 4);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(name)) {
          db.close();
          resolve(0);
          return;
        }
        const tx = db.transaction(name, 'readonly');
        const store = tx.objectStore(name);
        const countReq = store.count();
        countReq.onsuccess = () => {
          db.close();
          resolve(countReq.result);
        };
        countReq.onerror = () => {
          db.close();
          resolve(0);
        };
      };
      req.onerror = () => resolve(0);
      req.onblocked = () => resolve(0);
    });
  }, storeName);
}

test.describe('Phase 4: Projects & Flexible Planner Acceptance Journeys', () => {
  test('Journey 1: Project -> Backlog -> Planner scheduling and persistence across reload', async ({
    page,
  }) => {
    await clearIndexedDB(page);

    // 1. Projects -> create Project "Chemistry Semester"
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Projects & Roadmaps' })).toBeVisible();

    await page.getByRole('button', { name: 'New Project' }).click();
    await expect(page.getByRole('dialog', { name: 'New Project' })).toBeVisible();
    await page.getByLabel('Project Title').fill('Chemistry Semester');
    await page.getByRole('button', { name: 'Create Project' }).click();

    await expect(page.getByRole('heading', { name: 'Chemistry Semester' })).toBeVisible();

    // 2. Open Project detail -> create WorkItem "Chapter 1 exercises" (90m)
    await page.getByRole('heading', { name: 'Chemistry Semester' }).click();
    await expect(page.getByRole('heading', { name: 'Chemistry Semester' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to Projects' })).toBeVisible();

    await page.getByRole('button', { name: 'Add Task' }).click();
    await page.getByPlaceholder('Task title (e.g. Solve limit worksheet)').fill('Chapter 1 exercises');
    await page.getByPlaceholder('Minutes').fill('90');
    await page.getByRole('button', { name: 'Save Task' }).click();

    await expect(page.getByText('Chapter 1 exercises')).toBeVisible();
    await expect(page.getByText('Est: 90m')).toBeVisible();

    // 3. Open Planner -> WorkItem appears in backlog with project badge
    await page.goto('/planner');
    await expect(page.getByRole('heading', { name: 'Flexible Planner' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Unscheduled Backlog' })).toBeVisible();

    await expect(page.getByText('Chapter 1 exercises')).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'Chemistry Semester' })).toBeVisible();

    // 4. Schedule WorkItem into today
    await page.getByRole('button', { name: 'Schedule Chapter 1 exercises' }).click();
    await expect(page.getByRole('dialog', { name: 'Schedule Work Item' })).toBeVisible();
    await page.getByLabel('Start Time').fill('09:00');
    await page.getByLabel('End Time').fill('10:30');
    await page.getByRole('button', { name: 'Confirm Schedule' }).click();

    // 5. TimeBlock appears on day card, disappears from unscheduled backlog
    await expect(page.getByText('09:00 – 10:30 (90m)')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Schedule Chapter 1 exercises', exact: true }),
    ).not.toBeVisible();

    // 6. Reload -> state persists
    await page.reload();
    await expect(page.getByText('Chapter 1 exercises')).toBeVisible();
    await expect(page.getByText('09:00 – 10:30 (90m)')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Schedule Chapter 1 exercises', exact: true }),
    ).not.toBeVisible();

    // 7. Verify project view reflects scheduled status
    await page.goto('/projects');
    await page.getByRole('heading', { name: 'Chemistry Semester' }).click();
    await expect(page.getByText('Chapter 1 exercises')).toBeVisible();
    await expect(page.getByText('scheduled', { exact: true })).toBeVisible();
  });

  test('Journey 2: Multi-day move moves block to another day without leaving duplicates', async ({
    page,
  }) => {
    await clearIndexedDB(page);

    // 1. Create a task via Today
    await page.goto('/today');
    await page.getByLabel('Task title').fill('Linear Algebra Homework');
    await page.getByLabel('Estimated minutes').fill('60');
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByRole('button', { name: 'Complete Linear Algebra Homework' })).toBeVisible();

    // 2. Open Planner -> schedule it on Day 1 (today)
    await page.goto('/planner');
    await page.getByRole('button', { name: 'Schedule Linear Algebra Homework' }).click();
    await page.getByLabel('Start Time').fill('09:00');
    await page.getByLabel('End Time').fill('10:00');
    await page.getByRole('button', { name: 'Confirm Schedule' }).click();

    const today = getTodayLocalDate();
    const tomorrow = shiftLocalDate(today, 1);

    await expect(page.getByText('09:00 – 10:00 (60m)')).toBeVisible();

    // 3. Move block to tomorrow at 14:00–15:00
    await page.getByRole('button', { name: 'Move Linear Algebra Homework' }).click();
    await expect(page.getByRole('dialog', { name: 'Move Scheduled Block' })).toBeVisible();
    await page.getByLabel('Target Date').fill(tomorrow);
    await page.getByLabel('Start Time').fill('14:00');
    await page.getByLabel('End Time').fill('15:00');
    await page.getByRole('button', { name: 'Confirm Move' }).click();

    // 4. Verify today has 0 blocks ("No scheduled blocks") and tomorrow has exactly one block
    await expect(page.getByText('14:00 – 15:00 (60m)')).toBeVisible();
    const moveButtons = page.getByRole('button', { name: 'Move Linear Algebra Homework' });
    await expect(moveButtons).toHaveCount(1);

    // 5. Reload -> state remains exact
    await page.reload();
    await expect(page.getByText('14:00 – 15:00 (60m)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Move Linear Algebra Homework' })).toHaveCount(1);

    // 6. Inspect IndexedDB to prove MOVE != COPY at the storage level
    const timeBlocksCount = await getStoreCount(page, 'timeBlocks');
    expect(timeBlocksCount).toBe(1);
  });

  test('Journey 3: Capacity overbooking is displayed factually and block overlap is rejected', async ({
    page,
  }) => {
    await clearIndexedDB(page);

    const today = getTodayLocalDate();

    await page.goto('/planner');
    await expect(page.getByRole('heading', { name: 'Flexible Planner' })).toBeVisible();

    // 1. Explicitly set today capacity to 120 min
    await page.getByRole('button', { name: `Edit capacity for ${today}` }).click();
    await expect(page.getByRole('dialog', { name: `Edit Daily Capacity (${today})` })).toBeVisible();
    await page.getByLabel(/^Daily Capacity/i).fill('120');
    await page.getByRole('button', { name: 'Save Capacity' }).click();

    await expect(page.getByText('0m / 120m planned')).toBeVisible();

    // 2. Create tasks to schedule: 90m and 60m (total 150m > 120m)
    await page.goto('/today');
    await page.getByLabel('Task title').fill('Physics Block A');
    await page.getByLabel('Estimated minutes').fill('90');
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByRole('button', { name: 'Complete Physics Block A' })).toBeVisible();

    await page.getByLabel('Task title').fill('Physics Block B');
    await page.getByLabel('Estimated minutes').fill('60');
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByRole('button', { name: 'Complete Physics Block B' })).toBeVisible();

    await page.getByLabel('Task title').fill('Physics Block C Overlap Candidate');
    await page.getByLabel('Estimated minutes').fill('60');
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(
      page.getByRole('button', { name: 'Complete Physics Block C Overlap Candidate' }),
    ).toBeVisible();

    // 3. Schedule Block A (08:00–09:30 = 90m) and Block B (10:00–11:00 = 60m)
    await page.goto('/planner');
    await page.getByRole('button', { name: 'Schedule Physics Block A' }).click();
    await page.getByLabel('Start Time').fill('08:00');
    await page.getByLabel('End Time').fill('09:30');
    await page.getByRole('button', { name: 'Confirm Schedule' }).click();

    await page.getByRole('button', { name: 'Schedule Physics Block B' }).click();
    await page.getByLabel('Start Time').fill('10:00');
    await page.getByLabel('End Time').fill('11:00');
    await page.getByRole('button', { name: 'Confirm Schedule' }).click();

    // 4. Verify capacity display shows 150m / 120m planned and Over planned capacity banner
    await expect(page.getByText('150m / 120m planned')).toBeVisible();
    await expect(page.getByText('Over planned capacity')).toBeVisible();
    await expect(page.getByText('Physics Block A')).toBeVisible();
    await expect(page.getByText('Physics Block B')).toBeVisible();

    // 5. Attempt overlap: schedule Block C at 09:00–10:00 (overlaps with Block A 08:00–09:30)
    await page.getByRole('button', { name: 'Schedule Physics Block C Overlap Candidate' }).click();
    await page.getByLabel('Start Time').fill('09:00');
    await page.getByLabel('End Time').fill('10:00');
    await page.getByRole('button', { name: 'Confirm Schedule' }).click();

    // Overlap error must be displayed visibly in the modal
    const scheduleModal = page.getByRole('dialog', { name: 'Schedule Work Item' });
    await expect(scheduleModal.getByRole('alert')).toBeVisible();
    await expect(scheduleModal.getByRole('alert')).toContainText(/overlaps with existing block/i);

    // Close modal and verify original blocks untouched
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Physics Block A')).toBeVisible();
    await expect(page.getByText('Physics Block B')).toBeVisible();

    // 6. Reload and verify IndexedDB never persisted the overlapping block
    await page.reload();
    await expect(page.getByText('150m / 120m planned')).toBeVisible();
    await expect(page.getByText('Over planned capacity')).toBeVisible();
    const timeBlocksCount = await getStoreCount(page, 'timeBlocks');
    expect(timeBlocksCount).toBe(2);
  });

  test('Journey 4: Plan mutation in planner does not rewrite immutable daily commitment snapshot', async ({
    page,
  }) => {
    await clearIndexedDB(page);

    // 1. Today -> create WorkItem -> schedule TODAY at 09:00–10:00
    await page.goto('/today');
    await page.getByLabel('Task title').fill('Calculus Integration');
    await page.getByLabel('Estimated minutes').fill('60');
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByRole('button', { name: 'Complete Calculus Integration' })).toBeVisible();

    await page.getByLabel('Time block task').selectOption({ label: 'Calculus Integration' });
    await page.getByLabel('Time block start').fill('09:00');
    await page.getByLabel('Time block end').fill('10:00');
    await page.getByRole('button', { name: 'Add time block' }).click();

    await expect(page.getByText('09:00–10:00')).toBeVisible();

    // 2. Commit Today
    await page.getByRole('button', { name: 'Commit Today' }).click();
    await expect(page.getByText(/Committed at/)).toBeVisible();

    // 3. Planner -> locate TODAY -> move block to 14:00–15:00
    await page.goto('/planner');
    await page.getByRole('button', { name: 'Move Calculus Integration' }).click();
    await page.getByLabel('Start Time').fill('14:00');
    await page.getByLabel('End Time').fill('15:00');
    await page.getByRole('button', { name: 'Confirm Move' }).click();

    await expect(page.getByText('14:00 – 15:00 (60m)')).toBeVisible();

    // 4. Return to Today -> current plan changed, divergence detected, commitment snapshot preserved
    await page.goto('/today');
    await expect(page.getByText('14:00–15:00')).toBeVisible();
    await expect(page.getByText('Plan changed after commitment')).toBeVisible();
    await expect(page.getByText('Schedule changed')).toBeVisible();
    await expect(page.getByText(/Committed at/)).toBeVisible();

    // 5. Reload -> current plan remains at new time, divergence remains true
    await page.reload();
    await expect(page.getByText('14:00–15:00')).toBeVisible();
    await expect(page.getByText('Plan changed after commitment')).toBeVisible();
    await expect(page.getByText('Schedule changed')).toBeVisible();
    await expect(page.getByText(/Committed at/)).toBeVisible();
  });

  test('Journey 5: Deterministic project forecast is computed purely and creates zero time blocks', async ({
    page,
  }) => {
    await clearIndexedDB(page);

    const today = getTodayLocalDate();
    const targetDate = shiftLocalDate(today, 5);

    // 1. Projects -> create "Physics Revision" with target date 5 days away
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New Project' }).click();
    await page.getByLabel('Project Title').fill('Physics Revision');
    await page.getByLabel('Target Date').fill(targetDate);
    await page.getByRole('button', { name: 'Create Project' }).click();

    await expect(page.getByRole('heading', { name: 'Physics Revision' })).toBeVisible();

    // 2. Open project detail -> add 2 tasks totaling 240 minutes
    await page.getByRole('heading', { name: 'Physics Revision' }).click();
    await page.getByRole('button', { name: 'Add Task' }).click();
    await page.getByPlaceholder('Task title (e.g. Solve limit worksheet)').fill('Optics practice');
    await page.getByPlaceholder('Minutes').fill('120');
    await page.getByRole('button', { name: 'Save Task' }).click();
    await expect(page.getByText('Optics practice')).toBeVisible();

    await page.getByRole('button', { name: 'Add Task' }).click();
    await page.getByPlaceholder('Task title (e.g. Solve limit worksheet)').fill('Thermodynamics practice');
    await page.getByPlaceholder('Minutes').fill('120');
    await page.getByRole('button', { name: 'Save Task' }).click();
    await expect(page.getByText('Thermodynamics practice')).toBeVisible();

    // 3. Verify forecast card rendered
    await expect(page.getByRole('heading', { name: 'Schedule Forecast' })).toBeVisible();
    await expect(page.getByText('On Track')).toBeVisible();
    await expect(page.getByText('240m').first()).toBeVisible(); // Remaining Work

    // 4. Verify viewing forecast creates ZERO TimeBlocks
    const timeBlocksCount = await getStoreCount(page, 'timeBlocks');
    expect(timeBlocksCount).toBe(0);

    // 5. Reload and verify deterministic stability
    await page.reload();
    await page.getByRole('heading', { name: 'Physics Revision' }).click();
    await expect(page.getByRole('heading', { name: 'Schedule Forecast' })).toBeVisible();
    await expect(page.getByText('On Track')).toBeVisible();
    const timeBlocksCountAfter = await getStoreCount(page, 'timeBlocks');
    expect(timeBlocksCountAfter).toBe(0);
  });

  test('Regression: Viewing fallback capacity on future days does not persist artificial DailyPlans', async ({
    page,
  }) => {
    await clearIndexedDB(page);

    // Open Planner
    await page.goto('/planner');
    await expect(page.getByRole('heading', { name: 'Flexible Planner' })).toBeVisible();
    await expect(page.getByText('0m / 480m planned').first()).toBeVisible();

    // Navigate to next week
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(page.getByText('0m / 480m planned').first()).toBeVisible();

    // Reload
    await page.reload();
    await expect(page.getByText('0m / 480m planned').first()).toBeVisible();

    // Assert zero DailyPlans persisted simply from browsing
    const countAfter = await getStoreCount(page, 'dailyPlans');
    expect(countAfter).toBe(0);
  });
});
