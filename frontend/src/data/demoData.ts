import type {
  ActivityItem,
  ChatMessage,
  Expense,
  Group,
  Member,
} from "../types";
import type { GroupMemberDTO, MessageDTO } from "../lib/api";

export const money = (value: number) => `৳ ${value.toLocaleString("en-BD")}`;

export const groups: Group[] = [];

export const emptyGroup: Group = {
  id: "none",
  name: "No group yet",
  emoji: "+",
  meta: "Create or join a shared space",
  members: 0,
  total: 0,
  accent: "#b7f36b",
  currency: "BDT",
};

export const members: Member[] = [
  {
    id: "me",
    name: "Rafi",
    initials: "RF",
    color: "#b7f36b",
    online: true,
    profile: { bio: "Always down for a good adda.", status: "Online now" },
  },
  {
    id: "tisha",
    name: "Tisha",
    initials: "TS",
    color: "#f7bf6d",
    online: true,
    profile: {
      bio: "Coffee, cameras, and clean splits.",
      status: "Online now",
    },
  },
  {
    id: "nabil",
    name: "Nabil",
    initials: "NB",
    color: "#99b8ff",
    online: true,
    profile: {
      bio: "Maps first, plans later.",
      status: "Active 2m ago",
      lastSeen: "2m ago",
    },
  },
  {
    id: "mahi",
    name: "Mahi",
    initials: "MH",
    color: "#e7a8ff",
    profile: {
      bio: "Designing the next hangout.",
      status: "Active 12m ago",
      lastSeen: "12m ago",
    },
  },
  {
    id: "shuvo",
    name: "Shuvo",
    initials: "SH",
    color: "#8dd8ff",
    profile: {
      bio: "Receipts are my love language.",
      status: "Active yesterday",
      lastSeen: "Yesterday",
    },
  },
];

export const initialExpenses: Expense[] = [];

export const initialActivity: ActivityItem[] = [];

export const initialChat: ChatMessage[] = [];

export const memberColors = [
  "#b7f36b",
  "#f7bf6d",
  "#99b8ff",
  "#e7a8ff",
  "#8dd8ff",
  "#ffb1d5",
];
export const memberFromDTO = (
  member: GroupMemberDTO,
  index: number,
): Member => ({
  id: String(member.user_id),
  name: member.name,
  initials: member.initials,
  color: memberColors[index % memberColors.length],
  profile: {
    bio: member.profile?.bio || "No bio added yet.",
    status: member.profile?.status || "Available",
    theme: member.profile?.theme || "default",
    avatarUrl: member.profile?.avatar || undefined,
  },
});
export const normalizeMessage = (
  row: MessageDTO,
  currentUserId?: number,
): ChatMessage => ({
  id: String(row.id),
  senderId: String(row.author),
  member: row.author_name,
  initials: row.author_initials,
  message: row.body,
  time: new Date(row.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }),
  color: memberColors[row.author % memberColors.length],
  mine: row.author === currentUserId,
  kind: row.kind,
  attachments: (row.attachments || []).map((attachment) => ({
    ...attachment,
    id: String(attachment.id),
    contentType: attachment.content_type,
  })),
  reactions: (row.reactions || []).map((reaction) => ({
    emoji: reaction.emoji,
    count: reaction.count,
    reacted: reaction.user_ids
      ? reaction.user_ids.includes(currentUserId ?? -1)
      : reaction.reacted,
    userIds: reaction.user_ids,
  })),
  replyTo: row.reply_to ? String(row.reply_to) : undefined,
  replyPreview: row.reply_preview
    ? {
        id: String(row.reply_preview.id),
        authorName: row.reply_preview.author_name,
        body: row.reply_preview.body,
      }
    : undefined,
  read: Boolean(row.read_at),
});
