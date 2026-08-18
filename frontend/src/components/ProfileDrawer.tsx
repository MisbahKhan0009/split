import { useRef } from "react";
import { Image, MessageCircle, X } from "lucide-react";
import type { Member } from "../types";
import { Avatar } from "./Avatar";

export function ProfileDrawer({
  member,
  isSelf,
  avatarUrl,
  onClose,
  onMessage,
  onAvatarChange,
}: {
  member: Member;
  isSelf: boolean;
  avatarUrl?: string;
  onClose: () => void;
  onMessage: () => void;
  onAvatarChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const avatar = <Avatar member={member} size="lg" avatarUrl={avatarUrl} />;
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="profile-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="icon-button drawer-close" onClick={onClose}>
          <X size={17} />
        </button>
        <div className="profile-hero">
          {isSelf ? (
            <button
              className="profile-avatar-button"
              onClick={() => fileRef.current?.click()}
            >
              {avatar}
              <span>
                <Image size={13} />
              </span>
            </button>
          ) : (
            <div className="profile-avatar-button">{avatar}</div>
          )}
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onAvatarChange(URL.createObjectURL(file));
            }}
          />
          <h2>{member.name}</h2>
          <p>{member.profile.status}</p>
        </div>
        <div className="profile-copy">
          <span className="muted-label">ABOUT</span>
          <p>{member.profile.bio}</p>
          <div className="profile-stat">
            <span>Profile picture</span>
            <strong>
              {isSelf ? "Tap avatar to update" : "Visible to group"}
            </strong>
          </div>
        </div>
        <div className="profile-actions">
          {!isSelf && (
            <button className="primary-button" onClick={onMessage}>
              <MessageCircle size={15} /> Message privately
            </button>
          )}
          {isSelf && (
            <button
              className="secondary-button"
              onClick={() => fileRef.current?.click()}
            >
              <Image size={15} /> Update profile picture
            </button>
          )}
          <button className="outline-button" onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
