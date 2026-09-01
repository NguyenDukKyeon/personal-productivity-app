'use client';

import { Calendar, FolderGit2, Plus, RefreshCw, Undo2 } from 'lucide-react';
import type { Project } from '@/domain/projects/project';
import type { ProjectService } from '../application/project-service';
import { useProjectController } from '../hooks/useProjectController';
import { ProjectDetail } from './ProjectDetail';
import { ProjectFormModal } from './ProjectFormModal';

interface ProjectsScreenProps {
  service: ProjectService;
}

export function ProjectsScreen({ service }: ProjectsScreenProps) {
  const {
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
    handleCreateProject,
    handleUpdateProject,
    handleArchiveProject,
    handleUnarchiveProject,
    handleCompleteProject,
    handleAddMilestone,
    handleCompleteMilestone,
    handleCreateWorkItem,
  } = useProjectController(service);

  if (selectedProjectId && selectedDetail) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <ProjectDetail
          detail={selectedDetail}
          onBack={() => setSelectedProjectId(null)}
          onEdit={() => {
            setEditingProject(selectedDetail.project);
            setIsProjectModalOpen(true);
          }}
          onArchive={() => handleArchiveProject(selectedDetail.project.id)}
          onComplete={() => handleCompleteProject(selectedDetail.project.id)}
          onAddMilestone={handleAddMilestone}
          onCompleteMilestone={handleCompleteMilestone}
          onCreateWorkItem={handleCreateWorkItem}
        />

        <ProjectFormModal
          isOpen={isProjectModalOpen}
          project={editingProject}
          onClose={() => {
            setIsProjectModalOpen(false);
            setEditingProject(null);
          }}
          onSubmit={(params) =>
            editingProject
              ? handleUpdateProject(editingProject.id, params)
              : handleCreateProject(params)
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Projects & Roadmaps
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Define long-term outcomes, milestones, and connect tasks to your flexible schedule.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingProject(null);
            setIsProjectModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e2538]">
        <div className="flex gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'active'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Active Projects
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'archived'}
            onClick={() => setActiveTab('archived')}
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'archived'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
        >
          {error}
        </div>
      )}

      {/* Projects List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
          <FolderGit2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
            {activeTab === 'active' ? 'No active projects' : 'No archived projects'}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {activeTab === 'active'
              ? 'Create a project to group your tasks and track long-term roadmaps.'
              : 'Archived projects will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-indigo-300 hover:shadow-xs dark:border-[#1e2538] dark:bg-[#121620] dark:hover:border-indigo-900/60"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      project.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : project.status === 'archived'
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
                    }`}
                  >
                    {project.status.toUpperCase()}
                  </span>

                  {project.targetDate && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {project.targetDate}
                    </span>
                  )}
                </div>

                <h2 className="mt-3 text-base font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                  {project.title}
                </h2>
                {project.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                    {project.description}
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-400 dark:border-slate-800">
                <span>View Details & Roadmap</span>
                {activeTab === 'archived' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnarchiveProject(project.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400"
                  >
                    <Undo2 className="h-3 w-3" />
                    Unarchive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <ProjectFormModal
        isOpen={isProjectModalOpen}
        project={editingProject}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSubmit={(params) =>
          editingProject
            ? handleUpdateProject(editingProject.id, params)
            : handleCreateProject(params)
        }
      />
    </div>
  );
}
