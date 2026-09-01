import { createHabitService, type HabitService } from '@/features/habits/application/habit-service';
import { createGuestHabitRepository } from '@/infrastructure/persistence/guest/guest-habit-repository';

let servicePromise: Promise<HabitService> | null = null;

export function getGuestHabitService(): Promise<HabitService> {
  if (!servicePromise) {
    servicePromise = createGuestHabitRepository().then((habitRepository) =>
      createHabitService({
        habitRepository,
        now: () => new Date(),
        newId: () => crypto.randomUUID(),
      }),
    );
  }
  return servicePromise;
}
