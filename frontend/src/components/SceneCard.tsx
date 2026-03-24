import { useState } from 'react';
import { Trash2, Clock, Camera, MapPin, FileText, ChevronDown } from 'lucide-react';
import type { Scene } from '../types';
import { getThumbnailUrl } from '../api/client';

interface Props {
  scene: Scene;
  onDelete: (id: string) => void;
  isInPlan?: boolean;
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SceneCard({ scene, onDelete, isInPlan }: Props) {
  const [expanded, setExpanded] = useState(false);
  const thumbUrl = scene.thumbnail ? getThumbnailUrl(scene.thumbnail) : null;

  return (
    <div className={`panel rounded-lg overflow-hidden group transition-all ${
      isInPlan ? 'border-film-green/30 ring-1 ring-film-green/20' : ''
    }`}>
      {/* Thumbnail row */}
      <div className="flex items-center gap-3 p-2">
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
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
            <span className="flex items-center gap-1">
              <Clock size={10} /> {formatDuration(scene.duration)}
            </span>
            {scene.width && (
              <span>{scene.width}x{scene.height}</span>
            )}
            {isInPlan && (
              <span className="badge bg-film-green/20 text-film-green">In Plan</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-white p-1 rounded"
          >
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => onDelete(scene.id)}
            className="text-gray-500 hover:text-film-red p-1 rounded"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded metadata */}
      {expanded && (
        <div className="border-t border-film-border px-3 py-2 space-y-1.5 text-xs text-gray-400">
          {scene.metadata.shot_type && (
            <div className="flex items-center gap-2">
              <Camera size={11} /> {scene.metadata.shot_type}
            </div>
          )}
          {scene.metadata.location && (
            <div className="flex items-center gap-2">
              <MapPin size={11} /> {scene.metadata.location}
            </div>
          )}
          {scene.metadata.notes && (
            <div className="flex items-start gap-2">
              <FileText size={11} className="mt-0.5 flex-shrink-0" />
              <span>{scene.metadata.notes}</span>
            </div>
          )}
          {scene.fps && (
            <div className="text-gray-500">{scene.fps} fps</div>
          )}
        </div>
      )}
    </div>
  );
}
