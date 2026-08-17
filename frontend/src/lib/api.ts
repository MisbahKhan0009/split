export type ApiError = { success: false; error: { code: string; message: string; fields?: Record<string, string> } };

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
const ACCESS_TOKEN_KEY = "splitwise_plus_access_token";
const REFRESH_TOKEN_KEY = "splitwise_plus_refresh_token";

export type AuthUser = { id: number; username: string; first_name: string; last_name: string; email: string; display_name: string };
export type AuthResponse = { access: string; refresh: string; user: AuthUser };

export function getAccessToken() { return window.localStorage.getItem(ACCESS_TOKEN_KEY); }
export function clearSession() { window.localStorage.removeItem(ACCESS_TOKEN_KEY); window.localStorage.removeItem(REFRESH_TOKEN_KEY); }
export function saveSession(payload: AuthResponse) { window.localStorage.setItem(ACCESS_TOKEN_KEY, payload.access); window.localStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh); }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(payload?.error?.message ?? (response.status === 401 ? "Your session has expired. Please sign in again." : "We could not complete that request."));
  }
  return response.json() as Promise<T>;
}

export const api = {
  signup: (payload: { username: string; password: string; password_confirm: string; first_name: string; last_name: string; email?: string }) => request<AuthResponse>("/auth/register/", { method: "POST", body: JSON.stringify(payload) }),
  signin: (payload: { username: string; password: string }) => request<AuthResponse>("/auth/token/", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request<AuthUser>("/auth/me/"),
  groups: () => request<unknown[]>("/groups/"),
  groupSummary: (groupId: string) => request<{ group: string; currency: { code: "BDT"; symbol: "৳" }; total_spend: string; expense_count: number; member_count: number }>(`/groups/${groupId}/summary/`),
  expenses: () => request<unknown[]>("/expenses/"),
  createExpense: (payload: unknown) => request<unknown>("/expenses/", { method: "POST", body: JSON.stringify(payload) }),
  settlements: () => request<unknown[]>("/settlements/"),
  profile: () => request<unknown>("/profiles/me/"),
  updateProfile: (payload: FormData | unknown) => request<unknown>("/profiles/me/", { method: "PATCH", body: payload instanceof FormData ? payload : JSON.stringify(payload) }),
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
