import { ArrowUpRight, Sparkles, WalletCards } from "lucide-react";
import type { Group } from "../types";
import type { SettlementPlan } from "../lib/api";
import { money } from "../data/demoData";

export function SettlePage({
  activeGroup,
  settlementPlan,
  onToast,
}: {
  activeGroup: Group;
  settlementPlan: SettlementPlan | null;
  onToast: (message: string) => void;
}) {
  const transfers = settlementPlan?.transfers ?? [];
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
          onClick={() =>
            onToast(
              transfers.length
                ? "Choose a transfer to continue settlement."
                : "Add an expense before requesting settlement.",
            )
          }
        >
          <ArrowUpRight size={16} /> Request settlement
        </button>
      </div>
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
          <b>
            {money(
              transfers.reduce((sum, item) => sum + Number(item.amount), 0),
            )}
          </b>
        </div>
      </div>
      <div className="settle-grid">
        <div className="glass-card settle-list">
          <div className="card-heading">
            <div>
              <span className="muted-label">RECOMMENDED TRANSFERS</span>
              <h2>Where money should move</h2>
            </div>
          </div>
          {transfers.length ? (
            transfers.map((transfer) => (
              <TransferRow
                key={`${transfer.from_user}-${transfer.to_user}`}
                from={transfer.from_name}
                to={transfer.to_name}
                amount={Number(transfer.amount)}
                color="#8dd8ff"
                onToast={onToast}
              />
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
        </div>
        <div className="glass-card breakdown-card">
          <div className="card-heading">
            <div>
              <span className="muted-label">SETTLEMENT STATUS</span>
              <h2>
                {transfers.length ? "Ready to review" : "Nothing to settle"}
              </h2>
            </div>
          </div>
          <p className="breakdown-note">
            <Sparkles size={14} /> This view is calculated from the current
            group expenses and membership.
          </p>
        </div>
      </div>
    </>
  );
}
function TransferRow({
  from,
  to,
  amount,
  color,
  onToast,
}: {
  from: string;
  to: string;
  amount: number;
  color: string;
  onToast: (message: string) => void;
}) {
  return (
    <div className="transfer-row">
      <span className="transfer-avatar" style={{ background: color }}>
        {to.slice(0, 1)}
      </span>
      <span>
        <strong>
          {from} <ArrowUpRight size={13} /> {to}
        </strong>
        <small>Outstanding balance</small>
      </span>
      <b>{money(amount)}</b>
      <button
        className="settle-button"
        onClick={() => onToast(`Settlement request sent to ${to}`)}
      >
        Request
      </button>
    </div>
  );
}
