import { X } from "lucide-react";
import type { GroupInvitation, NotificationItem } from "../lib/api";

export function Notifications({
  notifications,
  invitations,
  onClose,
  onAction,
  onAccept,
  onDecline,
}: {
  notifications: NotificationItem[];
  invitations: GroupInvitation[];
  onClose: () => void;
  onAction: (message: string) => void;
  onAccept: (id: number) => Promise<void>;
  onDecline: (id: number) => Promise<void>;
}) {
  const pending = invitations.filter((item) => item.status === "pending");
  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div
        className="notification-popover"
        role="dialog"
        aria-label="Notifications"
      >
        <div className="popover-heading">
          <span className="muted-label">NOTIFICATIONS</span>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close notifications"
          >
            <X size={15} />
          </button>
        </div>
        {pending.map((item) => (
          <div className="popover-invite" key={`invite-${item.id}`}>
            <span className="popover-invite-copy">
              <strong>{item.group_name}</strong>
              <small>{item.inviter_name} invited you</small>
            </span>
            <span className="popover-invite-actions">
              <button
                className="secondary-button small"
                onClick={() => void onAccept(item.id)}
              >
                Join
              </button>
              <button
                className="text-button"
                onClick={() => void onDecline(item.id)}
              >
                Decline
              </button>
            </span>
          </div>
        ))}
        {notifications.map((item) => (
          <button
            className="popover-row"
            key={item.id}
            onClick={() => onAction(item.title)}
          >
            {item.title}
            <small>{item.body}</small>
          </button>
        ))}
        {pending.length === 0 && notifications.length === 0 && (
          <small className="popover-empty">
            No new notifications or invitations.
          </small>
        )}
      </div>
    </>
  );
}
