export interface DailyPlan {
  id: string;
  date: string;
  capacityMinutes: number;
  morningIntention: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyPriority {
  id: string;
  dailyPlanId: string;
  workItemId: string;
  rank: 1 | 2 | 3;
}
