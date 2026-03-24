import { Trash2, Clock, Camera, Plus } from 'lucide-react';
import type { Scene } from '../types';
import { getThumbnailUrl } from '../api/client';

interface Props {
  scene: Scene;
  onDelete: (id: string) => void;
  onAddToTimeline: (scene: Scene) => void;
  isInTimeline?: boolean;
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SceneCard({ scene, onDelete, onAddToTimeline, isInTimeline }: Props) {
  const thumbUrl = scene.thumbnail ? getThumbnailUrl(scene.thumbnail) : null;

  return (
    <div className="panel rounded-lg overflow-hidden group">
      <div className="flex items-center gap-3 p-2">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-20 h-12 bg-film-dark rounded overflow-hidden">
          {thumbUrl ? (
            <img src={thumbUrl} alt={scene.original_filename} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              <Camera size={18} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={scene.original_filename}>
            {scene.original_filename}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <span className="flex items-center gap-1"><Clock size={10} /> {formatDuration(scene.duration)}</span>
            {scene.width && <span>{scene.width}×{scene.height}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddToTimeline(scene)}
            title="Add to timeline"
            className={`p-1.5 rounded transition-colors ${
              isInTimeline
                ? 'text-film-green bg-film-green/10'
                : 'text-gray-500 hover:text-film-accent hover:bg-film-accent/10'
            }`}
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => onDelete(scene.id)}
            className="text-gray-500 hover:text-film-red p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
