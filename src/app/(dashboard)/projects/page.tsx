'use client';

import { useEffect, useState } from 'react';
import { createClientProjectService } from '@/features/projects/application/client-project-service';
import type { ProjectService } from '@/features/projects/application/project-service';
import { ProjectsScreen } from '@/features/projects/components/ProjectsScreen';

export default function ProjectsPage() {
  const [service, setService] = useState<ProjectService | null>(null);

  useEffect(() => {
    let active = true;
    createClientProjectService().then((svc) => {
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
        Loading projects workstation...
      </div>
    );
  }

  return <ProjectsScreen service={service} />;
}
