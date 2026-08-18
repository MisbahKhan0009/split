import { useState } from "react";
import { ArrowUpRight, Users, X } from "lucide-react";
import type { GroupInvitation } from "../lib/api";

export function AnnouncementBanner({
  invitation,
  extraCount,
  onAccept,
  onDecline,
  onDismiss,
  onViewAll,
}: {
  invitation: GroupInvitation;
  extraCount: number;
  onAccept: (id: number) => Promise<void>;
  onDecline: (id: number) => Promise<void>;
  onDismiss: (id: number) => void;
  onViewAll: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "That invitation action could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="announcement-banner" role="status">
      <span className="announcement-icon">
        <Users size={15} />
      </span>
      <p className="announcement-copy">
        <strong>{invitation.inviter_name}</strong> invited you to join{" "}
        <strong>{invitation.group_name}</strong>.
        {extraCount > 0 && (
          <button
            type="button"
            className="announcement-more"
            onClick={onViewAll}
          >
            +{extraCount} more invitation{extraCount > 1 ? "s" : ""}
          </button>
        )}
        {error && <small className="announcement-error">{error}</small>}
      </p>
      <div className="announcement-actions">
        <button
          type="button"
          className="announcement-join"
          disabled={busy}
          onClick={() => void run(() => onAccept(invitation.id))}
        >
          {busy ? "Working…" : "Join group"} <ArrowUpRight size={14} />
        </button>
        <button
          type="button"
          className="announcement-decline"
          disabled={busy}
          onClick={() => void run(() => onDecline(invitation.id))}
        >
          Decline
        </button>
      </div>
      <button
        type="button"
        className="announcement-close"
        onClick={() => onDismiss(invitation.id)}
        aria-label="Dismiss announcement"
      >
        <X size={15} />
      </button>
    </div>
  );
}
