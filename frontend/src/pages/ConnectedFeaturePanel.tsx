import { useState } from "react";
import { Activity, CalendarDays, Check, Target } from "lucide-react";
import type { Group } from "../types";
import {
  api,
  type Budget,
  type GroupEvent,
  type NotificationItem,
  type Poll,
  type RecurringExpense,
  type SettlementPlan,
} from "../lib/api";
import { money } from "../data/demoData";

export function ConnectedFeaturePanel({
  activeGroup,
  currentUserId,
  summary,
  budgets,
  notifications,
  settlementPlan,
  recurring,
  events,
  polls,
  onSync,
  onToast,
}: {
  activeGroup: Group;
  currentUserId: number;
  summary: {
    total_spend: string;
    expense_count: number;
    member_count: number;
  } | null;
  budgets: Budget[];
  notifications: NotificationItem[];
  settlementPlan: SettlementPlan | null;
  recurring: RecurringExpense[];
  events: GroupEvent[];
  polls: Poll[];
  onSync: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [recurringTitle, setRecurringTitle] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const isConnected = /^\d+$/.test(activeGroup.id);
  const createBudget = async () => {
    if (!isConnected || !budgetName || !budgetAmount) return;
    try {
      await api.createBudget({
        group: Number(activeGroup.id),
        name: budgetName,
        category: "All",
        amount: budgetAmount,
        period: "monthly",
        starts_on: new Date().toISOString().slice(0, 10),
      });
      setBudgetName("");
      setBudgetAmount("");
      await onSync();
      onToast("Budget created in the shared workspace.");
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Could not create budget.",
      );
    }
  };
  const createPoll = async () => {
    if (!isConnected || !pollQuestion) return;
    try {
      await api.createPoll({
        group: Number(activeGroup.id),
        question: pollQuestion,
        options: ["Yes, I’m in", "Maybe", "Not this time"],
      });
      setPollQuestion("");
      await onSync();
      onToast("Poll published to the group.");
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Could not publish poll.",
      );
    }
  };
  const createRecurring = async () => {
    if (!isConnected || !recurringTitle || !recurringAmount) return;
    try {
      await api.createRecurringExpense({
        group: Number(activeGroup.id),
        title: recurringTitle,
        category: "Other",
        amount: recurringAmount,
        payer: currentUserId,
        frequency: "monthly",
        next_run: new Date().toISOString().slice(0, 10),
        split_mode: "equal",
      });
      setRecurringTitle("");
      setRecurringAmount("");
      await onSync();
      onToast("Recurring expense scheduled.");
    } catch (error) {
      onToast(
        error instanceof Error
          ? error.message
          : "Could not schedule recurring expense.",
      );
    }
  };
  const createEvent = async () => {
    if (!isConnected || !eventTitle) return;
    try {
      await api.createEvent({
        group: Number(activeGroup.id),
        title: eventTitle,
        description: "Shared group event",
        starts_at: new Date(Date.now() + 86400000).toISOString(),
        location: "To be decided",
        budget: "0",
        checklist: [],
      });
      setEventTitle("");
      await onSync();
      onToast("Group event created.");
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Could not create event.",
      );
    }
  };
  return (
    <section className="connected-feature-panel">
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> GROUP WORKSPACE
          </div>
          <h2>Shared finances, in one place.</h2>
          <p>
            {isConnected
              ? "Live balances, budgets, plans, and decisions for " +
                activeGroup.name +
                "."
              : "Connect to a group to load its shared workspace data."}
          </p>
        </div>
        <button className="outline-button" onClick={() => void onSync()}>
          <Activity size={15} /> Sync now
        </button>
      </div>
      <div className="insight-grid">
        <div className="glass-card insight-card">
          <span className="muted-label">SHARED SPEND</span>
          <strong>
            {summary ? money(Number(summary.total_spend)) : "৳ —"}
          </strong>
          <small>
            {summary?.expense_count ?? 0} expenses ·{" "}
            {summary?.member_count ?? activeGroup.members} members
          </small>
        </div>
        <div className="glass-card insight-card">
          <span className="muted-label">ACTIVE BUDGETS</span>
          <strong>{budgets.length}</strong>
          <small>
            {budgets.filter((budget) => budget.percent >= 80).length} need
            attention
          </small>
        </div>
        <div className="glass-card insight-card">
          <span className="muted-label">INBOX</span>
          <strong>
            {notifications.filter((item) => !item.is_read).length}
          </strong>
          <small>unread group updates</small>
        </div>
      </div>
      <div className="connected-action-grid">
        <div className="glass-card connected-action">
          <span className="muted-label">NEW BUDGET</span>
          <div className="connected-form-row">
            <input
              value={budgetName}
              onChange={(event) => setBudgetName(event.target.value)}
              placeholder="e.g. April groceries"
            />
            <input
              value={budgetAmount}
              onChange={(event) =>
                setBudgetAmount(event.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder="৳ amount"
              inputMode="decimal"
            />
            <button
              className="primary-button"
              onClick={() => void createBudget()}
            >
              <Target size={15} /> Save
            </button>
          </div>
        </div>
        <div className="glass-card connected-action">
          <span className="muted-label">QUICK POLL</span>
          <div className="connected-form-row">
            <input
              value={pollQuestion}
              onChange={(event) => setPollQuestion(event.target.value)}
              placeholder="Ask the group a decision question"
            />
            <button
              className="secondary-button"
              onClick={() => void createPoll()}
            >
              <Check size={15} /> Publish
            </button>
          </div>
        </div>
        <div className="glass-card connected-action">
          <span className="muted-label">RECURRING EXPENSE</span>
          <div className="connected-form-row">
            <input
              value={recurringTitle}
              onChange={(event) => setRecurringTitle(event.target.value)}
              placeholder="e.g. Monthly Wi‑Fi"
            />
            <input
              value={recurringAmount}
              onChange={(event) =>
                setRecurringAmount(event.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder="৳ amount"
            />
            <button
              className="secondary-button"
              onClick={() => void createRecurring()}
            >
              <CalendarDays size={15} /> Schedule
            </button>
          </div>
          <small>{recurring.length} scheduled in this group</small>
        </div>
        <div className="glass-card connected-action">
          <span className="muted-label">GROUP EVENT</span>
          <div className="connected-form-row">
            <input
              value={eventTitle}
              onChange={(event) => setEventTitle(event.target.value)}
              placeholder="e.g. Friday river cruise"
            />
            <button
              className="secondary-button"
              onClick={() => void createEvent()}
            >
              <CalendarDays size={15} /> Add event
            </button>
          </div>
          <small>
            {events.length} upcoming events · {polls.length} active polls
          </small>
        </div>
      </div>
      <div className="glass-card connected-action settlement-summary">
        <span className="muted-label">OPTIMIZED SETTLEMENTS</span>
        {settlementPlan?.transfers.length ? (
          settlementPlan.transfers.map((transfer) => (
            <div
              className="connected-list-row"
              key={`${transfer.from_user}-${transfer.to_user}`}
            >
              <span>
                {transfer.from_name} → {transfer.to_name}
              </span>
              <strong>{money(Number(transfer.amount))}</strong>
            </div>
          ))
        ) : (
          <small>
            No open transfers yet. Add shared expenses to generate the fewest
            payments.
          </small>
        )}
      </div>
    </section>
  );
}
