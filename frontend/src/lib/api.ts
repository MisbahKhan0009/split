export type ApiError = { success: false; error: { code: string; message: string; fields?: Record<string, string> } };
type BackendValidationError = Record<string, string[] | string> & { detail?: string; error?: { message?: string } };

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
const ACCESS_TOKEN_KEY = "splitwise_plus_access_token";
const REFRESH_TOKEN_KEY = "splitwise_plus_refresh_token";

export type AuthUser = { id: number; username: string; first_name: string; last_name: string; email: string; display_name: string };
export type AuthResponse = { access: string; refresh: string; user: AuthUser };
export type GroupSummary = { group: string; currency: { code: "BDT"; symbol: "৳" }; total_spend: string; expense_count: number; member_count: number; category_totals: { category: string; total: string }[] };
export type SettlementPlan = { currency: { code: "BDT"; symbol: "৳" }; transfers: { from_user: number; to_user: number; from_name: string; to_name: string; amount: string }[] };
export type Budget = { id: number; group: number; name: string; category: string; amount: string; spent: string; percent: number; currency: { code: "BDT"; symbol: "৳" }; period: string; starts_on: string; is_active: boolean };
export type RecurringExpense = { id: number; group: number; title: string; category: string; amount: string; payer: number; payer_name: string; frequency: string; next_run: string; split_mode: string; is_active: boolean; last_created_expense: number | null };
export type ActivityEvent = { id: number; group: number; actor: number; actor_name: string; actor_initials: string; action: string; target: string; metadata: Record<string, unknown>; created_at: string };
export type NotificationItem = { id: number; group: number | null; kind: string; title: string; body: string; target_url: string; is_read: boolean; created_at: string };
export type Poll = { id: number; group: number; creator: number; creator_name: string; question: string; options: { id: number; label: string; votes: number }[]; total_votes: number; closes_at: string | null; is_closed: boolean; created_at: string };
export type GroupEvent = { id: number; group: number; creator: number; creator_name: string; title: string; description: string; starts_at: string; location: string; budget: string; checklist: string[]; attendees: number[]; attendee_count: number; created_at: string };
export type DirectoryUser = { id: number; username: string; first_name: string; last_name: string; display_name: string; initials: string };
export type GroupInvitation = { id: number; group: number; group_name: string; inviter: number; inviter_name: string; invitee: number; invitee_name: string; invitee_username: string; token: string; invite_url: string; status: "pending" | "accepted" | "declined" | "revoked"; accepted_at: string | null; created_at: string };
export type UserDashboard = { user: AuthUser; currency: { code: "BDT"; symbol: "৳" }; group_count: number; expense_count: number; total_spend: string; paid_total: string; owed_total: string; pending_to_pay: string; pending_to_receive: string; unread_notifications: number; pending_invitations: number; groups: { id: number; name: string; emoji: string; member_count: number; total_spend: string }[] };

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
    const payload = (await response.json().catch(() => null)) as (ApiError | BackendValidationError | null);
    const structuredMessage = (payload as ApiError | null)?.error?.message;
    const detailMessage = typeof (payload as BackendValidationError | null)?.detail === "string" ? (payload as BackendValidationError).detail : undefined;
    const fieldMessage = payload && typeof payload === "object"
      ? Object.entries(payload as BackendValidationError).filter(([key]) => key !== "detail" && key !== "error").flatMap(([key, value]) => {
          const messages = Array.isArray(value) ? value : [value];
          return messages.filter((message): message is string => typeof message === "string").map((message) => `${key === "non_field_errors" ? "" : `${key.split("_").join(" ")}: `}${message}`);
        }).join(" ")
      : "";
    throw new Error((structuredMessage ?? detailMessage ?? fieldMessage) || (response.status === 401 ? "Your session has expired. Please sign in again." : `Request failed (${response.status}). Please check the form details.`));
  }
  return response.json() as Promise<T>;
}

export const api = {
  signup: (payload: { username: string; password: string; password_confirm: string; first_name: string; last_name: string; email?: string }) => request<AuthResponse>("/auth/register/", { method: "POST", body: JSON.stringify(payload) }),
  signin: (payload: { username: string; password: string }) => request<AuthResponse>("/auth/token/", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request<AuthUser>("/auth/me/"),
  dashboard: () => request<UserDashboard>("/auth/me/dashboard/"),
  groups: () => request<unknown[]>("/groups/"),
  createGroup: (payload: { name: string; slug: string; emoji?: string; description?: string }) => request<unknown>("/groups/", { method: "POST", body: JSON.stringify(payload) }),
  directoryUsers: (search = "") => request<DirectoryUser[]>(`/directory/users/${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  invitations: () => request<GroupInvitation[]>("/invitations/"),
  createInvitation: (payload: { group: number; username: string }) => request<GroupInvitation>("/invitations/", { method: "POST", body: JSON.stringify(payload) }),
  acceptInvitation: (id: string | number) => request<GroupInvitation>(`/invitations/${id}/accept/`, { method: "POST", body: JSON.stringify({}) }),
  acceptInvitationByToken: (token: string) => request<GroupInvitation>(`/invitations/accept_by_token/?token=${encodeURIComponent(token)}`, { method: "POST", body: JSON.stringify({}) }),
  declineInvitation: (id: string | number) => request<GroupInvitation>(`/invitations/${id}/decline/`, { method: "POST", body: JSON.stringify({}) }),
  groupSummary: (groupId: string | number) => request<GroupSummary>(`/groups/${groupId}/summary/`),
  settlementPlan: (groupId: string | number) => request<SettlementPlan>(`/groups/${groupId}/settlement_plan/`),
  expenses: (groupId?: string | number) => request<unknown[]>(`/expenses/${groupId ? `?group=${groupId}` : ""}`),
  createExpense: (payload: unknown) => request<unknown>("/expenses/", { method: "POST", body: JSON.stringify(payload) }),
  commentExpense: (id: string | number, payload: unknown) => request<unknown>(`/expenses/${id}/comment/`, { method: "POST", body: JSON.stringify(payload) }),
  settlements: (groupId?: string | number) => request<unknown[]>(`/settlements/${groupId ? `?group=${groupId}` : ""}`),
  createSettlement: (payload: unknown) => request<unknown>("/settlements/", { method: "POST", body: JSON.stringify(payload) }),
  confirmSettlement: (id: string | number, payload: unknown = {}) => request<unknown>(`/settlements/${id}/confirm/`, { method: "POST", body: JSON.stringify(payload) }),
  budgets: (groupId?: string | number) => request<Budget[]>(`/budgets/${groupId ? `?group=${groupId}` : ""}`),
  createBudget: (payload: unknown) => request<Budget>("/budgets/", { method: "POST", body: JSON.stringify(payload) }),
  recurringExpenses: (groupId?: string | number) => request<RecurringExpense[]>(`/recurring-expenses/${groupId ? `?group=${groupId}` : ""}`),
  createRecurringExpense: (payload: unknown) => request<RecurringExpense>("/recurring-expenses/", { method: "POST", body: JSON.stringify(payload) }),
  generateRecurringExpense: (id: string | number) => request<unknown>(`/recurring-expenses/${id}/generate_now/`, { method: "POST", body: JSON.stringify({}) }),
  activity: (groupId?: string | number) => request<ActivityEvent[]>(`/activity/${groupId ? `?group=${groupId}` : ""}`),
  notifications: () => request<NotificationItem[]>("/notifications/"),
  markNotificationsRead: () => request<{ updated: boolean }>("/notifications/mark_all_read/", { method: "POST", body: JSON.stringify({}) }),
  polls: (groupId?: string | number) => request<Poll[]>(`/polls/${groupId ? `?group=${groupId}` : ""}`),
  createPoll: (payload: unknown) => request<Poll>("/polls/", { method: "POST", body: JSON.stringify(payload) }),
  votePoll: (id: string | number, option: string | number) => request<Poll>(`/polls/${id}/vote/`, { method: "POST", body: JSON.stringify({ option }) }),
  events: (groupId?: string | number) => request<GroupEvent[]>(`/events/${groupId ? `?group=${groupId}` : ""}`),
  createEvent: (payload: unknown) => request<GroupEvent>("/events/", { method: "POST", body: JSON.stringify(payload) }),
  rsvpEvent: (id: string | number) => request<GroupEvent>(`/events/${id}/rsvp/`, { method: "POST", body: JSON.stringify({}) }),
  profile: () => request<unknown>("/profiles/me/"),
  updateProfile: (payload: FormData | unknown) => request<unknown>("/profiles/me/", { method: "PATCH", body: payload instanceof FormData ? payload : JSON.stringify(payload) }),
  groupMessages: (groupId: string | number) => request<unknown[]>(`/messages/?group=${groupId}`),
  directMessages: (userId: string | number) => request<unknown[]>(`/messages/?recipient=${userId}`),
  sendMessage: (payload: unknown) => request<unknown>("/messages/", { method: "POST", body: JSON.stringify(payload) }),
  reactMessage: (id: string | number, emoji: string) => request<unknown>(`/messages/${id}/react/`, { method: "POST", body: JSON.stringify({ emoji }) }),
  markMessageRead: (id: string | number) => request<unknown>(`/messages/${id}/mark_read/`, { method: "POST", body: JSON.stringify({}) }),
};

export function connectToGroupChat(groupId: string | number, onMessage: (message: unknown) => void): WebSocket {
  const base = import.meta.env.VITE_WS_BASE_URL ?? window.location.origin.replace(/^http/, "ws");
  const socket = new WebSocket(`${base}/ws/groups/${groupId}/chat/`);
  socket.addEventListener("message", (event) => onMessage(JSON.parse(event.data)));
  return socket;
}

export function connectToDirectChat(userId: string | number, onMessage: (message: unknown) => void): WebSocket {
  const base = import.meta.env.VITE_WS_BASE_URL ?? window.location.origin.replace(/^http/, "ws");
  const socket = new WebSocket(`${base}/ws/users/${userId}/chat/`);
  socket.addEventListener("message", (event) => onMessage(JSON.parse(event.data)));
  return socket;
}
