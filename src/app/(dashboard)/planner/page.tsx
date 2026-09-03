'use client';

import { useEffect, useState } from 'react';
import { createClientPlannerService } from '@/features/planner/application/client-planner-service';
import type { PlannerService } from '@/features/planner/application/planner-service';
import { PlannerScreen } from '@/features/planner/components/PlannerScreen';

export default function PlannerPage() {
  const [service, setService] = useState<PlannerService | null>(null);

  useEffect(() => {
    let active = true;
    createClientPlannerService().then((svc) => {
      if (active) {
        setService(svc);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!service) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        Loading planner workstation...
      </div>
    );
  }

  return <PlannerScreen service={service} />;
}
