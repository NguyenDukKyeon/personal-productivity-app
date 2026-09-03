import { createGuestPlannerRepository } from '@/infrastructure/persistence/guest/guest-planner-repository';
import { createGuestProjectRepository } from '@/infrastructure/persistence/guest/guest-project-repository';
import { createGuestTodayRepository } from '@/infrastructure/persistence/guest/guest-today-repository';
import { ProjectService } from './project-service';

export async function createClientProjectService(): Promise<ProjectService> {
  const projectRepo = await createGuestProjectRepository();
  const todayRepo = await createGuestTodayRepository();
  const plannerRepo = await createGuestPlannerRepository();
  return new ProjectService(projectRepo, todayRepo, plannerRepo);
}
