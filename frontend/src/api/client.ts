import axios from 'axios';
import type { Project, Scene, EditPlan, EditDecision } from '../types';

const api = axios.create({ baseURL: '/api' });

// Projects
export const listProjects = () => api.get<Project[]>('/projects/').then(r => r.data);
export const createProject = (name: string, description: string) =>
  api.post<Project>('/projects/', { name, description }).then(r => r.data);
export const getProject = (id: string) =>
  api.get<Project>(`/projects/${id}`).then(r => r.data);
export const updateProject = (id: string, data: Partial<{ name: string; description: string }>) =>
  api.patch<Project>(`/projects/${id}`, data).then(r => r.data);
export const deleteProject = (id: string) =>
  api.delete(`/projects/${id}`).then(r => r.data);

// Scenes
export const uploadScene = (
  projectId: string,
  file: File,
  meta: { shot_type?: string; location?: string; notes?: string }
) => {
  const form = new FormData();
  form.append('project_id', projectId);
  form.append('file', file);
  if (meta.shot_type) form.append('shot_type', meta.shot_type);
  if (meta.location) form.append('location', meta.location);
  if (meta.notes) form.append('notes', meta.notes);
  return api.post<Scene>('/scenes/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};

export const deleteScene = (projectId: string, sceneId: string) =>
  api.delete(`/scenes/${projectId}/${sceneId}`).then(r => r.data);

export const getThumbnailUrl = (filename: string) => `/api/scenes/thumbnail/${filename}`;
export const getVideoUrl = (filename: string) => `/api/scenes/video/${filename}`;

// AI Editor
export const generateEditPlan = (projectId: string, description?: string) =>
  api.post<EditPlan>(`/editor/generate/${projectId}`, { project_id: projectId, description }).then(r => r.data);

export const getEditPlan = (projectId: string) =>
  api.get<EditPlan>(`/editor/${projectId}/plan`).then(r => r.data);

export const updateEditPlan = (projectId: string, decisions: EditDecision[]) =>
  api.put<EditPlan>(`/editor/${projectId}/plan`, { decisions }).then(r => r.data);

export const deleteEditPlan = (projectId: string) =>
  api.delete(`/editor/${projectId}/plan`).then(r => r.data);

// Export
export const startExport = (projectId: string, quality: string = 'high') =>
  api.post<{ job_id: string; status: string }>('/export/', { project_id: projectId, quality }).then(r => r.data);

export const getExportStatus = (jobId: string) =>
  api.get<{ job_id: string; status: string; error?: string }>(`/export/status/${jobId}`).then(r => r.data);

export const getExportDownloadUrl = (jobId: string) => `/api/export/download/${jobId}`;
