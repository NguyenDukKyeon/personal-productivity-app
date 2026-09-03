import { createGuestPlannerRepository } from '@/infrastructure/persistence/guest/guest-planner-repository';
import { createGuestProjectRepository } from '@/infrastructure/persistence/guest/guest-project-repository';
import { createGuestTodayRepository } from '@/infrastructure/persistence/guest/guest-today-repository';
import { PlannerService } from './planner-service';

export async function createClientPlannerService(): Promise<PlannerService> {
  const plannerRepo = await createGuestPlannerRepository();
  const todayRepo = await createGuestTodayRepository();
  const projectRepo = await createGuestProjectRepository();
  return new PlannerService(plannerRepo, todayRepo, projectRepo);
}
