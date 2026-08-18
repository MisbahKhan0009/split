import { useState, useEffect } from "react";
import { Filter, Plus, Receipt, Sparkles, ArrowUpRight } from "lucide-react";
import type { Expense, Group } from "../types";
import { money } from "../data/demoData";
import { usePagination } from "../lib/usePagination";
import { Pagination } from "../components/Pagination";
import { ExpenseDetailModal } from "../components/ExpenseDetailModal";

export function ExpensesPage({
  activeGroup,
  expenses,
  onAddExpense,
  query,
  onToast,
}: {
  activeGroup: Group;
  expenses: Expense[];
  onAddExpense: () => void;
  query: string;
  onToast: (message: string) => void;
}) {
  const [filter, setFilter] = useState("All");
  const [detail, setDetail] = useState<Expense | null>(null);
  const filtered = expenses.filter(
    (expense) =>
      `${expense.title} ${expense.category} ${expense.payer}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All" || expense.category === filter),
  );
  const {
    pageItems,
    page,
    pageCount,
    total,
    pageSize,
    nextPage,
    prevPage,
    goTo,
    resetPage,
  } = usePagination(filtered, 10);

  useEffect(() => {
    resetPage();
  }, [filter, query]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> GROUP LEDGER
          </div>
          <h1>
            Expenses <span className="count-pill">{expenses.length}</span>
          </h1>
          <p>
            {activeGroup.name} · every shared cost, with the full story
            attached.
          </p>
        </div>
        <button className="primary-button" onClick={onAddExpense}>
          <Plus size={17} /> Add expense
        </button>
      </div>
      <div className="toolbar glass-card">
        <div className="filter-tabs">
          {["All", "Food", "Stay", "Transport", "Activities"].map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="outline-button"
          onClick={() => onToast("More filters are ready to use")}
        >
          <Filter size={15} /> Filters
        </button>
      </div>
      <div className="expense-list glass-card">
        {filtered.length === 0 ? (
          <EmptyState onAddExpense={onAddExpense} />
        ) : (
          pageItems.map((expense) => (
            <div className="expense-row" key={expense.id}>
              <span
                className={`expense-category ${expense.category.toLowerCase()}`}
              >
                {expense.category === "Food"
                  ? "◒"
                  : expense.category === "Stay"
                    ? "⌂"
                    : expense.category === "Transport"
                      ? "↗"
                      : "✦"}
              </span>
              <span className="expense-main">
                <strong>{expense.title}</strong>
                <small>{expense.note}</small>
              </span>
              <span className="expense-payer">
                <small>Paid by</small>
                <strong>{expense.payer}</strong>
              </span>
              <span className="expense-date">{expense.date}</span>
              <span className="expense-status">
                <i className={expense.status === "Pending" ? "pending" : ""} />
                {expense.status}
              </span>
              <strong className="expense-amount">
                {money(expense.amount)}
              </strong>
              <button
                className="row-arrow"
                onClick={() => setDetail(expense)}
              >
                <ArrowUpRight size={16} />
              </button>
            </div>
          ))
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
      <div className="page-footer-hint">
        <Sparkles size={15} /> Tip: attach a receipt to make every expense
        easier to trust.
      </div>
      {detail && (
        <ExpenseDetailModal expense={detail} onClose={() => setDetail(null)} />
      )}
    </>
  );
}
function EmptyState({ onAddExpense }: { onAddExpense: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Receipt size={22} />
      </div>
      <h3>No expenses match that filter.</h3>
      <p>Try another category or add the first expense for this group.</p>
      <button className="secondary-button" onClick={onAddExpense}>
        <Plus size={15} /> Add expense
      </button>
    </div>
  );
}
