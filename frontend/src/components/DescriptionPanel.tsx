import { useState } from 'react';
import { Sparkles, Wand2, Brain } from 'lucide-react';
import type { Project, EditPlan } from '../types';
import { generateEditPlan, updateProject } from '../api/client';

interface Props {
  project: Project;
  onEditPlanGenerated: (plan: EditPlan) => void;
  onProjectUpdated: (project: Project) => void;
}

export default function DescriptionPanel({ project, onEditPlanGenerated, onProjectUpdated }: Props) {
  const [description, setDescription] = useState(project.description);
  const [generating, setGenerating] = useState(false);
  const [thinking, setThinking] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSaveDesc = async () => {
    const updated = await updateProject(project.id, { description });
    onProjectUpdated(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGenerate = async () => {
    if (!project.scenes.length) {
      setError('Upload at least one scene first.');
      return;
    }
    setError('');
    setThinking('');
    setGenerating(true);

    // Stream the AI thinking process via SSE
    const descParam = description ? `?description=${encodeURIComponent(description)}` : '';
    const evtSource = new EventSource(`/api/editor/stream/${project.id}${descParam}`);

    evtSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        evtSource.close();
        // Now fetch the final plan
        generateEditPlan(project.id, description || undefined)
          .then(plan => {
            onEditPlanGenerated(plan);
            setGenerating(false);
            setThinking('');
          })
          .catch(e => {
            setError(e.message || 'Generation failed');
            setGenerating(false);
          });
        return;
      }
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.error) {
          setError(parsed.error);
          evtSource.close();
          setGenerating(false);
          return;
        }
        if (parsed.chunk) {
          const chunk = parsed.chunk as string;
          if (chunk.startsWith('THINKING:')) {
            setThinking(prev => prev + chunk.slice(9));
          }
        }
      } catch {}
    };

    evtSource.onerror = () => {
      evtSource.close();
      setGenerating(false);
    };
  };

  return (
    <div className="panel p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 size={16} className="text-film-accent" />
        <h2 className="font-semibold text-sm">Your Vision</h2>
      </div>

      <div className="space-y-2">
        <textarea
          className="textarea h-28 text-sm"
          placeholder="Describe the film you want to make...

Examples:
• 'A cinematic travel film with dramatic wide shots first, then intimate moments'
• 'Fast-paced action montage — quick cuts, keep the energy high'
• 'Emotional documentary: start slow, build to a powerful climax'"
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={generating}
        />
        <div className="flex gap-2">
          <button
            className="btn-secondary text-xs py-1.5 px-3 flex-1"
            onClick={handleSaveDesc}
            disabled={generating}
          >
            {saved ? '✓ Saved' : 'Save Description'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-film-red text-xs bg-film-red/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* AI Thinking stream */}
      {generating && thinking && (
        <div className="bg-film-dark rounded-lg p-3 max-h-32 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={12} className="text-film-blue" />
            <span className="text-xs text-film-blue font-medium">AI Thinking...</span>
            <div className="flex gap-0.5">
              {[0,1,2].map(i => (
                <div key={i} className="thinking-dot w-1 h-1 bg-film-blue rounded-full" />
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{thinking}</p>
        </div>
      )}

      <button
        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
        onClick={handleGenerate}
        disabled={generating || !project.scenes.length}
      >
        {generating ? (
          <>
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="thinking-dot w-1.5 h-1.5 bg-black rounded-full" />
              ))}
            </div>
            <span className="text-sm">AI is editing...</span>
          </>
        ) : (
          <>
            <Sparkles size={16} />
            <span className="text-sm font-semibold">Generate Edit Plan</span>
          </>
        )}
      </button>

      {!project.scenes.length && (
        <p className="text-xs text-gray-500 text-center">Upload scenes to enable AI editing</p>
      )}
    </div>
  );
}
