import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ProjectSelector from './components/ProjectSelector';
import SceneUploader from './components/SceneUploader';
import SceneCard from './components/SceneCard';
import DescriptionPanel from './components/DescriptionPanel';
import Timeline from './components/Timeline';
import AIReasoningPanel from './components/AIReasoningPanel';
import ExportPanel from './components/ExportPanel';
import type { Project, Scene, EditPlan, EditDecision } from './types';
import { getProject, updateEditPlan, deleteScene } from './api/client';
import { Layers, Film, Scissors, RefreshCw } from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshProject = useCallback(async (id: string) => {
    setRefreshing(true);
    try {
      const p = await getProject(id);
      setProject(p);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleSelectProject = (p: Project) => {
    setProject(p);
  };

  const handleSceneAdded = (scene: Scene) => {
    setProject(prev => prev ? { ...prev, scenes: [...prev.scenes, scene] } : prev);
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!project) return;
    await deleteScene(project.id, sceneId);
    setProject(prev => prev ? {
      ...prev,
      scenes: prev.scenes.filter(s => s.id !== sceneId)
    } : prev);
  };

  const handleEditPlanGenerated = (plan: EditPlan) => {
    setProject(prev => prev ? { ...prev, edit_plan: plan } : prev);
  };

  const handleProjectUpdated = (updated: Project) => {
    setProject(updated);
  };

  const handlePlanUpdate = async (decisions: EditDecision[]) => {
    if (!project) return;
    const updated = await updateEditPlan(project.id, decisions);
    setProject(prev => prev ? { ...prev, edit_plan: updated } : prev);
  };

  const sceneIdsInPlan = new Set(project?.edit_plan?.decisions.map(d => d.scene_id) ?? []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-film-border overflow-y-auto p-3 space-y-3">
          <ProjectSelector
            selectedId={project?.id ?? null}
            onSelect={handleSelectProject}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {!project ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="flex justify-center gap-3 text-film-border">
                  <Film size={40} />
                  <Scissors size={32} />
                </div>
                <h2 className="text-xl font-semibold text-gray-300">AI Film Editor</h2>
                <p className="text-gray-500 max-w-sm">
                  Select or create a project to start editing.
                  Upload your scenes, describe your vision, and let AI craft your film.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4 max-w-5xl mx-auto">
              {/* Project header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{project.name}</h2>
                  <p className="text-sm text-gray-500">
                    {project.scenes.length} scene{project.scenes.length !== 1 ? 's' : ''}
                    {project.edit_plan
                      ? ` · ${project.edit_plan.decisions.length} clips in edit plan`
                      : ''}
                  </p>
                </div>
                <button
                  onClick={() => refreshProject(project.id)}
                  disabled={refreshing}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {/* Top row: Description + Upload */}
              <div className="grid grid-cols-2 gap-4">
                <DescriptionPanel
                  project={project}
                  onEditPlanGenerated={handleEditPlanGenerated}
                  onProjectUpdated={handleProjectUpdated}
                />

                <div className="panel p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers size={15} className="text-film-accent" />
                    <h2 className="font-semibold text-sm">Upload Scenes</h2>
                  </div>
                  <SceneUploader
                    projectId={project.id}
                    onSceneAdded={handleSceneAdded}
                  />
                </div>
              </div>

              {/* Scene library */}
              {project.scenes.length > 0 && (
                <div className="panel p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film size={15} className="text-film-accent" />
                      <h2 className="font-semibold text-sm">Scene Library</h2>
                    </div>
                    <span className="text-xs text-gray-500">{project.scenes.length} scenes</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {project.scenes.map(scene => (
                      <SceneCard
                        key={scene.id}
                        scene={scene}
                        onDelete={handleDeleteScene}
                        isInPlan={sceneIdsInPlan.has(scene.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {project.edit_plan && (
                <>
                  <AIReasoningPanel plan={project.edit_plan} />
                  <Timeline
                    plan={project.edit_plan}
                    scenes={project.scenes}
                    onPlanUpdate={handlePlanUpdate}
                  />
                  <ExportPanel project={project} />
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
