import { useEffect, useState } from "react";
import { ArrowUpRight, Copy, Users, X } from "lucide-react";
import type { Group } from "../types";
import { api, type DirectoryUser, type GroupInvitation } from "../lib/api";
import { Avatar } from "./Avatar";

export function InviteModal({
  group,
  invitations,
  currentUserId,
  onClose,
  onInvite,
  onAccept,
  onDecline,
  onToast,
}: {
  group: Group;
  invitations: GroupInvitation[];
  currentUserId: number;
  onClose: () => void;
  onInvite: (username: string) => Promise<void>;
  onAccept: (id: number) => Promise<void>;
  onDecline: (id: number) => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<DirectoryUser[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void api
        .directoryUsers(search)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  const invite = async (username: string) => {
    setBusy(true);
    try {
      await onInvite(username);
      setSearch("");
      setSuggestions([]);
      onToast(`Invitation sent to @${username}.`);
    } catch (requestError) {
      onToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not send invitation.",
      );
    } finally {
      setBusy(false);
    }
  };
  const copyLink = async (token: string) => {
    await navigator.clipboard?.writeText(
      `${window.location.origin}/?invite=${token}`,
    );
    onToast(
      "Invitation link copied. The invited user must sign in as the matching username.",
    );
  };
  return (
    <div className="auth-backdrop" onClick={onClose}>
      <section
        className="auth-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="auth-close icon-button" onClick={onClose}>
          <X size={17} />
        </button>
        <div className="auth-mark">
          <Users size={19} />
        </div>
        <span className="muted-label">GROUP INVITATIONS</span>
        <h2>Invite to {group.name}</h2>
        <p className="auth-subtitle">
          Search every active SplitWise+ account by username. Invitations are
          delivered to the recipient’s inbox.
        </p>
        <label>
          Search username
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="tisha_bd"
            autoComplete="off"
          />
        </label>
        {suggestions.length > 0 && (
          <div className="invite-suggestions">
            {suggestions.map((user) => (
              <button key={user.id} onClick={() => void invite(user.username)}>
                <Avatar
                  member={{ initials: user.initials, color: "#8dd8ff" }}
                  size="sm"
                  avatarUrl={user.avatar ?? undefined}
                />
                <span>
                  <strong>{user.display_name}</strong>
                  <small>@{user.username}</small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
        )}
        <div className="invite-list">
          <span className="muted-label">YOUR INVITATIONS</span>
          {invitations.length === 0 && <small>No invitations yet.</small>}
          {invitations.map((item) => {
            // Only the invited account can respond; the sender gets the share link.
            const isRecipient = item.invitee === currentUserId;
            return (
              <div className="invite-row" key={item.id}>
                <span className="invite-row-copy">
                  <strong>{item.group_name}</strong>
                  <small>
                    {isRecipient
                      ? `${item.inviter_name} invited you`
                      : `You invited @${item.invitee_username}`}
                    {" · "}
                    {item.status}
                  </small>
                </span>
                {item.status === "pending" &&
                  (isRecipient ? (
                    <span className="invite-row-actions">
                      <button
                        className="secondary-button small"
                        onClick={() => void onAccept(item.id)}
                      >
                        Accept
                      </button>
                      <button
                        className="text-button"
                        onClick={() => void onDecline(item.id)}
                      >
                        Decline
                      </button>
                    </span>
                  ) : (
                    <button
                      className="icon-button"
                      onClick={() => void copyLink(item.token)}
                      title="Copy invitation link"
                    >
                      <Copy size={15} />
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
        <button className="secondary-button" onClick={onClose}>
          Done
        </button>
      </section>
    </div>
  );
}
