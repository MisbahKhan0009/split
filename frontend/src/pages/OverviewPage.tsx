import {
  Activity,
  ArrowUpRight,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Sparkles,
} from "lucide-react";
import type { ActivityItem, Expense, Group, View } from "../types";
import type { Budget, SettlementPlan } from "../lib/api";
import { money } from "../data/demoData";
import { Avatar } from "../components/Avatar";

export function Overview({
  activeGroup,
  summary,
  settlementPlan,
  budgets,
  onAddExpense,
  onNavigate,
  expenses,
  activity,
}: {
  activeGroup: Group;
  summary: {
    total_spend: string;
    expense_count: number;
    member_count: number;
  } | null;
  settlementPlan: SettlementPlan | null;
  budgets: Budget[];
  onAddExpense: () => void;
  onNavigate: (view: View) => void;
  expenses: Expense[];
  activity: ActivityItem[];
}) {
  const total = Number(summary?.total_spend ?? 0);
  const transfers = settlementPlan?.transfers ?? [];
  const membersDetail = activeGroup.members_detail ?? [];
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> GROUP OVERVIEW
          </div>
          <h1>
            {activeGroup.name} <span>{activeGroup.emoji}</span>
          </h1>
          <p>{activeGroup.meta} · live data from your shared workspace.</p>
        </div>
        <div className="page-actions">
          <button
            className="secondary-button"
            onClick={() => onNavigate("chat")}
          >
            <MessageCircle size={15} /> Open group chat
          </button>
          <button className="primary-button" onClick={onAddExpense}>
            <Plus size={17} /> Add expense
          </button>
        </div>
      </div>
      <div className="overview-grid">
        <div className="balance-card glass-card">
          <div className="card-topline">
            <span className="muted-label">SHARED SPEND</span>
            <button
              className="more-button"
              onClick={() => onNavigate("expenses")}
            >
              <MoreHorizontal size={17} />
            </button>
          </div>
          <div className="balance-number">{money(total)}</div>
          <div className="balance-explainer">
            <span className="positive-dot" /> {summary?.expense_count ?? 0}{" "}
            recorded expenses
          </div>
          <button
            className="card-action"
            onClick={() => onNavigate("expenses")}
          >
            Open group ledger <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="budget-card glass-card">
          <div className="card-topline">
            <span className="muted-label">BUDGETS</span>
            <span className="trend positive">{budgets.length} active</span>
          </div>
          {budgets.length ? (
            <>
              <div className="budget-number">
                {money(Number(budgets[0].spent))}{" "}
                <small>of {money(Number(budgets[0].amount))}</small>
              </div>
              <div className="progress-track">
                <span style={{ width: `${budgets[0].percent}%` }} />
              </div>
              <div className="budget-meta">
                <span>{budgets[0].name}</span>
                <strong>{budgets[0].percent}%</strong>
              </div>
            </>
          ) : (
            <div className="empty-inline">
              <strong>No budgets yet.</strong>
              <span>Create one from the connected group controls.</span>
            </div>
          )}
          <button className="card-action" onClick={() => onNavigate("budgets")}>
            Manage budgets <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="members-card glass-card">
          <div className="card-topline">
            <span className="muted-label">GROUP MEMBERS</span>
            <button className="more-button" onClick={() => onNavigate("chat")}>
              <MoreHorizontal size={17} />
            </button>
          </div>
          <div className="member-count">
            <strong>{summary?.member_count ?? activeGroup.members}</strong>
            <span>
              people
              <br />
              in this group
            </span>
          </div>
          <div className="member-avatars">
            {membersDetail.slice(0, 5).map((member) => (
              <span
                key={member.user_id}
                className="avatar avatar-md"
                style={{ background: "#8dd8ff" }}
              >
                {member.initials}
              </span>
            ))}
          </div>
          <div className="member-online">
            <span className="positive-dot" /> Membership synced from Django
          </div>
          <button className="card-action" onClick={() => onNavigate("chat")}>
            <MessageCircle size={15} /> Open conversation
          </button>
        </div>
      </div>
      <div className="section-row">
        <div>
          <span className="muted-label">RECENT ACTIVITY</span>
          <h2>What is happening now</h2>
        </div>
        <button className="text-button" onClick={() => onNavigate("expenses")}>
          View ledger <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="lower-grid">
        <div className="activity-card glass-card">
          {activity.length ? (
            activity.slice(0, 6).map((item) => (
              <div className="activity-row" key={item.id}>
                <Avatar
                  member={{ initials: item.initials, color: item.color }}
                  size="sm"
                />
                <span>
                  <strong>{item.member}</strong> {item.action}{" "}
                  <b>{item.target}</b>
                  <small>{item.time}</small>
                </span>
                <button
                  className="row-arrow"
                  onClick={() => onNavigate("expenses")}
                >
                  <ArrowUpRight size={15} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Activity size={22} />
              </div>
              <h3>No activity yet.</h3>
              <p>
                New expenses, messages, invitations, and decisions will appear
                here.
              </p>
            </div>
          )}
        </div>
        <div className="insight-card">
          <div className="insight-icon">
            <Sparkles size={18} />
          </div>
          <span className="muted-label">WORKSPACE STATUS</span>
          <h3>
            {transfers.length
              ? `${transfers.length} settlement steps`
              : "No settlements yet"}
          </h3>
          <p>
            {transfers.length
              ? "Review the recommended transfers to close the group balance."
              : "Add a shared expense to calculate optimized settlement steps."}
          </p>
          <button className="text-button" onClick={() => onNavigate("settle")}>
            View settlement plan <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
