import { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles,
  WalletCards,
} from "lucide-react";
import type { Group } from "../types";
import type { SettlementDTO, SettlementPlan } from "../lib/api";
import { money } from "../data/demoData";
import { PaymentModal } from "../components/PaymentModal";
import { usePagination } from "../lib/usePagination";
import { Pagination } from "../components/Pagination";

export function SettlePage({
  activeGroup,
  settlementPlan,
  settlements,
  currentUserId,
  isGroupOwner,
  onRequestSettlement,
  onPaySettlement,
  onSync,
  onToast,
}: {
  activeGroup: Group;
  settlementPlan: SettlementPlan | null;
  settlements: SettlementDTO[];
  currentUserId: number;
  isGroupOwner: boolean;
  onRequestSettlement: (
    fromUser: number,
    toUser: number,
    amount: number,
    note?: string,
  ) => Promise<void>;
  onPaySettlement: (
    settlementId: number,
    paymentMethod: string,
  ) => Promise<void>;
  onSync: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [showRequestPanel, setShowRequestPanel] = useState(false);
  const [payingSettlement, setPayingSettlement] =
    useState<SettlementDTO | null>(null);
  const [requestingIndex, setRequestingIndex] = useState<number | null>(null);

  const transfers = settlementPlan?.transfers ?? [];

  // Filter transfers the current user can request
  const visibleTransfers = isGroupOwner
    ? transfers
    : transfers.filter(
        (t) => t.from_user === currentUserId || t.to_user === currentUserId,
      );

  // Categorize settlements
  const readyToReview = settlements.filter(
    (s) => s.status === "requested" && s.from_user === currentUserId,
  );
  const requestedByYou = settlements.filter(
    (s) => s.status === "requested" && s.to_user === currentUserId,
  );
  const completed = settlements.filter((s) => s.status === "confirmed");

  const completedPagination = usePagination(completed, 8);
  const transfersPagination = usePagination(transfers, 8);

  const totalToSettle = transfers.reduce((sum, t) => sum + Number(t.amount), 0);

  const handleRequest = async (
    fromUser: number,
    toUser: number,
    amount: number,
    index: number,
  ) => {
    setRequestingIndex(index);
    try {
      await onRequestSettlement(fromUser, toUser, amount);
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : "Could not request settlement.",
      );
    } finally {
      setRequestingIndex(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> CLOSE THE LOOP
          </div>
          <h1>
            Settle up <span>↗</span>
          </h1>
          <p>
            {activeGroup.name} · live recommended transfers from the group
            ledger.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            if (!transfers.length) {
              onToast("Add an expense before requesting settlement.");
              return;
            }
            setShowRequestPanel((v) => !v);
          }}
        >
          <ArrowUpRight size={16} /> Request settlement
        </button>
      </div>

      {/* Summary cards */}
      <div className="settle-hero glass-card">
        <div>
          <span className="muted-label">OPEN TRANSFERS</span>
          <strong>{transfers.length}</strong>
          <p>recommended next steps</p>
        </div>
        <div className="settle-spark">
          <Sparkles size={23} />
          <span>
            Smart
            <br />
            simplify
          </span>
        </div>
        <div className="settle-total">
          <small>GROUP TOTAL TO SETTLE</small>
          <b>{money(totalToSettle)}</b>
        </div>
      </div>

      {/* Request settlement panel */}
      {showRequestPanel && (
        <div className="glass-card settle-request-panel">
          <div className="card-heading">
            <div>
              <span className="muted-label">REQUEST SETTLEMENT</span>
              <h2>Choose a transfer to request</h2>
            </div>
          </div>
          {visibleTransfers.length ? (
            <div className="settle-request-list">
              {visibleTransfers.map((transfer, idx) => (
                <div
                  key={`${transfer.from_user}-${transfer.to_user}`}
                  className="settle-request-row"
                >
                  <span
                    className="transfer-avatar"
                    style={{ background: "#8dd8ff" }}
                  >
                    {transfer.from_name.slice(0, 1)}
                  </span>
                  <span className="settle-request-names">
                    <strong>{transfer.from_name}</strong>
                    <ArrowUpRight size={13} />
                    <strong>{transfer.to_name}</strong>
                  </span>
                  <b>{money(Number(transfer.amount))}</b>
                  <button
                    className="primary-button"
                    disabled={requestingIndex === idx}
                    onClick={() =>
                      handleRequest(
                        transfer.from_user,
                        transfer.to_user,
                        Number(transfer.amount),
                        idx,
                      )
                    }
                  >
                    {requestingIndex === idx ? "Sending…" : "Request"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="breakdown-note">
              No transfers available for you to request.
            </p>
          )}
        </div>
      )}

      <div className="settle-grid">
        {/* Ready to review — I need to pay */}
        <div className="glass-card settle-list">
          <div className="card-heading">
            <div>
              <span className="muted-label">READY TO REVIEW</span>
              <h2>Payments awaiting you</h2>
            </div>
          </div>
          {readyToReview.length ? (
            readyToReview.map((s) => (
              <div key={s.id} className="settle-review-card">
                <div className="settle-review-info">
                  <span
                    className="transfer-avatar"
                    style={{ background: "#ffb1d5" }}
                  >
                    {s.to_name.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{s.to_name}</strong> requested{" "}
                    {money(Number(s.amount))}
                    {s.note && <small> · {s.note}</small>}
                  </span>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setPayingSettlement(s)}
                >
                  Pay now
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <WalletCards size={22} />
              </div>
              <h3>No payments pending.</h3>
              <p>When someone requests you to pay, it will appear here.</p>
            </div>
          )}
        </div>

        {/* Requested by you — waiting for others */}
        <div className="glass-card settle-list">
          <div className="card-heading">
            <div>
              <span className="muted-label">REQUESTED BY YOU</span>
              <h2>Waiting for payment</h2>
            </div>
          </div>
          {requestedByYou.length ? (
            requestedByYou.map((s) => (
              <div key={s.id} className="settle-review-card">
                <div className="settle-review-info">
                  <span
                    className="transfer-avatar"
                    style={{ background: "#f7bf6d" }}
                  >
                    {s.from_name.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{s.from_name}</strong> owes you{" "}
                    {money(Number(s.amount))}
                  </span>
                </div>
                <span className="settle-status-badge pending">
                  <Clock size={13} /> Pending
                </span>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Clock size={22} />
              </div>
              <h3>No pending requests.</h3>
              <p>Settlements you request will appear here until paid.</p>
            </div>
          )}
        </div>
      </div>

      {/* Completed settlements */}
      {completed.length > 0 && (
        <div className="glass-card settle-list settle-completed-section">
          <div className="card-heading">
            <div>
              <span className="muted-label">COMPLETED</span>
              <h2>Settlement history</h2>
            </div>
          </div>
          {completedPagination.pageItems.map((s) => (
            <div key={s.id} className="settle-review-card completed">
              <div className="settle-review-info">
                <span
                  className="transfer-avatar"
                  style={{ background: "#b7f36b" }}
                >
                  <CheckCircle2 size={14} />
                </span>
                <span>
                  <strong>{s.from_name}</strong> paid{" "}
                  <strong>{s.to_name}</strong> {money(Number(s.amount))}
                  {s.payment_method && <small> via {s.payment_method}</small>}
                </span>
              </div>
              <span className="settle-status-badge confirmed">
                <CheckCircle2 size={13} /> {s.payment_reference || "Confirmed"}
              </span>
            </div>
          ))}
          <Pagination
            page={completedPagination.page}
            pageCount={completedPagination.pageCount}
            total={completedPagination.total}
            pageSize={completedPagination.pageSize}
            onPrev={completedPagination.prevPage}
            onNext={completedPagination.nextPage}
            onGoTo={completedPagination.goTo}
          />
        </div>
      )}

      {/* Recommended transfers (always visible) */}
      <div className="glass-card settle-list">
        <div className="card-heading">
          <div>
            <span className="muted-label">RECOMMENDED TRANSFERS</span>
            <h2>Where money should move</h2>
          </div>
          <button
            className="outline-button"
            onClick={async () => {
              await onSync();
              onToast("Settlement data refreshed.");
            }}
          >
            Refresh
          </button>
        </div>
        {transfers.length ? (
          transfersPagination.pageItems.map((transfer) => (
            <div
              key={`${transfer.from_user}-${transfer.to_user}`}
              className="transfer-row"
            >
              <span
                className="transfer-avatar"
                style={{ background: "#8dd8ff" }}
              >
                {transfer.to_name.slice(0, 1)}
              </span>
              <span>
                <strong>
                  {transfer.from_name} <ArrowUpRight size={13} />{" "}
                  {transfer.to_name}
                </strong>
                <small>Outstanding balance</small>
              </span>
              <b>{money(Number(transfer.amount))}</b>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <WalletCards size={22} />
            </div>
            <h3>No open transfers.</h3>
            <p>
              Once the group has shared expenses, optimized settlement
              recommendations will appear here.
            </p>
          </div>
        )}
        <Pagination
          page={transfersPagination.page}
          pageCount={transfersPagination.pageCount}
          total={transfersPagination.total}
          pageSize={transfersPagination.pageSize}
          onPrev={transfersPagination.prevPage}
          onNext={transfersPagination.nextPage}
          onGoTo={transfersPagination.goTo}
        />
      </div>

      {/* Payment modal */}
      {payingSettlement && (
        <PaymentModal
          settlementId={payingSettlement.id}
          amount={Number(payingSettlement.amount)}
          toName={payingSettlement.to_name}
          onPay={onPaySettlement}
          onClose={() => setPayingSettlement(null)}
        />
      )}
    </>
  );
}
