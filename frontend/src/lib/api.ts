import type { Agent, ApproveResult, AuditEventDTO, AuthResponse, CreateAgentInput, DashboardData } from '@amp/shared';

// Vite proxies /api to the Express backend (see vite.config.ts).
const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin', // send the session cookie
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  ssoLogin: () => request<AuthResponse>('/auth/sso', { method: 'POST' }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => request<AuthResponse>('/auth/me'),

  // Dashboard
  getDashboard: () => request<DashboardData>('/dashboard'),

  // Agents
  listAgents: (status?: string) =>
    request<Agent[]>(`/agents${status ? `?status=${status}` : ''}`),
  getAgent: (id: string) => request<Agent>(`/agents/${id}`),
  getAudit: (id: string) => request<AuditEventDTO[]>(`/agents/${id}/audit`),
  createAgent: (input: CreateAgentInput) =>
    request<Agent>('/agents', { method: 'POST', body: JSON.stringify(input) }),
  verifyDocument: (id: string, key: string) =>
    request<Agent>(`/agents/${id}/documents/${key}/verify`, { method: 'POST' }),
  uploadDocument: (id: string, key: string, fileName: string) =>
    request<Agent>(`/agents/${id}/documents/${key}/upload`, {
      method: 'POST',
      body: JSON.stringify({ fileName }),
    }),
  // Real file upload (multipart — do NOT set Content-Type; the browser adds the boundary).
  uploadDocumentFile: async (id: string, key: string, file: File): Promise<Agent> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/agents/${id}/documents/${key}/file`, {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Upload failed: ${res.status}`);
    }
    return res.json() as Promise<Agent>;
  },
  documentFileUrl: (id: string, key: string) => `/api/agents/${id}/documents/${key}/file`,
  removeDocumentFile: (id: string, key: string) =>
    request<Agent>(`/agents/${id}/documents/${key}/file`, { method: 'DELETE' }),
  updateAgent: (id: string, data: { onshore?: boolean; stage?: number }) =>
    request<Agent>(`/agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Review pipeline — stage navigation
  advanceStage: (id: string) => request<Agent>(`/agents/${id}/advance`, { method: 'POST' }),
  backStage: (id: string) => request<Agent>(`/agents/${id}/back`, { method: 'POST' }),

  // Stage 3 — acknowledgement loop + references
  sendAck: (id: string) => request<Agent>(`/agents/${id}/ack/send`, { method: 'POST' }),
  markAckReplied: (id: string) => request<Agent>(`/agents/${id}/ack/reply`, { method: 'POST' }),
  approveReference: (id: string, refId: string) =>
    request<Agent>(`/agents/${id}/references/${refId}/approve`, { method: 'POST' }),

  // Decisions
  requestInfo: (id: string, message?: string) =>
    request<Agent>(`/agents/${id}/request-info`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  reject: (id: string, message?: string) =>
    request<Agent>(`/agents/${id}/reject`, { method: 'POST', body: JSON.stringify({ message }) }),
  approve: (id: string) => request<Agent>(`/agents/${id}/approve`, { method: 'POST' }),

  // Activation (post-approval)
  markAgreementSigned: (id: string) => request<Agent>(`/agents/${id}/agreement/sign`, { method: 'POST' }),
  provisionAccount: (id: string) => request<ApproveResult>(`/agents/${id}/provision`, { method: 'POST' }),
};
