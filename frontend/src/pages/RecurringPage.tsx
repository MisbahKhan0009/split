import { useState } from "react";
import { CalendarDays, Plus, X } from "lucide-react";
import type { Group } from "../types";
import { api, type RecurringExpense } from "../lib/api";
import { money } from "../data/demoData";
import { usePagination } from "../lib/usePagination";
import { Pagination } from "../components/Pagination";

export function RecurringPage({
  activeGroup,
  recurring,
  currentUserId,
  onSync,
  onToast,
}: {
  activeGroup: Group;
  recurring: RecurringExpense[];
  currentUserId: number;
  onSync: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [nextRun, setNextRun] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const isConnected = /^\d+$/.test(activeGroup.id);

  const {
    pageItems,
    page,
    pageCount,
    total,
    pageSize,
    nextPage,
    prevPage,
    goTo,
  } = usePagination(recurring, 10);

  const create = async () => {
    if (!isConnected || !title.trim() || !amount || !nextRun) return;
    setBusy(true);
    try {
      await api.createRecurringExpense({
        group: Number(activeGroup.id),
        title: title.trim(),
        category: "Other",
        amount,
        payer: currentUserId,
        frequency,
        next_run: nextRun,
        split_mode: "equal",
      });
      setTitle("");
      setAmount("");
      setFrequency("monthly");
      setNextRun(new Date().toISOString().slice(0, 10));
      setShowForm(false);
      await onSync();
      onToast("Recurring expense scheduled.");
    } catch (error) {
      onToast(
        error instanceof Error
          ? error.message
          : "Could not schedule recurring expense.",
      );
    } finally {
      setBusy(false);
    }
  };

  const generate = async (id: number) => {
    setBusy(true);
    try {
      await api.generateRecurringExpense(id);
      await onSync();
      onToast("Recurring expense generated in the ledger.");
    } catch (error) {
      onToast(
        error instanceof Error
          ? error.message
          : "Could not generate the expense.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> AUTOMATED SPLITS
          </div>
          <h1>
            Recurring expenses{" "}
            <span className="count-pill">{recurring.length}</span>
          </h1>
          <p>
            {activeGroup.name} · scheduled expenses that repeat automatically.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => setShowForm((v) => !v)}
          disabled={!isConnected}
        >
          <Plus size={17} /> New recurring
        </button>
      </div>

      {showForm && (
        <div className="glass-card plan-form-card">
          <div className="card-heading">
            <div>
              <span className="muted-label">NEW RECURRING EXPENSE</span>
              <h2>Schedule a shared commitment</h2>
            </div>
            <button className="icon-button" onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="connected-form-grid">
            <label>
              Expense title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Monthly Wi-Fi"
              />
            </label>
            <label>
              Amount
              <input
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                }
                placeholder="৳ amount"
                inputMode="decimal"
              />
            </label>
            <label>
              Frequency
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
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
                value={nextRun}
                onChange={(e) => setNextRun(e.target.value)}
              />
            </label>
            <button
              className="primary-button"
              onClick={() => void create()}
              disabled={busy || !title.trim() || !amount}
            >
              {busy ? "Scheduling…" : "Schedule expense"}
            </button>
          </div>
        </div>
      )}

      <div className="recurring-page-grid">
        {recurring.length ? (
          pageItems.map((item) => (
            <div className="glass-card recurring-card" key={item.id}>
              <div className="recurring-card-head">
                <span className="feature-icon lime">
                  <CalendarDays size={16} />
                </span>
                <div className="recurring-card-title">
                  <strong>{item.title}</strong>
                  <small>
                    {item.frequency} · {item.payer_name}
                  </small>
                </div>
                <strong className="recurring-card-amount">
                  {money(Number(item.amount))}
                </strong>
              </div>
              <div className="recurring-card-body">
                <div className="recurring-card-detail">
                  <span>Next run</span>
                  <strong>{item.next_run}</strong>
                </div>
                <div className="recurring-card-detail">
                  <span>Split mode</span>
                  <strong>{item.split_mode}</strong>
                </div>
                <div className="recurring-card-detail">
                  <span>Status</span>
                  <strong>{item.is_active ? "Active" : "Inactive"}</strong>
                </div>
              </div>
              <button
                className="secondary-button recurring-generate"
                onClick={() => void generate(item.id)}
                disabled={busy || !item.is_active}
              >
                <CalendarDays size={14} /> Generate now
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <CalendarDays size={22} />
            </div>
            <h3>No recurring expenses.</h3>
            <p>
              Schedule a shared commitment that repeats weekly, monthly, or
              quarterly.
            </p>
            <button
              className="secondary-button"
              onClick={() => setShowForm(true)}
              disabled={!isConnected}
            >
              <Plus size={15} /> Schedule one
            </button>
          </div>
        )}
      </div>
      <Pagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        onPrev={prevPage}
        onNext={nextPage}
        onGoTo={goTo}
      />
    </>
  );
}
