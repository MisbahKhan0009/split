import { useState } from "react";
import { Plus, Target, X } from "lucide-react";
import type { Group } from "../types";
import { api, type Budget } from "../lib/api";
import { money } from "../data/demoData";
import { usePagination } from "../lib/usePagination";
import { Pagination } from "../components/Pagination";

export function BudgetsPage({
  activeGroup,
  budgets,
  onSync,
  onToast,
}: {
  activeGroup: Group;
  budgets: Budget[];
  onSync: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("All");
  const [amount, setAmount] = useState("");
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
  } = usePagination(budgets, 12);

  const createBudget = async () => {
    if (!isConnected || !name.trim() || !amount) return;
    setBusy(true);
    try {
      await api.createBudget({
        group: Number(activeGroup.id),
        name: name.trim(),
        category,
        amount,
        period: "monthly",
        starts_on: new Date().toISOString().slice(0, 10),
      });
      setName("");
      setAmount("");
      setCategory("All");
      setShowForm(false);
      await onSync();
      onToast("Budget created in the shared workspace.");
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Could not create budget.",
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
            <span className="eyebrow-dot" /> SPENDING LIMITS
          </div>
          <h1>
            Budgets <span className="count-pill">{budgets.length}</span>
          </h1>
          <p>{activeGroup.name} · track category spending against a plan.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => setShowForm((value) => !value)}
          disabled={!isConnected}
        >
          <Plus size={17} /> New budget
        </button>
      </div>
      {showForm && (
        <div className="glass-card plan-form-card">
          <div className="card-heading">
            <div>
              <span className="muted-label">NEW BUDGET</span>
              <h2>Set a spending limit</h2>
            </div>
            <button className="icon-button" onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="connected-form-grid">
            <label>
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. April groceries"
              />
            </label>
            <label>
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="All">All categories</option>
                <option value="Food">Food</option>
                <option value="Stay">Stay</option>
                <option value="Transport">Transport</option>
                <option value="Activities">Activities</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Monthly amount
              <input
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/[^0-9.]/g, ""))
                }
                placeholder="৳ amount"
              />
            </label>
            <button
              className="primary-button"
              onClick={() => void createBudget()}
              disabled={busy || !name.trim() || !amount}
            >
              {busy ? "Saving…" : "Save budget"}
            </button>
          </div>
        </div>
      )}
      <div className="plan-grid budgets-grid">
        {budgets.length ? (
          pageItems.map((budget) => (
            <div className="glass-card budget-detail-card" key={budget.id}>
              <div className="card-topline">
                <span className="muted-label">
                  {budget.category.toUpperCase()}
                </span>
                <span
                  className={`trend ${budget.percent >= 80 ? "warning" : "positive"}`}
                >
                  {budget.percent}%
                </span>
              </div>
              <strong className="budget-detail-name">{budget.name}</strong>
              <div className="budget-number">
                {money(Number(budget.spent))}{" "}
                <small>of {money(Number(budget.amount))}</small>
              </div>
              <div className="progress-track">
                <span style={{ width: `${Math.min(budget.percent, 100)}%` }} />
              </div>
              <small className="budget-detail-period">
                {budget.period} · starts {budget.starts_on}
              </small>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <Target size={22} />
            </div>
            <h3>No budgets yet.</h3>
            <p>Create one to track spending against a plan for this group.</p>
            <button
              className="secondary-button"
              onClick={() => setShowForm(true)}
              disabled={!isConnected}
            >
              <Plus size={15} /> New budget
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
