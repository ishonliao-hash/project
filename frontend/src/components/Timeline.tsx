import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, ChevronDown, Clock, Scissors } from 'lucide-react';
import type { EditDecision, EditPlan, Scene } from '../types';
import { getThumbnailUrl } from '../api/client';

interface Props {
  plan: EditPlan | undefined;
  scenes: Scene[];
  onPlanUpdate: (decisions: EditDecision[]) => void;
}

const TRANSITIONS = ['cut', 'dissolve', 'fade_in', 'fade_out', 'wipe'] as const;
const TRANSITION_LABELS: Record<string, string> = {
  cut: 'Cut', dissolve: 'Dissolve', fade_in: 'Fade In', fade_out: 'Fade Out', wipe: 'Wipe',
};
const TRANSITION_COLORS: Record<string, string> = {
  cut: 'bg-gray-600', dissolve: 'bg-film-blue', fade_in: 'bg-purple-500',
  fade_out: 'bg-purple-600', wipe: 'bg-film-accent',
};

function fmt(s: number) {
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

function ClipCard({
  decision, scene, onRemove, onUpdate
}: {
  decision: EditDecision;
  scene?: Scene;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<EditDecision>) => void;
}) {
  const [open, setOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: decision.id });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const thumbUrl = scene?.thumbnail ? getThumbnailUrl(scene.thumbnail) : null;
  const maxDur = scene?.duration ?? 999;
  const clipDur = decision.out_point > 0 ? decision.out_point - decision.in_point : (scene?.duration ?? 0);

  return (
    <div ref={setNodeRef} style={style} className="flex-shrink-0 w-40">
      {/* Transition badge between clips */}
      {decision.order > 1 && (
        <div className="flex justify-center mb-1.5">
          <select
            className={`text-xs text-white border-0 rounded-full px-2 py-0.5 cursor-pointer ${TRANSITION_COLORS[decision.transition_type]}`}
            value={decision.transition_type}
            onChange={e => onUpdate(decision.id, { transition_type: e.target.value as EditDecision['transition_type'] })}
            title="Change transition"
          >
            {TRANSITIONS.map(t => <option key={t} value={t}>{TRANSITION_LABELS[t]}</option>)}
          </select>
        </div>
      )}

      <div className={`bg-film-panel border rounded-xl overflow-hidden transition-all ${
        isDragging ? 'border-film-accent shadow-xl' : 'border-film-border hover:border-gray-500'
      }`}>
        {/* Thumbnail */}
        <div className="relative">
          <div className="w-full h-24 bg-film-dark">
            {thumbUrl
              ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-film-border to-film-dark" />
            }
          </div>
          {/* Overlay controls */}
          <div className="absolute top-1.5 left-1.5 cursor-grab bg-black/50 rounded p-0.5" {...attributes} {...listeners}>
            <GripVertical size={11} className="text-white" />
          </div>
          <div className="absolute top-1.5 right-1.5 flex gap-1">
            <button onClick={() => setOpen(!open)} className="bg-black/50 hover:bg-black/80 rounded p-0.5">
              <ChevronDown size={11} className={`text-white transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <button onClick={() => onRemove(decision.id)} className="bg-black/50 hover:bg-film-red/80 rounded p-0.5">
              <X size={11} className="text-white" />
            </button>
          </div>
          {/* Clip number badge */}
          <div className="absolute bottom-1.5 left-1.5 bg-black/60 rounded px-1.5 py-0.5 text-xs text-white font-mono">
            #{decision.order}
          </div>
        </div>

        {/* Info */}
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium truncate text-white" title={scene?.original_filename}>
            {scene?.original_filename ?? decision.scene_filename}
          </p>
          <div className="flex items-center gap-1 text-gray-500 mt-0.5">
            <Clock size={9} />
            <span className="text-xs">{fmt(clipDur)}</span>
            {(decision.in_point > 0 || decision.out_point > 0) && (
              <span className="text-xs text-film-accent">trimmed</span>
            )}
          </div>
        </div>

        {/* Trim controls */}
        {open && (
          <div className="border-t border-film-border p-2 space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                In point: {fmt(decision.in_point)}
              </label>
              <input
                type="range" min={0} max={maxDur} step={0.1}
                value={decision.in_point}
                onChange={e => onUpdate(decision.id, { in_point: parseFloat(e.target.value) })}
                className="w-full accent-film-accent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Out point: {decision.out_point > 0 ? fmt(decision.out_point) : `end (${fmt(maxDur)})`}
              </label>
              <input
                type="range" min={0} max={maxDur} step={0.1}
                value={decision.out_point || maxDur}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  onUpdate(decision.id, { out_point: v >= maxDur ? 0 : v });
                }}
                className="w-full accent-film-accent"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Timeline({ plan, scenes, onPlanUpdate }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const decisions = plan?.decisions ?? [];
  const sceneMap = Object.fromEntries(scenes.map(s => [s.id, s]));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = decisions.findIndex(d => d.id === active.id);
    const newIdx = decisions.findIndex(d => d.id === over.id);
    onPlanUpdate(arrayMove(decisions, oldIdx, newIdx).map((d, i) => ({ ...d, order: i + 1 })));
  };

  const handleRemove = (id: string) => {
    onPlanUpdate(decisions.filter(d => d.id !== id).map((d, i) => ({ ...d, order: i + 1 })));
  };

  const handleUpdate = (id: string, patch: Partial<EditDecision>) => {
    onPlanUpdate(decisions.map(d => d.id === id ? { ...d, ...patch } : d));
  };

  const totalDur = decisions.reduce((acc, d) => {
    const scene = sceneMap[d.scene_id];
    return acc + (d.out_point > 0 ? d.out_point - d.in_point : (scene?.duration ?? 0));
  }, 0);

  return (
    <div className="panel p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors size={15} className="text-film-accent" />
          <h3 className="font-semibold text-sm">Timeline</h3>
        </div>
        {decisions.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{decisions.length} clip{decisions.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Clock size={11} /> {fmt(totalDur)}</span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {decisions.length === 0 && (
        <div className="border-2 border-dashed border-film-border rounded-xl p-10 text-center">
          <Scissors size={28} className="text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-medium">Timeline is empty</p>
          <p className="text-xs text-gray-600 mt-1">Click <strong className="text-gray-400">+</strong> on any scene in the library to add it here</p>
        </div>
      )}

      {/* Clips */}
      {decisions.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={decisions.map(d => d.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-3 min-w-max py-1">
                {decisions.map(d => (
                  <ClipCard
                    key={d.id}
                    decision={d}
                    scene={sceneMap[d.scene_id]}
                    onRemove={handleRemove}
                    onUpdate={handleUpdate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Duration bar */}
      {decisions.length > 0 && (
        <div className="border-t border-film-border pt-2 space-y-1">
          <div className="flex gap-1">
            {decisions.map(d => {
              const scene = sceneMap[d.scene_id];
              const dur = d.out_point > 0 ? d.out_point - d.in_point : (scene?.duration ?? 1);
              const pct = totalDur > 0 ? (dur / totalDur) * 100 : 0;
              return (
                <div
                  key={d.id}
                  className="h-2 rounded-full bg-film-accent/40 hover:bg-film-accent/70 transition-colors flex-shrink-0 min-w-1 cursor-default"
                  style={{ width: `${Math.max(pct, 0.5)}%` }}
                  title={`${scene?.original_filename}: ${fmt(dur)}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>0:00</span>
            <span>{fmt(totalDur)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
