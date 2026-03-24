import { useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, ChevronDown, Clock, ArrowLeftRight } from 'lucide-react';
import type { EditDecision, EditPlan, Scene } from '../types';
import { getThumbnailUrl } from '../api/client';

interface Props {
  plan: EditPlan;
  scenes: Scene[];
  onPlanUpdate: (decisions: EditDecision[]) => void;
}

const TRANSITION_COLORS: Record<string, string> = {
  cut: 'bg-gray-600',
  dissolve: 'bg-film-blue',
  fade_in: 'bg-purple-500',
  fade_out: 'bg-purple-600',
  wipe: 'bg-film-accent',
};

const TRANSITION_LABELS: Record<string, string> = {
  cut: 'Cut',
  dissolve: 'Dissolve',
  fade_in: 'Fade In',
  fade_out: 'Fade Out',
  wipe: 'Wipe',
};

function formatDur(s: number) {
  if (s === 0) return 'full';
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

function SortableClip({
  decision, scene, onRemove, onUpdateTransition, onUpdateTrim
}: {
  decision: EditDecision;
  scene?: Scene;
  onRemove: (id: string) => void;
  onUpdateTransition: (id: string, type: string) => void;
  onUpdateTrim: (id: string, field: 'in_point' | 'out_point', value: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: decision.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const thumbUrl = scene?.thumbnail ? getThumbnailUrl(scene.thumbnail) : null;
  const clipDuration = decision.out_point > 0
    ? decision.out_point - decision.in_point
    : (scene?.duration ?? 0);

  return (
    <div ref={setNodeRef} style={style} className="flex-shrink-0 w-36">
      {/* Transition badge */}
      {decision.order > 1 && (
        <div className="flex justify-center mb-1">
          <span className={`badge text-white ${TRANSITION_COLORS[decision.transition_type] ?? 'bg-gray-600'}`}>
            {TRANSITION_LABELS[decision.transition_type] ?? decision.transition_type}
          </span>
        </div>
      )}

      <div className={`bg-film-panel border rounded-lg overflow-hidden ${
        isDragging ? 'border-film-accent shadow-lg shadow-film-accent/20' : 'border-film-border'
      }`}>
        {/* Clip thumbnail */}
        <div className="relative">
          <div className="w-full h-20 bg-film-dark">
            {thumbUrl ? (
              <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-film-border to-film-dark" />
            )}
          </div>
          <div className="absolute top-1 right-1 flex gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="bg-black/60 hover:bg-black/80 rounded p-0.5 transition-colors"
            >
              <ChevronDown size={10} className={`text-white transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => onRemove(decision.id)}
              className="bg-black/60 hover:bg-film-red/80 rounded p-0.5 transition-colors"
            >
              <X size={10} className="text-white" />
            </button>
          </div>
          <div
            className="absolute top-1 left-1 bg-black/60 rounded p-0.5 cursor-grab"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={10} className="text-white" />
          </div>
        </div>

        {/* Clip info */}
        <div className="p-1.5">
          <p className="text-xs font-medium truncate text-white" title={scene?.original_filename}>
            {scene?.original_filename ?? decision.scene_filename}
          </p>
          <div className="flex items-center gap-1 text-gray-500 mt-0.5">
            <Clock size={9} />
            <span className="text-xs">{formatDur(clipDuration)}</span>
            <span className="text-xs">#{decision.order}</span>
          </div>
        </div>

        {/* Expanded controls */}
        {expanded && (
          <div className="border-t border-film-border p-1.5 space-y-1.5">
            {/* Transition type */}
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                <ArrowLeftRight size={9} /> Transition
              </label>
              <select
                className="w-full bg-film-dark border border-film-border rounded text-xs text-white p-1"
                value={decision.transition_type}
                onChange={e => onUpdateTransition(decision.id, e.target.value)}
              >
                {Object.entries(TRANSITION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            {/* Trim controls */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">In (sec)</label>
              <input
                type="number"
                className="input text-xs p-1"
                min={0}
                max={scene?.duration ?? 999}
                step={0.1}
                value={decision.in_point}
                onChange={e => onUpdateTrim(decision.id, 'in_point', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Out (sec, 0=full)</label>
              <input
                type="number"
                className="input text-xs p-1"
                min={0}
                max={scene?.duration ?? 999}
                step={0.1}
                value={decision.out_point}
                onChange={e => onUpdateTrim(decision.id, 'out_point', parseFloat(e.target.value) || 0)}
              />
            </div>
            {/* AI notes */}
            {decision.ai_notes && (
              <p className="text-xs text-gray-500 italic leading-tight">{decision.ai_notes}</p>
            )}
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

  const sceneMap = Object.fromEntries(scenes.map(s => [s.id, s]));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = plan.decisions.findIndex(d => d.id === active.id);
    const newIndex = plan.decisions.findIndex(d => d.id === over.id);
    const newDecisions = arrayMove(plan.decisions, oldIndex, newIndex).map(
      (d, i) => ({ ...d, order: i + 1 })
    );
    onPlanUpdate(newDecisions);
  };

  const handleRemove = (id: string) => {
    const updated = plan.decisions
      .filter(d => d.id !== id)
      .map((d, i) => ({ ...d, order: i + 1 }));
    onPlanUpdate(updated);
  };

  const handleUpdateTransition = (id: string, type: string) => {
    const updated = plan.decisions.map(d =>
      d.id === id ? { ...d, transition_type: type as EditDecision['transition_type'] } : d
    );
    onPlanUpdate(updated);
  };

  const handleUpdateTrim = (id: string, field: 'in_point' | 'out_point', value: number) => {
    const updated = plan.decisions.map(d =>
      d.id === id ? { ...d, [field]: value } : d
    );
    onPlanUpdate(updated);
  };

  if (!plan.decisions.length) {
    return (
      <div className="panel p-8 text-center text-gray-500">
        <p className="text-sm">No edit decisions yet. Generate an edit plan above.</p>
      </div>
    );
  }

  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Timeline</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock size={12} />
          <span>Total: {formatDur(plan.total_duration)}</span>
          <span>·</span>
          <span>{plan.decisions.length} clips</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={plan.decisions.map(d => d.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-2 min-w-max">
              {plan.decisions.map(decision => (
                <SortableClip
                  key={decision.id}
                  decision={decision}
                  scene={sceneMap[decision.scene_id]}
                  onRemove={handleRemove}
                  onUpdateTransition={handleUpdateTransition}
                  onUpdateTrim={handleUpdateTrim}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Timeline ruler */}
      <div className="border-t border-film-border pt-2">
        <div className="flex gap-1 overflow-x-auto">
          {plan.decisions.map(d => {
            const scene = sceneMap[d.scene_id];
            const dur = d.out_point > 0 ? d.out_point - d.in_point : (scene?.duration ?? 1);
            const totalDur = plan.total_duration || 1;
            const widthPct = (dur / totalDur) * 100;
            return (
              <div
                key={d.id}
                className="h-2 rounded-full bg-film-accent/50 flex-shrink-0 min-w-1"
                style={{ width: `${Math.max(widthPct, 1)}%` }}
                title={`${scene?.original_filename}: ${formatDur(dur)}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0:00</span>
          <span>{formatDur(plan.total_duration)}</span>
        </div>
      </div>
    </div>
  );
}
