import axios from 'axios';
import type { Project, Scene, EditPlan, EditDecision } from '../types';

const api = axios.create({ baseURL: '/api' });

// Projects
export const listProjects = () => api.get<Project[]>('/projects/').then(r => r.data);
export const createProject = (name: string) =>
  api.post<Project>('/projects/', { name }).then(r => r.data);
export const getProject = (id: string) =>
  api.get<Project>(`/projects/${id}`).then(r => r.data);
export const updateProject = (id: string, data: { name: string }) =>
  api.patch<Project>(`/projects/${id}`, data).then(r => r.data);
export const deleteProject = (id: string) =>
  api.delete(`/projects/${id}`).then(r => r.data);

// Scenes
export const uploadScene = (projectId: string, file: File) => {
  const form = new FormData();
  form.append('project_id', projectId);
  form.append('file', file);
  return api.post<Scene>('/scenes/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};
export const deleteScene = (projectId: string, sceneId: string) =>
  api.delete(`/scenes/${projectId}/${sceneId}`).then(r => r.data);

export const getThumbnailUrl = (filename: string) => `/api/scenes/thumbnail/${filename}`;
export const getVideoUrl = (filename: string) => `/api/scenes/video/${filename}`;

// Edit plan
export const saveEditPlan = (projectId: string, decisions: EditDecision[]) =>
  api.put<EditPlan>(`/editor/${projectId}/plan`, { decisions }).then(r => r.data);

// Export
export const startExport = (projectId: string, quality: string = 'high') =>
  api.post<{ job_id: string; status: string }>('/export/', { project_id: projectId, quality }).then(r => r.data);
export const getExportStatus = (jobId: string) =>
  api.get<{ job_id: string; status: string; error?: string }>(`/export/status/${jobId}`).then(r => r.data);
export const getExportDownloadUrl = (jobId: string) => `/api/export/download/${jobId}`;
