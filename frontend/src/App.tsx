import { useState } from 'react';
import Header from './components/Header';
import ProjectSelector from './components/ProjectSelector';
import SceneUploader from './components/SceneUploader';
import SceneCard from './components/SceneCard';
import Timeline from './components/Timeline';
import ExportPanel from './components/ExportPanel';
import type { Project, Scene, EditDecision } from './types';
import { deleteScene, saveEditPlan } from './api/client';
import { Film, Scissors, Layers } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function App() {
  const [project, setProject] = useState<Project | null>(null);

  const handleSelectProject = (p: Project) => setProject(p);

  const handleSceneAdded = (scene: Scene) => {
    setProject(prev => prev ? { ...prev, scenes: [...prev.scenes, scene] } : prev);
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!project) return;
    await deleteScene(project.id, sceneId);
    // Also remove from timeline if present
    const newDecisions = (project.edit_plan?.decisions ?? [])
      .filter(d => d.scene_id !== sceneId)
      .map((d, i) => ({ ...d, order: i + 1 }));
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: prev.scenes.filter(s => s.id !== sceneId),
        edit_plan: prev.edit_plan ? { ...prev.edit_plan, decisions: newDecisions } : undefined
      };
    });
  };

  const handleAddToTimeline = async (scene: Scene) => {
    if (!project) return;
    const existing = project.edit_plan?.decisions ?? [];
    const newDecision: EditDecision = {
      id: uuidv4(),
      scene_id: scene.id,
      scene_filename: scene.filename,
      order: existing.length + 1,
      in_point: 0,
      out_point: 0,
      transition_type: existing.length === 0 ? 'fade_in' : 'cut',
      transition_duration: 0.5,
    };
    const updated = [...existing, newDecision];
    const plan = await saveEditPlan(project.id, updated);
    setProject(prev => prev ? { ...prev, edit_plan: plan } : prev);
  };

  const handlePlanUpdate = async (decisions: EditDecision[]) => {
    if (!project) return;
    const plan = await saveEditPlan(project.id, decisions);
    setProject(prev => prev ? { ...prev, edit_plan: plan } : prev);
  };

  const timelineSceneIds = new Set(project?.edit_plan?.decisions.map(d => d.scene_id) ?? []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 flex-shrink-0 border-r border-film-border overflow-y-auto p-3">
          <ProjectSelector selectedId={project?.id ?? null} onSelect={handleSelectProject} />
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          {!project ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 max-w-sm">
                <div className="flex justify-center gap-3 text-film-border">
                  <Film size={40} /><Scissors size={32} />
                </div>
                <h2 className="text-xl font-semibold text-gray-300">Film Editor</h2>
                <p className="text-gray-500 text-sm">
                  Create a project in the sidebar, upload your scenes, arrange them in the timeline, and export your film.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4 max-w-5xl mx-auto">
              {/* Project title */}
              <h2 className="text-xl font-bold">{project.name}</h2>

              {/* Upload */}
              <div className="panel p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-film-accent" />
                  <h2 className="font-semibold text-sm">Upload Scenes</h2>
                </div>
                <SceneUploader projectId={project.id} onSceneAdded={handleSceneAdded} />
              </div>

              {/* Scene library */}
              {project.scenes.length > 0 && (
                <div className="panel p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film size={15} className="text-film-accent" />
                      <h2 className="font-semibold text-sm">Scene Library</h2>
                    </div>
                    <span className="text-xs text-gray-500">
                      Click <span className="text-film-accent font-bold">+</span> to add a scene to the timeline
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {project.scenes.map(scene => (
                      <SceneCard
                        key={scene.id}
                        scene={scene}
                        onDelete={handleDeleteScene}
                        onAddToTimeline={handleAddToTimeline}
                        isInTimeline={timelineSceneIds.has(scene.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline — always visible once a project is open */}
              <Timeline
                plan={project.edit_plan}
                scenes={project.scenes}
                onPlanUpdate={handlePlanUpdate}
              />

              {/* Export */}
              {(project.edit_plan?.decisions.length ?? 0) > 0 && (
                <ExportPanel project={project} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
