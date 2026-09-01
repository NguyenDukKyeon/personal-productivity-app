# Habits & Routines — Consistency + Recovery Implementation Plan

**Branch:** `feat/habits-routines`  
**Base:** `main`  
**Specification:** `docs/superpowers/specs/2026-08-31-habits-routines-design.md`  

---

## 1. Plan Overview & Architectural Slices

We execute Phase 3 across 6 strict TDD slices with complete remediation:
1. **Slice 1: Domain Core (Habit, Schedule, Check-In, Recovery, Metrics, Lifecycle Intervals, Schedule Revisions)**
2. **Slice 2: Persistence & DB Schema v3 Migration (Strict Corrupt Record Quarantine, Audit Timestamp Preservation, Single-Source Routines)**
3. **Slice 3: Application Service Layer (Check-In Boundary Eligibility, Clock Injection, View Model Separation)**
4. **Slice 4: UI Components & Controller Hook (HabitTodayCard, RoutineSection, HabitForm, HabitsScreen, Skip State Isolation)**
5. **Slice 5: Navigation & Dashboard Route Integration (`/habits`)**
6. **Slice 6: E2E Verification & CI Validation (4 Distinct Playwright Journeys, Quality Gates, Parity, Documentation)**

---

## 2. File Map

### Domain Layer (`src/domain/habits/`)
- `src/domain/habits/habit-schedule.ts`
- `src/domain/habits/habit-schedule.test.ts`
- `src/domain/habits/habit.ts` (with `activeIntervals`, `scheduleRevisions`, pre-write validation)
- `src/domain/habits/habit.test.ts`
- `src/domain/habits/habit-check-in.ts` (with pre-write validation)
- `src/domain/habits/habit-check-in.test.ts`
- `src/domain/habits/routine.ts` (with pre-write validation)
- `src/domain/habits/routine.test.ts`
- `src/domain/habits/habit-recovery.ts` (with lifecycle-aware candidate evaluation)
- `src/domain/habits/habit-recovery.test.ts`
- `src/domain/habits/habit-metrics.ts` (with effective-schedule denominator)
- `src/domain/habits/habit-metrics.test.ts`

### Persistence Layer (`src/infrastructure/persistence/`)
- `src/infrastructure/persistence/contracts/habit-repository.ts`
- `src/infrastructure/persistence/guest/guest-db.ts` (Upgrade to v3)
- `src/infrastructure/persistence/guest/guest-habit-repository.ts` (strict corrupt_record quarantine, audit timestamp preservation, atomic routine mutations)
- `src/infrastructure/persistence/guest/guest-habit-repository.test.ts` (corruption tests, v2->v3 migration test)

### Application Layer (`src/features/habits/application/`)
- `src/features/habits/application/habit-service.ts` (check-in boundary eligibility, scheduled vs unscheduled separation)
- `src/features/habits/application/habit-service.test.ts`
- `src/features/habits/application/client-habit-service.ts`

### UI & Presentation Layer (`src/features/habits/`)
- `src/features/habits/hooks/useHabitController.ts`
- `src/features/habits/components/HabitTodayCard.tsx` (async skip result await, unscheduled card separation)
- `src/features/habits/components/HabitFormModal.tsx` (reset on open, preserve user edits on persistence failure)
- `src/features/habits/components/RoutineSection.tsx`
- `src/features/habits/components/HabitHistoryModal.tsx`
- `src/features/habits/components/HabitsScreen.tsx`
- `src/features/habits/habits-ui.test.tsx`

### Route & Navigation Integration
- `src/components/shell/Sidebar.tsx` (Add `/habits` link)
- `src/app/(dashboard)/habits/page.tsx`

### End-to-End & Documentation
- `e2e/habits.spec.ts` (4 distinct Playwright acceptance journeys)
- `docs/superpowers/parity/smart-planner-behavior-parity.md`
- `README.md`

---

## 3. Verification Matrix

| Check | Tool / Command | Invariants Tested |
|---|---|---|
| Domain Unit Tests | `npx vitest run src/domain/habits/` | Lifecycle intervals, schedule revisions, pre-write validation, recovery state |
| Persistence Unit Tests | `npx vitest run src/infrastructure/persistence/guest/guest-habit-repository.test.ts` | Corrupt record quarantine, v2->v3 migration, atomic routine mutations |
| Service Unit Tests | `npx vitest run src/features/habits/application/habit-service.test.ts` | Injected clock, future/inactive/unscheduled date rejection, view separation |
| UI Component Tests | `npx vitest run src/features/habits/habits-ui.test.tsx` | Form modal lifecycle & edit preservation, skip state persistence |
| Full Test Suite | `npm test` | All unit & integration tests green |
| TypeScript | `npm run typecheck` | 0 errors |
| Lint | `npm run lint` | 0 errors |
| Production Build | `npm run build` | Next.js SSG/SSR build clean |
| Playwright E2E | `npm run e2e` | 4 distinct acceptance journeys green |
