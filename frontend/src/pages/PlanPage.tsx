import { useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Plus, X } from "lucide-react";
import type { Group } from "../types";
import {
  api,
  type GroupEvent,
  type Poll,
  type RecurringExpense,
} from "../lib/api";
import { money } from "../data/demoData";
import { usePagination } from "../lib/usePagination";
import { Pagination } from "../components/Pagination";

export function PlanPage({
  activeGroup,
  events,
  polls,
  recurring,
  onToast,
  onSync,
  currentUserId,
}: {
  activeGroup: Group;
  events: GroupEvent[];
  polls: Poll[];
  recurring: RecurringExpense[];
  onToast: (message: string) => void;
  onSync: () => Promise<void>;
  currentUserId: number;
}) {
  const [form, setForm] = useState<"event" | "poll" | "recurring" | null>(null);
  const [busy, setBusy] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventBudget, setEventBudget] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("Yes\nNo");
  const [recurringTitle, setRecurringTitle] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringFrequency, setRecurringFrequency] = useState("monthly");
  const [recurringNextRun, setRecurringNextRun] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const isConnected = /^\d+$/.test(activeGroup.id);
  const eventsPagination = usePagination(events, 6);
  const pollsPagination = usePagination(polls, 6);
  const run = async (operation: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await operation();
      await onSync();
      setForm(null);
      onToast(success);
    } catch (error) {
      onToast(
        error instanceof Error
          ? error.message
          : "Could not complete that plan action.",
      );
    } finally {
      setBusy(false);
    }
  };
  const createEvent = () => {
    if (!eventTitle.trim() || !eventDate || !isConnected) return;
    void run(async () => {
      await api.createEvent({
        group: Number(activeGroup.id),
        title: eventTitle.trim(),
        description: "",
        starts_at: new Date(eventDate).toISOString(),
        location: eventLocation.trim(),
        budget: eventBudget || "0",
        checklist: [],
      });
      setEventTitle("");
      setEventDate("");
      setEventLocation("");
      setEventBudget("");
    }, "Event created in the group calendar.");
  };
  const createPoll = () => {
    const options = pollOptions
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2 || !isConnected) return;
    void run(async () => {
      await api.createPoll({
        group: Number(activeGroup.id),
        question: pollQuestion.trim(),
        options,
      });
      setPollQuestion("");
      setPollOptions("Yes\nNo");
    }, "Poll published for the group.");
  };
  const createRecurring = () => {
    if (
      !recurringTitle.trim() ||
      !recurringAmount ||
      !recurringNextRun ||
      !isConnected
    )
      return;
    void run(async () => {
      await api.createRecurringExpense({
        group: Number(activeGroup.id),
        title: recurringTitle.trim(),
        category: "Other",
        amount: recurringAmount,
        payer: currentUserId,
        frequency: recurringFrequency,
        next_run: recurringNextRun,
        split_mode: "equal",
      });
      setRecurringTitle("");
      setRecurringAmount("");
    }, "Recurring expense scheduled.");
  };
  const vote = (pollId: number, optionId: number) => {
    void run(async () => {
      await api.votePoll(pollId, optionId);
    }, "Vote recorded.");
  };
  const rsvp = (eventId: number) => {
    void run(async () => {
      await api.rsvpEvent(eventId);
    }, "Event attendance updated.");
  };
  const generate = (recurringId: number) => {
    void run(async () => {
      await api.generateRecurringExpense(recurringId);
    }, "Recurring expense generated in the ledger.");
  };
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> PLAN TOGETHER
          </div>
          <h1>
            Group plans <span>✦</span>
          </h1>
          <p>
            {activeGroup.name} · create and manage events, decisions, and
            recurring commitments.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="secondary-button"
            onClick={() => setForm("poll")}
            disabled={!isConnected}
          >
            <Check size={15} /> New poll
          </button>
          <button
            className="primary-button"
            onClick={() => setForm("event")}
            disabled={!isConnected}
          >
            <Plus size={17} /> Add event
          </button>
        </div>
      </div>
      {form && (
        <div className="glass-card plan-form-card">
          <div className="card-heading">
            <div>
              <span className="muted-label">
                {form === "event"
                  ? "NEW GROUP EVENT"
                  : form === "poll"
                    ? "NEW GROUP POLL"
                    : "NEW RECURRING EXPENSE"}
              </span>
              <h2>
                {form === "event"
                  ? "Schedule something together"
                  : form === "poll"
                    ? "Ask the group"
                    : "Schedule a shared commitment"}
              </h2>
            </div>
            <button className="icon-button" onClick={() => setForm(null)}>
              <X size={16} />
            </button>
          </div>
          {form === "event" && (
            <div className="connected-form-grid">
              <label>
                Title
                <input
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="Friday dinner"
                />
              </label>
              <label>
                Date and time
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                />
              </label>
              <label>
                Location
                <input
                  value={eventLocation}
                  onChange={(event) => setEventLocation(event.target.value)}
                  placeholder="Dhanmondi"
                />
              </label>
              <label>
                Budget
                <input
                  value={eventBudget}
                  onChange={(event) =>
                    setEventBudget(event.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="৳ amount"
                />
              </label>
              <button
                className="primary-button"
                onClick={createEvent}
                disabled={busy || !eventTitle.trim() || !eventDate}
              >
                {busy ? "Saving…" : "Create event"}
              </button>
            </div>
          )}
          {form === "poll" && (
            <div className="connected-form-grid">
              <label>
                Question
                <input
                  value={pollQuestion}
                  onChange={(event) => setPollQuestion(event.target.value)}
                  placeholder="Where should we eat?"
                />
              </label>
              <label>
                Options <small>one per line</small>
                <textarea
                  value={pollOptions}
                  onChange={(event) => setPollOptions(event.target.value)}
                  rows={4}
                />
              </label>
              <button
                className="primary-button"
                onClick={createPoll}
                disabled={
                  busy ||
                  !pollQuestion.trim() ||
                  pollOptions.split("\n").filter((option) => option.trim())
                    .length < 2
                }
              >
                {busy ? "Publishing…" : "Publish poll"}
              </button>
            </div>
          )}
          {form === "recurring" && (
            <div className="connected-form-grid">
              <label>
                Expense title
                <input
                  value={recurringTitle}
                  onChange={(event) => setRecurringTitle(event.target.value)}
                  placeholder="Monthly Wi-Fi"
                />
              </label>
              <label>
                Amount
                <input
                  value={recurringAmount}
                  onChange={(event) =>
                    setRecurringAmount(
                      event.target.value.replace(/[^0-9.]/g, ""),
                    )
                  }
                  placeholder="৳ amount"
                />
              </label>
              <label>
                Frequency
                <select
                  value={recurringFrequency}
                  onChange={(event) =>
                    setRecurringFrequency(event.target.value)
                  }
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </label>
              <label>
                Next run
                <input
                  type="date"
                  value={recurringNextRun}
                  onChange={(event) => setRecurringNextRun(event.target.value)}
                />
              </label>
              <button
                className="primary-button"
                onClick={createRecurring}
                disabled={busy || !recurringTitle.trim() || !recurringAmount}
              >
                {busy ? "Scheduling…" : "Schedule expense"}
              </button>
            </div>
          )}
        </div>
      )}
      <div className="plan-grid">
        <div className="glass-card timeline-card">
          <div className="card-heading">
            <div>
              <span className="muted-label">UPCOMING EVENTS</span>
              <h2>Shared calendar</h2>
            </div>
            <button
              className="icon-button"
              onClick={() => setForm("event")}
              disabled={!isConnected}
            >
              <Plus size={16} />
            </button>
          </div>
          {events.length ? (
            eventsPagination.pageItems.map((event) => (
              <div className="timeline-item" key={event.id}>
                <div className="timeline-date">
                  <b>{new Date(event.starts_at).getDate()}</b>
                  <span>
                    {new Date(event.starts_at)
                      .toLocaleString("en", { month: "short" })
                      .toUpperCase()}
                  </span>
                </div>
                <div className="timeline-copy">
                  <span className="status-chip blue">EVENT</span>
                  <h3>{event.title}</h3>
                  <p>
                    {new Date(event.starts_at).toLocaleString()} ·{" "}
                    {event.location || "Location to be decided"} · budget{" "}
                    {money(Number(event.budget))}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => rsvp(event.id)}
                    disabled={busy}
                  >
                    {event.attendees.includes(currentUserId)
                      ? "Cancel RSVP"
                      : "RSVP"}{" "}
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <CalendarDays size={22} />
              </div>
              <h3>No events scheduled.</h3>
              <p>Create a group event and invite members to RSVP.</p>
              <button
                className="secondary-button"
                onClick={() => setForm("event")}
                disabled={!isConnected}
              >
                <Plus size={15} /> Create event
              </button>
            </div>
          )}
          <Pagination
            page={eventsPagination.page}
            pageCount={eventsPagination.pageCount}
            total={eventsPagination.total}
            pageSize={eventsPagination.pageSize}
            onPrev={eventsPagination.prevPage}
            onNext={eventsPagination.nextPage}
            onGoTo={eventsPagination.goTo}
          />
        </div>
        <div className="glass-card task-card">
          <div className="card-heading">
            <div>
              <span className="muted-label">DECISIONS & COMMITMENTS</span>
              <h2>Keep plans current</h2>
            </div>
            <button
              className="icon-button"
              onClick={() => setForm("poll")}
              disabled={!isConnected}
            >
              <Plus size={16} />
            </button>
          </div>
          {polls.length ? (
            pollsPagination.pageItems.map((poll) => (
              <div className="plan-poll" key={poll.id}>
                <div className="task-person">
                  <span className="feature-icon blue">
                    <Check size={15} />
                  </span>
                  <span>
                    <strong>{poll.question}</strong>
                    <small>
                      {poll.total_votes} votes ·{" "}
                      {poll.is_closed ? "Closed" : "Open"}
                    </small>
                  </span>
                </div>
                <div className="poll-options">
                  {poll.options.map((option) => (
                    <button
                      key={option.id}
                      className="poll-option"
                      onClick={() => vote(poll.id, option.id)}
                      disabled={busy || poll.is_closed}
                    >
                      <span>{option.label}</span>
                      <b>{option.votes}</b>
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Check size={22} />
              </div>
              <h3>No polls yet.</h3>
              <p>Publish a decision and let the group vote.</p>
              <button
                className="secondary-button"
                onClick={() => setForm("poll")}
                disabled={!isConnected}
              >
                <Plus size={15} /> Create poll
              </button>
            </div>
          )}
          <Pagination
            page={pollsPagination.page}
            pageCount={pollsPagination.pageCount}
            total={pollsPagination.total}
            pageSize={pollsPagination.pageSize}
            onPrev={pollsPagination.prevPage}
            onNext={pollsPagination.nextPage}
            onGoTo={pollsPagination.goTo}
          />
          {recurring.length ? (
            <div className="recurring-list">
              {recurring.map((item) => (
                <div className="task-person" key={item.id}>
                  <span className="feature-icon lime">
                    <CalendarDays size={15} />
                  </span>
                  <span>
                    <strong>
                      {item.title} · {money(Number(item.amount))}
                    </strong>
                    <small>
                      {item.frequency} · next run {item.next_run}
                    </small>
                  </span>
                  <button
                    className="text-button"
                    onClick={() => generate(item.id)}
                    disabled={busy || !item.is_active}
                  >
                    Generate now
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              className="card-action"
              onClick={() => setForm("recurring")}
              disabled={!isConnected}
            >
              <Plus size={15} /> Schedule recurring expense
            </button>
          )}
        </div>
      </div>
    </>
  );
}
