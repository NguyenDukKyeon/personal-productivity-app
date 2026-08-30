import { createFocusService, type FocusService } from '@/features/focus/application/focus-service';
import { createGuestFocusRepository } from '@/infrastructure/persistence/guest/guest-focus-repository';
import { createGuestTodayRepository } from '@/infrastructure/persistence/guest/guest-today-repository';

let servicePromise: Promise<FocusService> | null = null;

export function getGuestFocusService(): Promise<FocusService> {
  if (!servicePromise) {
    servicePromise = Promise.all([createGuestTodayRepository(), createGuestFocusRepository()]).then(
      ([todayRepository, focusRepository]) =>
        createFocusService({
          focusRepository,
          todayRepository,
          now: () => new Date(),
          newId: () => crypto.randomUUID(),
        }),
    );
  }
  return servicePromise;
}
