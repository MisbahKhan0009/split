import { FileText, Paperclip, Sparkles } from "lucide-react";
import type { Expense, Group } from "../types";
import { money } from "../data/demoData";

export function DocumentsPage({
  activeGroup,
  expenses,
  onAddExpense,
}: {
  activeGroup: Group;
  expenses: Expense[];
  onAddExpense: () => void;
}) {
  const documents = expenses.filter((expense) => expense.receipt);
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> RECEIPTS &amp; PROOF
          </div>
          <h1>
            Documents <span className="count-pill">{documents.length}</span>
          </h1>
          <p>
            {activeGroup.name} · every expense with a receipt attached, in one
            place.
          </p>
        </div>
        <button className="primary-button" onClick={onAddExpense}>
          <Paperclip size={17} /> Add expense with receipt
        </button>
      </div>
      <div className="expense-list glass-card">
        {documents.length ? (
          documents.map((expense) => (
            <div className="expense-row" key={expense.id}>
              <span className="expense-category">
                <FileText size={16} />
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
              <strong className="expense-amount">
                {money(expense.amount)}
              </strong>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <FileText size={22} />
            </div>
            <h3>No documents yet.</h3>
            <p>
              Attach a receipt when you add an expense and it will show up here
              for the whole group to reference.
            </p>
            <button className="secondary-button" onClick={onAddExpense}>
              <Paperclip size={15} /> Add expense
            </button>
          </div>
        )}
      </div>
      <div className="page-footer-hint">
        <Sparkles size={15} /> Receipts attached from the expense form appear
        here automatically.
      </div>
    </>
  );
}
