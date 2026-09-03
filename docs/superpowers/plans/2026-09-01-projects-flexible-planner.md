# Projects & Flexible Planner Implementation Plan

**Phase:** Phase 4  
**Design Document:** `docs/superpowers/specs/2026-09-01-projects-flexible-planner-design.md`  
**Status:** In Progress  

---

## 1. Plan Overview & Objectives

Deliver Phase 4: **Projects + Flexible Planner (Multi-Day Planning, Roadmaps, and Deterministic Forecast)** following strict Red -> Green -> Refactor TDD, atomic multi-entity persistence, strict corrupt record quarantine, and complete isolation of planning vs execution truth.

---

## 2. Tasks & Execution Steps

### Task 1: Project & Roadmap Domain Models
- [ ] Write failing domain unit tests in `src/domain/projects/project.test.ts`, `src/domain/projects/project-milestone.test.ts`, and `src/domain/projects/project-progress.test.ts`.
  - **RED command**: `npx vitest run src/domain/projects/`
  - **Expected failure**: Modules `project.ts`, `project-milestone.ts`, and `project-progress.ts` do not exist.
- [ ] Implement `src/domain/projects/project.ts`:
  - `Project` interface, `ProjectStatus` (`'active' | 'completed' | 'archived'`).
  - Validation: non-empty title (1..140 chars), valid `targetDate` (`YYYY-MM-DD` or null), timestamp semantics (`updatedAt >= createdAt`, `completedAt` consistent with status).
  - Pure functions: `createProject`, `updateProject`, `completeProject`, `archiveProject`, `unarchiveProject`.
- [ ] Implement `src/domain/projects/project-milestone.ts`:
  - `ProjectMilestone` interface, validation (title 1..140 chars, `order >= 0`, `projectId` non-empty, `targetDate` valid or null).
  - Pure functions: `createMilestone`, `updateMilestone`, `completeMilestone`, `reorderMilestones`.
- [ ] Implement `src/domain/projects/project-progress.ts`:
  - `calculateProjectProgress`: derived factual counts (`completedWorkItems`, `totalWorkItems`, `remainingEstimatedMinutes`, `actualMinutes`, `scheduledMinutes`).
- [ ] Verify:
  - **Verification command**: `npx vitest run src/domain/projects/`

### Task 2: Planner & Deterministic Forecast Domain
- [ ] Write failing domain unit tests in `src/domain/planner/planner-day.test.ts` and `src/domain/planner/planner-forecast.test.ts`.
  - **RED command**: `npx vitest run src/domain/planner/`
  - **Expected failure**: Modules `planner-day.ts` and `planner-forecast.ts` do not exist.
- [ ] Implement `src/domain/planner/planner-day.ts`:
  - `PlannerDayView`, `PlannerView` interfaces.
  - `buildPlannerDay`: calculates scheduled minutes, remaining capacity, and overbooking minutes based on explicit capacity or default (480 min).
  - TimeBlock overlap detection and validation for WorkItems.
- [ ] Implement `src/domain/planner/planner-forecast.ts`:
  - Pure deterministic forecast algorithm: calculates remaining estimated minutes, simulates daily available free capacity over 365 days, and determines `projectedCompletionDate` and status (`'on_track'`, `'at_risk'`, `'insufficient_data'`).
- [ ] Verify:
  - **Verification command**: `npx vitest run src/domain/planner/`

### Task 3: IndexedDB Schema Upgrade to v4 & Project Persistence
- [ ] Write failing persistence tests in `src/infrastructure/persistence/guest/guest-project-repository.test.ts`.
  - **RED command**: `npx vitest run src/infrastructure/persistence/guest/guest-project-repository.test.ts`
  - **Expected failure**: `guest-project-repository.ts` does not exist, DB version is 3.
- [ ] Upgrade `src/infrastructure/persistence/guest/guest-db.ts`:
  - Bump `GUEST_DB_VERSION = 4`.
  - Add object stores `projects` (`{ keyPath: 'id' }`) and `projectMilestones` (`{ keyPath: 'id' }`, index `projectId`).
- [ ] Implement contract `src/infrastructure/persistence/contracts/project-repository.ts` and `src/infrastructure/persistence/guest/guest-project-repository.ts`:
  - CRUD for projects and milestones.
  - Read-time Zod schema validation. If corrupt record found, return `err('corrupt_record', ...)` while leaving raw bytes untouched.
  - v3 -> v4 migration test asserting survival of Phase 1, Phase 2, and Phase 3 seeded records.
- [ ] Verify:
  - **Verification command**: `npx vitest run src/infrastructure/persistence/guest/guest-project-repository.test.ts`

### Task 4: Atomic Multi-Day Scheduling & Planner Persistence
- [ ] Write failing persistence tests in `src/infrastructure/persistence/guest/guest-planner-repository.test.ts`.
  - **RED command**: `npx vitest run src/infrastructure/persistence/guest/guest-planner-repository.test.ts`
  - **Expected failure**: `guest-planner-repository.ts` does not exist.
- [ ] Implement contract `src/infrastructure/persistence/contracts/planner-repository.ts` and `src/infrastructure/persistence/guest/guest-planner-repository.ts`:
  - `scheduleWorkItem(timeBlock, workItem)`: atomic `timeBlocks` + `workItems` transaction.
  - `removeTimeBlock(id, workItem)`: atomic `timeBlocks` + `workItems` transaction.
  - `moveTimeBlock(timeBlock)`: atomic update with overlap check.
  - `listTimeBlocksInRange(startDate, endDate)`: aggregated query for planner horizon.
  - Rollback tests proving complete transaction abort on injected failures.
- [ ] Verify:
  - **Verification command**: `npx vitest run src/infrastructure/persistence/guest/guest-planner-repository.test.ts`

### Task 5: Project Application Service
- [ ] Write failing service tests in `src/features/projects/application/project-service.test.ts`.
  - **RED command**: `npx vitest run src/features/projects/application/project-service.test.ts`
  - **Expected failure**: `project-service.ts` does not exist.
- [ ] Implement `src/features/projects/application/project-service.ts` & `client-project-service.ts`:
  - Project management methods: `createProject`, `updateProject`, `archiveProject`, `unarchiveProject`, `listProjects`, `getProjectDetail` (aggregating milestones, work items, factual progress, and forecast).
  - Milestone management methods: `createMilestone`, `updateMilestone`, `completeMilestone`, `reorderMilestones`.
  - WorkItem project association methods: `createWorkItemForProject`, `assignWorkItemToProject`, `removeWorkItemFromProject`.
- [ ] Verify:
  - **Verification command**: `npx vitest run src/features/projects/application/project-service.test.ts`

### Task 6: Planner Application Service
- [ ] Write failing service tests in `src/features/planner/application/planner-service.test.ts`.
  - **RED command**: `npx vitest run src/features/planner/application/planner-service.test.ts`
  - **Expected failure**: `planner-service.ts` does not exist.
- [ ] Implement `src/features/planner/application/planner-service.ts` & `client-planner-service.ts`:
  - `getPlannerView(startDate, days)`: loads 7-day horizon with daily plans, scheduled timeblocks, and backlog items in aggregated reads.
  - `scheduleWorkItem`, `moveTimeBlock`, `removeTimeBlock`, `setDayCapacity`.
- [ ] Verify:
  - **Verification command**: `npx vitest run src/features/planner/application/planner-service.test.ts`

### Task 7: Projects UI Components & Route
- [ ] Write failing component tests in `src/features/projects/projects-ui.test.tsx`.
  - **RED command**: `npx vitest run src/features/projects/projects-ui.test.tsx`
  - **Expected failure**: UI components and hook do not exist.
- [ ] Implement:
  - `src/features/projects/hooks/useProjectController.ts`
  - `src/features/projects/components/ProjectsScreen.tsx`
  - `src/features/projects/components/ProjectDetail.tsx`
  - `src/features/projects/components/ProjectFormModal.tsx`
  - `src/features/projects/components/MilestoneSection.tsx`
  - `src/features/projects/components/ProjectForecastCard.tsx`
  - `src/app/(dashboard)/projects/page.tsx`
- [ ] Verify:
  - **Verification command**: `npx vitest run src/features/projects/projects-ui.test.tsx`

### Task 8: Flexible Planner UI Components & Route
- [ ] Write failing component tests in `src/features/planner/planner-ui.test.tsx`.
  - **RED command**: `npx vitest run src/features/planner/planner-ui.test.tsx`
  - **Expected failure**: Planner UI components and hook do not exist.
- [ ] Implement:
  - `src/features/planner/hooks/usePlannerController.ts`
  - `src/features/planner/components/PlannerScreen.tsx`
  - `src/features/planner/components/PlannerWeek.tsx`
  - `src/features/planner/components/PlannerDayCard.tsx`
  - `src/features/planner/components/PlannerBacklog.tsx`
  - `src/features/planner/components/ScheduleWorkItemModal.tsx`
  - `src/features/planner/components/MoveTimeBlockModal.tsx`
  - `src/features/planner/components/EditCapacityModal.tsx`
  - `src/app/(dashboard)/planner/page.tsx`
  - Update `src/components/shell/Sidebar.tsx` to enable `/planner` and `/projects` links.
- [ ] Verify:
  - **Verification command**: `npx vitest run src/features/planner/planner-ui.test.tsx`

### Task 9: E2E Journeys & Today/Commitment Integration Verification
- [ ] Implement `e2e/projects-planner.spec.ts` with 5 journeys:
  - Journey 1: Create Project -> Create WorkItem under Project -> Open Planner -> Item in Backlog -> Schedule Monday -> Reload -> Project link and TimeBlock persist.
  - Journey 2: Schedule WorkItem on Tuesday -> Move to Wednesday -> Reload -> Tuesday clear, Wednesday scheduled.
  - Journey 3: Set Day Capacity -> Schedule blocks exceeding capacity -> Verify explicit overbooking banner -> Attempt overlapping block -> Verify overlap rejection and existing block intact.
  - Journey 4: Commit Today on `/today` -> Open `/planner` and modify today's block -> Return to `/today` -> Current plan updated, committed snapshot unchanged, divergence visible.
  - Journey 5: Create Project with estimates -> Configure capacity -> Verify deterministic forecast calculation -> Reload -> State and forecast persist.
- [ ] Verify:
  - **Verification command**: `npm run e2e`

### Task 10: Final Quality Gates & Parity Documentation
- [ ] Update `docs/superpowers/parity/smart-planner-behavior-parity.md` (Projects, Milestones, Planner, Forecast, Backlog).
- [ ] Update `README.md` with Phase 4 capabilities.
- [ ] Run full quality gates:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run e2e`
  - `git diff --check`
  - `git status`
