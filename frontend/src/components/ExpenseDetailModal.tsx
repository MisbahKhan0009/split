import {
  ArrowUpRight,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  Receipt,
  Users,
  X,
} from "lucide-react";
import type { Expense } from "../types";
import { money } from "../data/demoData";

export function ExpenseDetailModal({
  expense,
  onClose,
}: {
  expense: Expense;
  onClose: () => void;
}) {
  return (
    <div
      className="modal-backdrop expense-detail-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="expense-detail-modal">
        <div className="expense-detail-head">
          <span className="expense-detail-icon">
            <Receipt size={18} />
          </span>
          <div>
            <strong>{expense.title}</strong>
            <small>{expense.category}</small>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="expense-detail-body">
          <div className="expense-detail-amount">
            <span className="muted-label">AMOUNT</span>
            <strong>{money(expense.amount)}</strong>
          </div>

          <div className="expense-detail-grid">
            <div className="expense-detail-field">
              <span>Paid by</span>
              <strong>{expense.payer}</strong>
            </div>
            <div className="expense-detail-field">
              <span>Date</span>
              <strong>{expense.date || "—"}</strong>
            </div>
            <div className="expense-detail-field">
              <span>Status</span>
              <strong
                className={
                  expense.status === "Confirmed" ? "status-confirmed" : "status-pending"
                }
              >
                {expense.status}
              </strong>
            </div>
            <div className="expense-detail-field">
              <span>Split mode</span>
              <strong>{expense.splitMode ?? "equal"}</strong>
            </div>
          </div>

          {expense.note && (
            <div className="expense-detail-note">
              <span className="muted-label">NOTE</span>
              <p>{expense.note}</p>
            </div>
          )}

          {expense.backendParticipants && expense.backendParticipants.length > 0 && (
            <div className="expense-detail-participants">
              <span className="muted-label">
                <Users size={13} /> SPLIT BETWEEN {expense.backendParticipants.length} PEOPLE
              </span>
              <div className="expense-detail-participant-list">
                {expense.backendParticipants.map((p, index) => (
                  <div className="expense-detail-participant" key={index}>
                    <span>Participant #{p.user}</span>
                    <strong>{money(p.share_amount)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expense.receiptUrl && (
            <div className="expense-detail-receipt">
              <span className="muted-label">
                <FileText size={13} /> RECEIPT ATTACHED
              </span>
              <div className="expense-detail-receipt-actions">
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-button small"
                >
                  <ExternalLink size={14} /> View
                </a>
                <a
                  href={expense.receiptUrl}
                  download
                  className="outline-button small"
                >
                  <Download size={14} /> Download
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="expense-detail-footer">
          <button type="button" className="outline-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
