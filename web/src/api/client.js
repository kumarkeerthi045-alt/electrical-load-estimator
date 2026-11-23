/**
 * Thin fetch wrapper around the Voltwise API.
 * In dev, Vite proxies /api to the Express server (see vite.config.js).
 */
const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(raw ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.details = data?.details;
    throw error;
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  reference: () => request('/reference'),

  listProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (project) => request('/projects', { method: 'POST', body: project }),
  updateProject: (id, patch) => request(`/projects/${id}`, { method: 'PUT', body: patch }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  estimateProject: (id, payload) => request(`/projects/${id}/estimate`, { method: 'POST', body: payload }),

  importCsv: (csv) => request('/import/csv', { method: 'POST', body: csv, raw: true, headers: { 'content-type': 'text/csv' } }),
};
