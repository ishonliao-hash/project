import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, ChevronRight } from 'lucide-react';
import type { Project } from '../types';
import { listProjects, createProject, deleteProject } from '../api/client';

interface Props {
  selectedId: string | null;
  onSelect: (project: Project) => void;
}

export default function ProjectSelector({ selectedId, onSelect }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await listProjects();
      setProjects(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const p = await createProject(newName.trim(), newDesc.trim());
    setProjects(prev => [...prev, p]);
    setNewName('');
    setNewDesc('');
    setCreating(false);
    onSelect(p);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return <div className="text-gray-400 text-sm p-4">Loading projects...</div>;

  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2 text-sm text-gray-300">
          <FolderOpen size={16} /> Projects
        </h2>
        <button
          onClick={() => setCreating(!creating)}
          className="text-film-accent hover:opacity-80 transition-opacity"
        >
          <Plus size={18} />
        </button>
      </div>

      {creating && (
        <div className="space-y-2 bg-film-dark rounded-lg p-3 border border-film-border">
          <input
            className="input text-sm"
            placeholder="Project name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <textarea
            className="textarea text-sm h-16"
            placeholder="Describe your film vision (optional)..."
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn-primary text-sm py-1.5 px-3" onClick={handleCreate}>
              Create
            </button>
            <button className="btn-secondary text-sm py-1.5 px-3" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {projects.length === 0 && !creating && (
          <p className="text-gray-500 text-sm text-center py-3">
            No projects yet. Create one above.
          </p>
        )}
        {projects.map(project => (
          <div
            key={project.id}
            onClick={() => onSelect(project)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
              selectedId === project.id
                ? 'bg-film-accent/10 border border-film-accent/30'
                : 'hover:bg-film-dark border border-transparent'
            }`}
          >
            <div className="min-w-0">
              <p className={`text-sm font-medium truncate ${selectedId === project.id ? 'text-film-accent' : 'text-white'}`}>
                {project.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {project.scenes.length} scene{project.scenes.length !== 1 ? 's' : ''}
                {project.edit_plan ? ' · edited' : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={e => handleDelete(e, project.id)}
                className="text-gray-500 hover:text-film-red p-1 rounded"
              >
                <Trash2 size={13} />
              </button>
              <ChevronRight size={14} className="text-gray-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
