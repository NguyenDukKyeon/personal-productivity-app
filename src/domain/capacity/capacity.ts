import { err, ok, type Result } from '@/domain/shared/result';

export interface CapacitySummary {
  capacityMinutes: number;
  scheduledMinutes: number;
  remainingMinutes: number;
  isOverbooked: boolean;
  showHighCapacityCaution: boolean;
}

export function validateCapacityMinutes(minutes: number): Result<number> {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 960 || minutes % 30 !== 0) {
    return err('invalid_capacity', 'Capacity must be 0–960 minutes in 30-minute increments.');
  }
  return ok(minutes);
}

export function calculateCapacity(capacityMinutes: number, scheduledMinutes: number): CapacitySummary {
  const remainingMinutes = capacityMinutes - scheduledMinutes;
  return {
    capacityMinutes,
    scheduledMinutes,
    remainingMinutes,
    isOverbooked: remainingMinutes < 0,
    showHighCapacityCaution: capacityMinutes > 720,
  };
}
