export type ApiError = { success: false; error: { code: string; message: string; fields?: Record<string, string> } };

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "include",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(payload?.error?.message ?? "We could not complete that request.");
  }
  return response.json() as Promise<T>;
}

export const api = {
  groups: () => request<unknown[]>("/groups/"),
  groupSummary: (groupId: string) => request<{ group: string; currency: { code: "BDT"; symbol: "৳" }; total_spend: string; expense_count: number; member_count: number }>(`/groups/${groupId}/summary/`),
  expenses: () => request<unknown[]>("/expenses/"),
  createExpense: (payload: unknown) => request<unknown>("/expenses/", { method: "POST", body: JSON.stringify(payload) }),
  settlements: () => request<unknown[]>("/settlements/"),
  profile: () => request<unknown>("/profiles/me/"),
  updateProfile: (payload: FormData | unknown) => request<unknown>("/profiles/me/", { method: "PATCH", body: payload instanceof FormData ? payload : JSON.stringify(payload), headers: payload instanceof FormData ? {} : undefined }),
  groupMessages: (groupId: string) => request<unknown[]>(`/messages/?group=${groupId}`),
  directMessages: (userId: string) => request<unknown[]>(`/messages/?recipient=${userId}`),
};

export function connectToGroupChat(groupId: string, onMessage: (message: unknown) => void): WebSocket {
  const base = import.meta.env.VITE_WS_BASE_URL ?? window.location.origin.replace(/^http/, "ws");
  const socket = new WebSocket(`${base}/ws/groups/${groupId}/chat/`);
  socket.addEventListener("message", (event) => onMessage(JSON.parse(event.data)));
  return socket;
}

export function connectToDirectChat(userId: string, onMessage: (message: unknown) => void): WebSocket {
  const base = import.meta.env.VITE_WS_BASE_URL ?? window.location.origin.replace(/^http/, "ws");
  const socket = new WebSocket(`${base}/ws/users/${userId}/chat/`);
  socket.addEventListener("message", (event) => onMessage(JSON.parse(event.data)));
  return socket;
}
