# Habits & Routines — Consistency + Recovery Implementation Plan

**Branch:** `feat/habits-routines`  
**Base:** `main` (`1d76848f3993efd7926eb4e71f903f6e33f99e81`)  
**Specification:** `docs/superpowers/specs/2026-08-31-habits-routines-design.md`  

---

## 1. Plan Overview & Architectural Slices

We execute Phase 3 across 6 strict TDD slices:
1. **Slice 1: Domain Core (Habit, Schedule, Check-In, Recovery, Metrics)**
2. **Slice 2: Persistence & DB Schema v3 Migration (GuestHabitRepository)**
3. **Slice 3: Application Service Layer (HabitService)**
4. **Slice 4: UI Components & Controller Hook (HabitTodayCard, RoutineSection, HabitForm, HabitsScreen)**
5. **Slice 5: Navigation & Dashboard Route Integration (`/habits`)**
6. **Slice 6: E2E Verification & CI Validation (Playwright, Quality Gates, Parity, Documentation)**

---

## 2. File Map

### Domain Layer (`src/domain/habits/`)
- `src/domain/habits/habit-schedule.ts`
- `src/domain/habits/habit-schedule.test.ts`
- `src/domain/habits/habit.ts`
- `src/domain/habits/habit.test.ts`
- `src/domain/habits/habit-check-in.ts`
- `src/domain/habits/habit-check-in.test.ts`
- `src/domain/habits/routine.ts`
- `src/domain/habits/routine.test.ts`
- `src/domain/habits/habit-recovery.ts`
- `src/domain/habits/habit-recovery.test.ts`
- `src/domain/habits/habit-metrics.ts`
- `src/domain/habits/habit-metrics.test.ts`

### Persistence Layer (`src/infrastructure/persistence/`)
- `src/infrastructure/persistence/contracts/habit-repository.ts`
- `src/infrastructure/persistence/guest/guest-db.ts` (Upgrade to v3)
- `src/infrastructure/persistence/guest/guest-habit-repository.ts`
- `src/infrastructure/persistence/guest/guest-habit-repository.test.ts`

### Application Layer (`src/features/habits/application/`)
- `src/features/habits/application/habit-service.ts`
- `src/features/habits/application/habit-service.test.ts`
- `src/features/habits/application/client-habit-service.ts`

### UI & Presentation Layer (`src/features/habits/`)
- `src/features/habits/hooks/useHabitController.ts`
- `src/features/habits/components/HabitTodayCard.tsx`
- `src/features/habits/components/HabitFormModal.tsx`
- `src/features/habits/components/RoutineSection.tsx`
- `src/features/habits/components/HabitHistoryModal.tsx`
- `src/features/habits/components/HabitsScreen.tsx`
- `src/features/habits/habits-ui.test.tsx`

### Route & Navigation Integration
- `src/components/shell/Sidebar.tsx` (Add `/habits` link)
- `src/app/(dashboard)/habits/page.tsx`

### End-to-End & Documentation
- `e2e/habits.spec.ts`
- `docs/superpowers/parity/smart-planner-behavior-parity.md`
- `README.md`

---

## 3. Detailed Tasks & Execution Steps

### Slice 1: Domain Core (TDD)
- [ ] Task 1.1: RED test for `habit-schedule.ts` (`src/domain/habits/habit-schedule.test.ts`)
  - Test daily schedule, weekday set validation, ISO weekday calculation, Vietnam UTC+7 date handling.
- [ ] Task 1.2: GREEN `habit-schedule.ts` implementation & REFACTOR.
- [ ] Task 1.3: RED test for `habit.ts` (`src/domain/habits/habit.test.ts`)
  - Test habit creation, title/minimumVersion validations, status transitions (active/archived).
- [ ] Task 1.4: GREEN `habit.ts` implementation & REFACTOR.
- [ ] Task 1.5: RED test for `habit-check-in.ts` (`src/domain/habits/habit-check-in.test.ts`)
  - Test check-in creation (`full`, `minimum`, `skipped`), note truncation, invalid date rejection.
- [ ] Task 1.6: GREEN `habit-check-in.ts` implementation & REFACTOR.
- [ ] Task 1.7: RED test for `routine.ts` (`src/domain/habits/routine.test.ts`)
  - Test routine creation, habit reference ordering.
- [ ] Task 1.8: GREEN `routine.ts` implementation & REFACTOR.
- [ ] Task 1.9: RED test for `habit-recovery.ts` and `habit-metrics.ts` (`src/domain/habits/habit-recovery.test.ts`, `habit-metrics.test.ts`)
  - Test recovery state derivation (missed previous scheduled day -> recovery active), consistency rate, recovery counts.
- [ ] Task 1.10: GREEN `habit-recovery.ts` and `habit-metrics.ts` & REFACTOR.
- [ ] Commit: `feat(domain): implement habits, routines, check-in, and recovery domain logic`

### Slice 2: Persistence & DB Schema v3 Migration (TDD)
- [ ] Task 2.1: Define `HabitRepository` contract in `src/infrastructure/persistence/contracts/habit-repository.ts`.
- [ ] Task 2.2: RED test for `guest-db.ts` upgrade and `GuestHabitRepository` (`src/infrastructure/persistence/guest/guest-habit-repository.test.ts`)
  - Test DB upgrade from v2 to v3 preserving Phase 1 and Phase 2 stores.
  - Test habit CRUD, soft archiving, check-in uniqueness per `(habitId, date)`, routine CRUD.
  - Test corrupt record quarantine.
- [ ] Task 2.3: GREEN `guest-db.ts` upgrade to v3 and `GuestHabitRepository` implementation & REFACTOR.
- [ ] Commit: `feat(persistence): upgrade guest database to v3 and implement habit repository`

### Slice 3: Application Service Layer (TDD)
- [ ] Task 3.1: RED test for `HabitService` (`src/features/habits/application/habit-service.test.ts`)
  - Test `getHabitsView(dateKey)` grouping by routines and unassigned items.
  - Test check-in records (`recordCheckIn`, `clearCheckIn`), history querying.
  - Test routine operations (`createRoutine`, `updateRoutine`, `deleteRoutine`).
  - Test error handling when habit does not exist or repository write fails.
- [ ] Task 3.2: GREEN `HabitService` and `client-habit-service.ts` & REFACTOR.
- [ ] Commit: `feat(habits): implement habit application service layer`

### Slice 4: UI Presentation Layer & Controller Hook (TDD)
- [ ] Task 4.1: RED test for `habits-ui.test.tsx` (`src/features/habits/habits-ui.test.tsx`)
  - Test `useHabitController` loading and error states.
  - Test `HabitTodayCard` rendering title, cue, minimum viable version, and action buttons.
  - Test Full vs Minimum check-in actions and recovery banner display.
  - Test `HabitFormModal` preserving user input on validation/write errors.
- [ ] Task 4.2: GREEN UI components (`HabitTodayCard`, `HabitFormModal`, `RoutineSection`, `HabitHistoryModal`, `HabitsScreen`, `useHabitController`) & REFACTOR.
- [ ] Commit: `feat(ui): implement habits workstation screen, cards, and routines UI`

### Slice 5: Route & Shell Navigation Integration
- [ ] Task 5.1: Update `src/components/shell/Sidebar.tsx` to include `Habits` route (`/habits`).
- [ ] Task 5.2: Create page `src/app/(dashboard)/habits/page.tsx`.
- [ ] Task 5.3: Verify Next.js build and typecheck with all routes.
- [ ] Commit: `feat(routes): integrate habits route into dashboard shell`

### Slice 6: E2E Verification, Parity Register, and CI Validation
- [ ] Task 6.1: Write comprehensive Playwright journeys in `e2e/habits.spec.ts`:
  - Journey 1: Create daily habit with cue and minimum version -> check in Full -> reload -> check-in persists.
  - Journey 2: Create habit -> check in Minimum -> reload -> UI displays Minimum (truthful, not fake Full).
  - Journey 3: Weekday habit with missed past day -> loads today showing Recovery message -> check in Minimum -> recovered state reflected.
  - Journey 4: Create routine -> group habits -> reorder/view -> reload preserves routine configuration.
- [ ] Task 6.2: Run full automated verification gates:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run e2e`
- [ ] Task 6.3: Update Parity register (`docs/superpowers/parity/smart-planner-behavior-parity.md`) and `README.md`.
- [ ] Task 6.4: Push `feat/habits-routines` and create Draft PR on GitHub.
- [ ] Task 6.5: Inspect diff, verify CI run on PR head SHA, mark PR Ready for Review (keep unmerged).
- [ ] Commit: `test(e2e): add comprehensive habits and routines end-to-end tests and update parity`
