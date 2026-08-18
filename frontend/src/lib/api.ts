export type ApiError = {
  success: false;
  error: { code: string; message: string; fields?: Record<string, string> };
};
type BackendValidationError = Record<string, string[] | string> & {
  detail?: string;
  error?: { message?: string };
};

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
const ACCESS_TOKEN_KEY = "splitwise_plus_access_token";
const REFRESH_TOKEN_KEY = "splitwise_plus_refresh_token";

export type AuthUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  display_name: string;
};
export type AuthResponse = { access: string; refresh: string; user: AuthUser };
export type AccountActivityItem = {
  id: number;
  action: string;
  description: string;
  device_label: string;
  ip_address: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};
export type AccountSession = {
  id: string;
  device_label: string;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
  last_seen_at: string;
  is_current: boolean;
};
export type ProfileDTO = {
  name: string;
  initials: string;
  avatar: string | null;
  bio: string;
  status: string;
  theme: string;
  updated_at: string;
};
export type GroupMemberDTO = {
  user_id: number;
  name: string;
  initials: string;
  role: string;
  profile: ProfileDTO;
};
export type GroupDTO = {
  id: number;
  name: string;
  emoji: string;
  member_count: number;
  members_detail: GroupMemberDTO[];
};
export type MessageAttachmentDTO = {
  id: string;
  kind: "image" | "video" | "file" | "gif";
  name: string;
  url: string;
  size?: number | string;
  content_type?: string;
  thumbnail?: string;
};
export type MessageReactionDTO = {
  emoji: string;
  count: number;
  reacted: boolean;
  user_ids?: number[];
  legacy_count?: number;
};
export type MessageDTO = {
  id: number;
  group: number | null;
  author: number;
  author_name: string;
  author_initials: string;
  recipient: number | null;
  recipient_name: string | null;
  kind: "group" | "direct";
  body: string;
  attachments: MessageAttachmentDTO[];
  reactions: MessageReactionDTO[];
  reply_to: number | null;
  reply_preview: { id: number; author_name: string; body: string } | null;
  read_at: string | null;
  created_at: string;
};
export type ProfileUpdate =
  Partial<Pick<ProfileDTO, "bio" | "status" | "theme">> | FormData;
export type ChatEvent = {
  event: "connected" | "message" | "typing" | "reaction" | "read" | "error";
  message?: MessageDTO;
  user?: { id: number; name: string; initials: string; avatar?: string | null };
  is_typing?: boolean;
  user_id?: number;
  errors?: unknown;
};
export type GroupSummary = {
  group: string;
  currency: { code: "BDT"; symbol: "৳" };
  total_spend: string;
  expense_count: number;
  member_count: number;
  category_totals: { category: string; total: string }[];
};
export type SettlementPlan = {
  currency: { code: "BDT"; symbol: "৳" };
  transfers: {
    from_user: number;
    to_user: number;
    from_name: string;
    to_name: string;
    amount: string;
  }[];
};
export type SettlementDTO = {
  id: number;
  group: number;
  from_user: number;
  from_name: string;
  to_user: number;
  to_name: string;
  amount: string;
  currency: { code: "BDT"; symbol: "৳" };
  status: "requested" | "confirmed" | "declined";
  note: string;
  payment_method: string;
  payment_reference: string;
  proof: string | null;
  paid_at: string | null;
  created_at: string;
};
export type Budget = {
  id: number;
  group: number;
  name: string;
  category: string;
  amount: string;
  spent: string;
  percent: number;
  currency: { code: "BDT"; symbol: "৳" };
  period: string;
  starts_on: string;
  is_active: boolean;
};
export type RecurringExpense = {
  id: number;
  group: number;
  title: string;
  category: string;
  amount: string;
  payer: number;
  payer_name: string;
  frequency: string;
  next_run: string;
  split_mode: string;
  is_active: boolean;
  last_created_expense: number | null;
};
export type ExpenseDTO = {
  id: number;
  group: number;
  title: string;
  category: string;
  amount: string;
  currency: { code: "BDT"; symbol: "৳" };
  payer: number;
  payer_name: string;
  note: string;
  occurred_on: string;
  split_mode: string;
  status: string;
  receipt: string | null;
  created_at: string;
};
export type ActivityEvent = {
  id: number;
  group: number;
  actor: number;
  actor_name: string;
  actor_initials: string;
  action: string;
  target: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
export type NotificationItem = {
  id: number;
  group: number | null;
  kind: string;
  title: string;
  body: string;
  target_url: string;
  is_read: boolean;
  created_at: string;
};
export type Poll = {
  id: number;
  group: number;
  creator: number;
  creator_name: string;
  question: string;
  options: { id: number; label: string; votes: number }[];
  total_votes: number;
  closes_at: string | null;
  is_closed: boolean;
  created_at: string;
};
export type GroupEvent = {
  id: number;
  group: number;
  creator: number;
  creator_name: string;
  title: string;
  description: string;
  starts_at: string;
  location: string;
  budget: string;
  checklist: string[];
  attendees: number[];
  attendee_count: number;
  created_at: string;
};
export type DirectoryUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  display_name: string;
  initials: string;
  avatar: string | null;
};
export type GroupInvitation = {
  id: number;
  group: number;
  group_name: string;
  inviter: number;
  inviter_name: string;
  invitee: number;
  invitee_name: string;
  invitee_username: string;
  token: string;
  invite_url: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  accepted_at: string | null;
  created_at: string;
};
export type UserDashboard = {
  user: AuthUser;
  currency: { code: "BDT"; symbol: "৳" };
  group_count: number;
  expense_count: number;
  total_spend: string;
  paid_total: string;
  owed_total: string;
  pending_to_pay: string;
  pending_to_receive: string;
  unread_notifications: number;
  pending_invitations: number;
  groups: {
    id: number;
    name: string;
    emoji: string;
    member_count: number;
    total_spend: string;
  }[];
};

export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}
export function clearSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
export function saveSession(payload: AuthResponse) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, payload.access);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh);
}
export function getRefreshToken() {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Exchange the stored refresh token for a fresh access token. Concurrent
 * callers share one request so a burst of 401s triggers a single refresh.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refresh = getRefreshToken();
  if (!refresh) return null;
  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ refresh }),
      });
      if (!response.ok) {
        clearSession();
        return null;
      }
      const payload = (await response.json()) as {
        access?: string;
        refresh?: string;
      };
      if (!payload.access) {
        clearSession();
        return null;
      }
      window.localStorage.setItem(ACCESS_TOKEN_KEY, payload.access);
      // ROTATE_REFRESH_TOKENS returns a replacement refresh token.
      if (payload.refresh)
        window.localStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh);
      return payload.access;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function send(path: string, init?: RequestInit, token?: string | null) {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response = await send(path, init, getAccessToken());
  if (response.status === 401 && !path.startsWith("/auth/token")) {
    const renewed = await refreshAccessToken();
    if (renewed) response = await send(path, init, renewed);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      ApiError | BackendValidationError | null;
    const structuredMessage = (payload as ApiError | null)?.error?.message;
    const detailMessage =
      typeof (payload as BackendValidationError | null)?.detail === "string"
        ? (payload as BackendValidationError).detail
        : undefined;
    const fieldMessage =
      payload && typeof payload === "object"
        ? Object.entries(payload as BackendValidationError)
            .filter(([key]) => key !== "detail" && key !== "error")
            .flatMap(([key, value]) => {
              const messages = Array.isArray(value) ? value : [value];
              return messages
                .filter(
                  (message): message is string => typeof message === "string",
                )
                .map(
                  (message) =>
                    `${key === "non_field_errors" ? "" : `${key.split("_").join(" ")}: `}${message}`,
                );
            })
            .join(" ")
        : "";
    throw new Error(
      (structuredMessage ?? detailMessage ?? fieldMessage) ||
        (response.status === 401
          ? "Your session has expired. Please sign in again."
          : `Request failed (${response.status}). Please check the form details.`),
    );
  }
  return response.json() as Promise<T>;
}

export const api = {
  signup: (payload: {
    username: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    email?: string;
  }) =>
    request<AuthResponse>("/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  signin: (payload: { username: string; password: string }) =>
    request<AuthResponse>("/auth/token/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request<AuthUser>("/auth/me/"),
  dashboard: () => request<UserDashboard>("/auth/me/dashboard/"),
  groups: () => request<GroupDTO[]>("/groups/"),
  createGroup: (payload: {
    name: string;
    slug: string;
    emoji?: string;
    description?: string;
  }) =>
    request<GroupDTO>("/groups/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  directoryUsers: (search = "") =>
    request<DirectoryUser[]>(
      `/directory/users/${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),
  invitations: () => request<GroupInvitation[]>("/invitations/"),
  createInvitation: (payload: { group: number; username: string }) =>
    request<GroupInvitation>("/invitations/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  acceptInvitation: (id: string | number) =>
    request<GroupInvitation>(`/invitations/${id}/accept/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  acceptInvitationByToken: (token: string) =>
    request<GroupInvitation>(
      `/invitations/accept_by_token/?token=${encodeURIComponent(token)}`,
      { method: "POST", body: JSON.stringify({}) },
    ),
  declineInvitation: (id: string | number) =>
    request<GroupInvitation>(`/invitations/${id}/decline/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  groupSummary: (groupId: string | number) =>
    request<GroupSummary>(`/groups/${groupId}/summary/`),
  settlementPlan: (groupId: string | number) =>
    request<SettlementPlan>(`/groups/${groupId}/settlement_plan/`),
  expenses: (groupId?: string | number) =>
    request<ExpenseDTO[]>(`/expenses/${groupId ? `?group=${groupId}` : ""}`),
  createExpense: (payload: unknown) =>
    request<ExpenseDTO>("/expenses/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  uploadExpenseReceipt: (id: string | number, file: File) => {
    const body = new FormData();
    body.append("receipt", file);
    return request<ExpenseDTO>(`/expenses/${id}/`, { method: "PATCH", body });
  },
  commentExpense: (id: string | number, payload: unknown) =>
    request<unknown>(`/expenses/${id}/comment/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  settlements: (groupId?: string | number) =>
    request<SettlementDTO[]>(
      `/settlements/${groupId ? `?group=${groupId}` : ""}`,
    ),
  createSettlement: (payload: {
    group: number;
    from_user: number;
    to_user: number;
    amount: string;
    note?: string;
  }) =>
    request<SettlementDTO>("/settlements/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  paySettlement: (
    id: string | number,
    payload: { payment_method?: string } = {},
  ) =>
    request<SettlementDTO>(`/settlements/${id}/pay/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  confirmSettlement: (id: string | number, payload: unknown = {}) =>
    request<SettlementDTO>(`/settlements/${id}/confirm/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  budgets: (groupId?: string | number) =>
    request<Budget[]>(`/budgets/${groupId ? `?group=${groupId}` : ""}`),
  createBudget: (payload: unknown) =>
    request<Budget>("/budgets/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  recurringExpenses: (groupId?: string | number) =>
    request<RecurringExpense[]>(
      `/recurring-expenses/${groupId ? `?group=${groupId}` : ""}`,
    ),
  createRecurringExpense: (payload: unknown) =>
    request<RecurringExpense>("/recurring-expenses/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  generateRecurringExpense: (id: string | number) =>
    request<unknown>(`/recurring-expenses/${id}/generate_now/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  activity: (groupId?: string | number) =>
    request<ActivityEvent[]>(`/activity/${groupId ? `?group=${groupId}` : ""}`),
  notifications: () => request<NotificationItem[]>("/notifications/"),
  markNotificationsRead: () =>
    request<{ updated: boolean }>("/notifications/mark_all_read/", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  polls: (groupId?: string | number) =>
    request<Poll[]>(`/polls/${groupId ? `?group=${groupId}` : ""}`),
  createPoll: (payload: unknown) =>
    request<Poll>("/polls/", { method: "POST", body: JSON.stringify(payload) }),
  votePoll: (id: string | number, option: string | number) =>
    request<Poll>(`/polls/${id}/vote/`, {
      method: "POST",
      body: JSON.stringify({ option }),
    }),
  events: (groupId?: string | number) =>
    request<GroupEvent[]>(`/events/${groupId ? `?group=${groupId}` : ""}`),
  createEvent: (payload: unknown) =>
    request<GroupEvent>("/events/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  rsvpEvent: (id: string | number) =>
    request<GroupEvent>(`/events/${id}/rsvp/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  profile: () => request<ProfileDTO>("/profiles/me/"),
  accountActivity: () => request<AccountActivityItem[]>("/account/activity/"),
  accountSessions: () => request<AccountSession[]>("/account/sessions/"),
  revokeCurrentSession: () =>
    request<{ detail: string }>("/account/sessions/current/revoke/", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  revokeSession: (id: string) =>
    request<{ detail: string }>(`/account/sessions/${id}/revoke/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  revokeAllSessions: () =>
    request<{ detail: string; revoked_count: number }>(
      "/account/sessions/revoke-all/",
      { method: "POST", body: JSON.stringify({}) },
    ),
  updateProfile: (payload: ProfileUpdate) =>
    request<ProfileDTO>("/profiles/me/", {
      method: "PATCH",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    }),
  groupMessages: (groupId: string | number) =>
    request<MessageDTO[]>(`/messages/?group=${groupId}`),
  directMessages: (userId: string | number) =>
    request<MessageDTO[]>(`/messages/?recipient=${userId}`),
  sendMessage: (payload: {
    group?: number;
    recipient?: number;
    kind: "group" | "direct";
    body: string;
    attachments?: MessageAttachmentDTO[];
    reply_to?: number;
  }) =>
    request<MessageDTO>("/messages/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  uploadMessageAttachment: (
    file: globalThis.File,
    target: { group?: number; recipient?: number },
  ) => {
    const body = new FormData();
    body.append("file", file);
    if (target.group) body.append("group", String(target.group));
    if (target.recipient) body.append("recipient", String(target.recipient));
    return request<MessageAttachmentDTO>("/messages/upload/", {
      method: "POST",
      body,
    });
  },
  reactMessage: (id: string | number, emoji: string) =>
    request<MessageDTO>(`/messages/${id}/react/`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }),
  markMessageRead: (id: string | number) =>
    request<MessageDTO>(`/messages/${id}/mark_read/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
};

export type ChatConnection = {
  socket: WebSocket;
  send: (payload: Record<string, unknown>) => boolean;
  close: () => void;
};

function websocketBase(): string {
  const explicit = import.meta.env.VITE_WS_BASE_URL as string | undefined;
  if (explicit) return explicit.replace(/\/$/, "");
  const apiUrl = new URL(API_BASE, window.location.origin);
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  apiUrl.pathname = "";
  apiUrl.search = "";
  apiUrl.hash = "";
  return apiUrl.toString().replace(/\/$/, "");
}

function connect(
  path: string,
  onEvent: (event: ChatEvent) => void,
): ChatConnection {
  const token = getAccessToken();
  const url = `${websocketBase()}${path}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const socket = new WebSocket(url);
  socket.addEventListener("message", (event) => {
    try {
      onEvent(JSON.parse(event.data) as ChatEvent);
    } catch {
      onEvent({ event: "error", errors: "Invalid realtime payload" });
    }
  });
  return {
    socket,
    send: (payload) => {
      if (socket.readyState !== WebSocket.OPEN) return false;
      socket.send(JSON.stringify(payload));
      return true;
    },
    close: () => socket.close(),
  };
}

export function connectToGroupChat(
  groupId: string | number,
  onEvent: (event: ChatEvent) => void,
) {
  return connect(`/ws/groups/${groupId}/chat/`, onEvent);
}
export function connectToDirectChat(
  userId: string | number,
  onEvent: (event: ChatEvent) => void,
) {
  return connect(`/ws/users/${userId}/chat/`, onEvent);
}
