import { createGuestTodayRepository } from '@/infrastructure/persistence/guest/guest-today-repository';
import { createTodayService, type TodayService } from './today-service';

let servicePromise: Promise<TodayService> | null = null;

export function getGuestTodayService(): Promise<TodayService> {
  if (!servicePromise) {
    servicePromise = createGuestTodayRepository().then((repository) =>
      createTodayService({
        repository,
        now: () => new Date(),
        newId: () => crypto.randomUUID(),
      }),
    );
  }
  return servicePromise;
}
