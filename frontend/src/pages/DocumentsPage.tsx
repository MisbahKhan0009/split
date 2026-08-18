import { useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Paperclip,
  Sparkles,
} from "lucide-react";
import type { Expense, Group } from "../types";
import { money } from "../data/demoData";
import { usePagination } from "../lib/usePagination";
import { Pagination } from "../components/Pagination";

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
  const {
    pageItems,
    page,
    pageCount,
    total,
    pageSize,
    nextPage,
    prevPage,
    goTo,
  } = usePagination(documents, 10);
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
          pageItems.map((expense) => (
            <div className="expense-row document-row" key={expense.id}>
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
              <div className="document-row-actions">
                {expense.receiptUrl ? (
                  <a
                    className="document-open"
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="View receipt"
                  >
                    <ExternalLink size={15} />
                  </a>
                ) : (
                  <span
                    className="document-open disabled"
                    title="Receipt unavailable"
                  >
                    <ExternalLink size={15} />
                  </span>
                )}
                {expense.receiptUrl ? (
                  <a
                    className="document-open"
                    href={expense.receiptUrl}
                    download
                    title="Download receipt"
                  >
                    <Download size={15} />
                  </a>
                ) : (
                  <span
                    className="document-open disabled"
                    title="Receipt unavailable"
                  >
                    <Download size={15} />
                  </span>
                )}
              </div>
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
        <Sparkles size={15} /> Receipts attached from the expense form appear
        here automatically.
      </div>
    </>
  );
}
