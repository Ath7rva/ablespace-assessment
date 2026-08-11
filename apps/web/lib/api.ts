import type { GuestSession, Task, TaskInput, TaskStatus, Workspace } from './types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const guestKeyStorage = 'pyramid.guest-key';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body?.message.join(', ') : body?.message;
    throw new Error(message || 'The request could not be completed.');
  }
  return response.json() as Promise<T>;
}

export async function guestSession(): Promise<GuestSession> {
  const existingKey = localStorage.getItem(guestKeyStorage);
  const guestKey = existingKey ?? crypto.randomUUID();
  const session = await request<GuestSession>('/auth/guest', {
    method: 'POST',
    body: JSON.stringify({ guestKey })
  });
  localStorage.setItem(guestKeyStorage, session.guestKey);
  return session;
}

export function workspace(token: string) {
  return request<Workspace>('/workspaces/current', {}, token);
}

export function createTask(token: string, input: TaskInput) {
  return request<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) }, token);
}

export function updateTask(token: string, taskId: string, input: Partial<TaskInput>) {
  return request<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(input) }, token);
}

export function moveTask(token: string, taskId: string, status: TaskStatus, sortOrder: number) {
  return request<Task>(`/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status, sortOrder }) }, token);
}

export function deleteTask(token: string, taskId: string) {
  return request<Task>(`/tasks/${taskId}`, { method: 'DELETE' }, token);
}
