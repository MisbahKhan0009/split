export type View =
  | "dashboard"
  | "overview"
  | "expenses"
  | "settle"
  | "plan"
  | "chat"
  | "budgets"
  | "documents"
  | "activity"
  | "recurring"
  | "quick-access"
  | "settings";
export type SplitMode = "Equal" | "Exact" | "Percentage";
export type ChatKind = "group" | "direct";
export type AttachmentKind = "image" | "video" | "file" | "gif";

export interface Profile {
  bio: string;
  status: string;
  theme?: string;
  avatarUrl?: string;
  lastSeen?: string;
}

export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
  online?: boolean;
  profile: Profile;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  payer: string;
  date: string;
  /** ISO YYYY-MM-DD, the real sortable/filterable expense date (occurred_on). */
  occurredOn?: string;
  note: string;
  receipt?: boolean;
  receiptUrl?: string;
  receiptFile?: File;
  backendId?: number;
  status: "Confirmed" | "Pending";
  backendPayerId?: number;
  backendParticipants?: {
    user: number;
    share_amount: number;
    share_value?: number;
  }[];
  splitMode?: "equal" | "exact" | "percentage";
}

export interface ActivityItem {
  id: string;
  member: string;
  initials: string;
  action: string;
  target: string;
  time: string;
  color: string;
  /** Raw ISO timestamp (created_at), kept alongside the formatted `time` string. */
  timestamp?: string;
}

export interface ChatAttachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  url: string;
  size?: string | number;
  contentType?: string;
  thumbnail?: string;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  reacted?: boolean;
  userIds?: number[];
}

export interface ChatMessage {
  id: string;
  member: string;
  senderId: string;
  initials: string;
  message: string;
  time: string;
  color: string;
  mine?: boolean;
  kind?: ChatKind;
  attachments?: ChatAttachment[];
  reactions?: ChatReaction[];
  replyTo?: string;
  replyPreview?: { id: string; authorName: string; body: string };
  read?: boolean;
}

export interface Conversation {
  id: string;
  kind: ChatKind;
  title: string;
  subtitle: string;
  memberId?: string;
  unread: number;
  lastMessage: string;
  accent: string;
}

export interface GroupMember {
  user_id: number;
  name: string;
  initials: string;
  role: string;
  profile?: {
    bio: string;
    status: string;
    theme?: string;
    avatar?: string | null;
    updated_at?: string;
  };
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  meta: string;
  members: number;
  total: number;
  accent: string;
  currency: "BDT";
  members_detail?: GroupMember[];
}
