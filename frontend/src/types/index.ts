export interface SceneMetadata {
  shot_type?: string;
  location?: string;
  notes?: string;
  tags: string[];
}

export interface Scene {
  id: string;
  project_id: string;
  filename: string;
  original_filename: string;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  thumbnail?: string;
  metadata: SceneMetadata;
  created_at: string;
}

export interface EditDecision {
  id: string;
  scene_id: string;
  scene_filename: string;
  order: number;
  in_point: number;
  out_point: number;
  transition_type: 'cut' | 'dissolve' | 'fade_in' | 'fade_out' | 'wipe';
  transition_duration: number;
  ai_notes: string;
}

export interface EditPlan {
  id: string;
  project_id: string;
  decisions: EditDecision[];
  ai_summary: string;
  ai_reasoning: string;
  total_duration: number;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  scenes: Scene[];
  edit_plan?: EditPlan;
  created_at: string;
  updated_at: string;
}

export type TransitionType = 'cut' | 'dissolve' | 'fade_in' | 'fade_out' | 'wipe';

export type ExportStatus = 'idle' | 'processing' | 'complete' | 'error';
