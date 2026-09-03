import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@/domain/projects/project';
import type { WorkItemPriority, WorkItemType } from '@/domain/work-items/work-item';
import type { ProjectDetail, ProjectService } from '../application/project-service';

export function useProjectController(service: ProjectService) {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await service.listProjects(activeTab === 'archived');
    if (!res.ok) {
      setError(res.message);
      setIsLoading(false);
      return;
    }
    setProjects(res.value);
    setIsLoading(false);
  }, [activeTab, service]);

  const loadDetail = useCallback(
    async (projectId: string) => {
      const res = await service.getProjectDetail(projectId);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSelectedDetail(res.value);
    },
    [service],
  );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      loadDetail(selectedProjectId);
    } else {
      setSelectedDetail(null);
    }
  }, [selectedProjectId, loadDetail]);

  const handleCreateProject = async (params: {
    title: string;
    description?: string;
    targetDate?: string | null;
  }) => {
    setError(null);
    const res = await service.createProject(params);
    if (!res.ok) {
      setError(res.message);
      return res;
    }
    await loadProjects();
    setIsProjectModalOpen(false);
    return res;
  };

  const handleUpdateProject = async (
    id: string,
    params: { title?: string; description?: string; targetDate?: string | null },
  ) => {
    setError(null);
    const res = await service.updateProject(id, params);
    if (!res.ok) {
      setError(res.message);
      return res;
    }
    await loadProjects();
    if (selectedProjectId === id) {
      await loadDetail(id);
    }
    setIsProjectModalOpen(false);
    setEditingProject(null);
    return res;
  };

  const handleArchiveProject = async (id: string) => {
    setError(null);
    const res = await service.archiveProject(id);
    if (!res.ok) {
      setError(res.message);
      return res;
    }
    if (selectedProjectId === id) {
      setSelectedProjectId(null);
    }
    await loadProjects();
    return res;
  };

  const handleUnarchiveProject = async (id: string) => {
    setError(null);
    const res = await service.unarchiveProject(id);
    if (!res.ok) {
      setError(res.message);
      return res;
    }
    await loadProjects();
    return res;
  };

  const handleCompleteProject = async (id: string) => {
    setError(null);
    const res = await service.completeProject(id);
    if (!res.ok) {
      setError(res.message);
      return res;
    }
    await loadProjects();
    if (selectedProjectId === id) {
      await loadDetail(id);
    }
    return res;
  };

  const handleAddMilestone = async (params: {
    projectId: string;
    title: string;
    targetDate?: string | null;
  }) => {
    setError(null);
    const res = await service.createMilestone(params);
    if (!res.ok) {
      setError(res.message);
      return res;
    }
    await loadDetail(params.projectId);
    return res;
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    setError(null);
    const res = await service.completeMilestone(milestoneId);
    if (!res.ok) {
      setError(res.message);
      return res;
    }
    if (selectedProjectId) {
      await loadDetail(selectedProjectId);
    }
    return res;
  };

  const handleCreateWorkItem = async (params: {
    projectId: string;
    title: string;
    estimatedMinutes?: number;
    priority?: WorkItemPriority;
    type?: WorkItemType;
  }) => {
    setError(null);
    const res = await service.createWorkItemForProject(params);
    if (!res.ok) {
      setError(res.message);
      return res;
    }
    await loadDetail(params.projectId);
    return res;
  };

  return {
    activeTab,
    setActiveTab,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    selectedDetail,
    isLoading,
    error,
    isProjectModalOpen,
    setIsProjectModalOpen,
    editingProject,
    setEditingProject,
    loadProjects,
    loadDetail,
    handleCreateProject,
    handleUpdateProject,
    handleArchiveProject,
    handleUnarchiveProject,
    handleCompleteProject,
    handleAddMilestone,
    handleCompleteMilestone,
    handleCreateWorkItem,
  };
}
