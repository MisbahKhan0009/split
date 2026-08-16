export type View = "overview" | "expenses" | "settle" | "plan" | "chat";
export type SplitMode = "Equal" | "Exact" | "Percentage";

export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
  online?: boolean;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  payer: string;
  date: string;
  note: string;
  receipt?: boolean;
  status: "Confirmed" | "Pending";
}

export interface ActivityItem {
  id: string;
  member: string;
  initials: string;
  action: string;
  target: string;
  time: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  member: string;
  initials: string;
  message: string;
  time: string;
  color: string;
  mine?: boolean;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  meta: string;
  members: number;
  total: number;
  accent: string;
}
