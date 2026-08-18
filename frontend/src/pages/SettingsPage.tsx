import React, { FormEvent, useEffect, useRef, useState } from "react";
import {
  Activity,
  Check,
  Image,
  LogIn,
  Palette,
  UserRound,
} from "lucide-react";
import {
  api,
  type AccountActivityItem,
  type AccountSession,
  type AuthUser,
  type ProfileDTO,
} from "../lib/api";
import { Avatar } from "../components/Avatar";

export function SettingsPage({
  authUser,
  profile,
  profileImage,
  theme,
  onProfileSaved,
  onAvatarUpload,
  onThemeChange,
  onSignOut,
}: {
  authUser: AuthUser;
  profile: ProfileDTO | null;
  profileImage?: string;
  theme: "dark" | "light";
  onProfileSaved: (
    payload: Partial<Pick<ProfileDTO, "bio" | "status" | "theme">>,
  ) => Promise<void>;
  onAvatarUpload: (file: File) => Promise<void>;
  onThemeChange: (theme: "dark" | "light") => void;
  onSignOut: () => void | Promise<void>;
}) {
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [status, setStatus] = useState(profile?.status ?? "Available");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activityItems, setActivityItems] = useState<AccountActivityItem[]>([]);
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [accountDataLoading, setAccountDataLoading] = useState(true);
  const [accountDataError, setAccountDataError] = useState("");
  const [sessionAction, setSessionAction] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const initials =
    profile?.initials ||
    authUser.display_name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  useEffect(() => {
    setBio(profile?.bio ?? "");
    setStatus(profile?.status ?? "Available");
  }, [profile?.bio, profile?.status]);

  const loadAccountData = async () => {
    setAccountDataLoading(true);
    setAccountDataError("");
    try {
      const [nextActivity, nextSessions] = await Promise.all([
        api.accountActivity(),
        api.accountSessions(),
      ]);
      setActivityItems(nextActivity);
      setSessions(nextSessions);
    } catch (requestError) {
      setAccountDataError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load account activity.",
      );
    } finally {
      setAccountDataLoading(false);
    }
  };

  useEffect(() => {
    void loadAccountData();
  }, []);

  const revokeSession = async (sessionId: string, current: boolean) => {
    setSessionAction(sessionId);
    try {
      if (current) {
        await onSignOut();
        return;
      }
      await api.revokeSession(sessionId);
      await loadAccountData();
    } catch (requestError) {
      window.alert(
        requestError instanceof Error
          ? requestError.message
          : "Could not revoke this session.",
      );
    } finally {
      setSessionAction("");
    }
  };

  const revokeOtherSessions = async () => {
    setSessionAction("all");
    try {
      await api.revokeAllSessions();
      await loadAccountData();
    } catch (requestError) {
      window.alert(
        requestError instanceof Error
          ? requestError.message
          : "Could not revoke other sessions.",
      );
    } finally {
      setSessionAction("");
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onProfileSaved({
        bio: bio.trim(),
        status: status.trim() || "Available",
      });
    } catch (requestError) {
      window.alert(
        requestError instanceof Error
          ? requestError.message
          : "Could not save your profile settings.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("Choose an image file for your profile picture.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert("Profile pictures must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      await onAvatarUpload(file);
    } catch (requestError) {
      window.alert(
        requestError instanceof Error
          ? requestError.message
          : "Could not upload your profile picture.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="page-section settings-page">
      <div className="page-header settings-header">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> ACCOUNT SETTINGS
          </div>
          <h1>Make this workspace yours.</h1>
          <p>Update your profile, appearance, and account preferences.</p>
        </div>
        <span className="settings-security-note">
          <Check size={14} /> Changes save to your account
        </span>
      </div>
      <div className="settings-grid">
        <form className="glass-card settings-card" onSubmit={saveProfile}>
          <div className="section-heading">
            <div>
              <span className="muted-label">PROFILE</span>
              <h2>Your presence</h2>
            </div>
          </div>
          <div className="settings-profile-hero">
            <button
              type="button"
              className="settings-avatar-button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Upload profile picture"
            >
              <Avatar
                member={{ initials, color: "#b7f36b" }}
                size="lg"
                avatarUrl={profileImage}
              />
              <span className="settings-avatar-badge">
                <Image size={13} />
              </span>
            </button>
            <div>
              <strong>{authUser.display_name}</strong>
              <small>@{authUser.username}</small>
              <button
                type="button"
                className="text-button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Change profile picture"}
              </button>
            </div>
          </div>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleUpload}
          />
          <label className="field-label">
            Status
            <input
              value={status}
              maxLength={80}
              onChange={(event) => setStatus(event.target.value)}
              placeholder="Available"
            />
          </label>
          <label className="field-label">
            About you
            <textarea
              value={bio}
              maxLength={240}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell your group a little about you"
              rows={4}
            />
          </label>
          <div className="settings-form-footer">
            <small>{bio.length}/240 characters</small>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
        <div className="settings-column">
          <div className="glass-card settings-card">
            <div className="section-heading">
              <div>
                <span className="muted-label">APPEARANCE</span>
                <h2>Theme</h2>
              </div>
              <Palette size={18} />
            </div>
            <p className="settings-description">
              Choose the workspace appearance used across your signed-in
              sessions.
            </p>
            <div className="theme-options">
              {(["dark", "light"] as const).map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`theme-option ${theme === option ? "selected" : ""}`}
                  onClick={() => onThemeChange(option)}
                >
                  <span className={`theme-preview ${option}`} />
                  <span>
                    <strong>
                      {option === "dark" ? "Dark glass" : "Light glass"}
                    </strong>
                    <small>
                      {theme === option ? "Active" : "Use this theme"}
                    </small>
                  </span>
                  {theme === option && <Check size={15} />}
                </button>
              ))}
            </div>
          </div>
          <div className="glass-card settings-card account-details-card">
            <div className="section-heading">
              <div>
                <span className="muted-label">SECURITY</span>
                <h2>Active sessions</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => void loadAccountData()}
                title="Refresh sessions"
              >
                <Activity size={16} />
              </button>
            </div>
            <p className="settings-description">
              Review where your account is signed in and revoke anything
              unfamiliar.
            </p>
            {accountDataError && (
              <p className="settings-inline-error">{accountDataError}</p>
            )}
            {accountDataLoading ? (
              <p className="settings-empty-state">Loading active sessions…</p>
            ) : sessions.length ? (
              <div className="session-list">
                {sessions.map((session) => (
                  <div className="session-row" key={session.id}>
                    <div className="session-icon">
                      <UserRound size={16} />
                    </div>
                    <div className="session-copy">
                      <strong>
                        {session.device_label}
                        {session.is_current ? " · This device" : ""}
                      </strong>
                      <small>
                        Last active{" "}
                        {new Date(session.last_seen_at).toLocaleString(
                          "en-BD",
                          { dateStyle: "medium", timeStyle: "short" },
                        )}
                      </small>
                      <small>{session.ip_address || "IP unavailable"}</small>
                    </div>
                    <button
                      type="button"
                      className="text-button session-revoke-button"
                      disabled={sessionAction === session.id}
                      onClick={() =>
                        void revokeSession(session.id, session.is_current)
                      }
                    >
                      {sessionAction === session.id
                        ? "Revoking…"
                        : session.is_current
                          ? "Sign out"
                          : "Revoke"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="settings-empty-state">No active sessions found.</p>
            )}
            {sessions.some((session) => !session.is_current) && (
              <button
                type="button"
                className="outline-button settings-wide-button"
                disabled={sessionAction === "all"}
                onClick={() => void revokeOtherSessions()}
              >
                {sessionAction === "all"
                  ? "Revoking…"
                  : "Revoke all other sessions"}
              </button>
            )}
          </div>
          <div className="glass-card settings-card account-details-card">
            <div className="section-heading">
              <div>
                <span className="muted-label">ACCOUNT</span>
                <h2>Account details</h2>
              </div>
              <UserRound size={18} />
            </div>
            <div className="settings-detail-row">
              <span>Name</span>
              <strong>{authUser.display_name}</strong>
            </div>
            <div className="settings-detail-row">
              <span>Username</span>
              <strong>@{authUser.username}</strong>
            </div>
            <div className="settings-detail-row">
              <span>Email</span>
              <strong>{authUser.email || "Not added"}</strong>
            </div>
            <p className="settings-description">
              Your account identity is managed through the secure sign-in flow.
            </p>
          </div>
          <div className="glass-card settings-card account-details-card">
            <div className="section-heading">
              <div>
                <span className="muted-label">AUDIT TRAIL</span>
                <h2>Recent activity</h2>
              </div>
              <Activity size={18} />
            </div>
            <p className="settings-description">
              A private record of sign-ins, profile changes, and session
              actions.
            </p>
            {accountDataLoading ? (
              <p className="settings-empty-state">Loading activity…</p>
            ) : activityItems.length ? (
              <div className="activity-log-list">
                {activityItems.slice(0, 8).map((item) => (
                  <div className="settings-activity-row" key={item.id}>
                    <span className="activity-log-dot" />
                    <div>
                      <strong>{item.description}</strong>
                      <small>
                        {item.device_label} ·{" "}
                        {new Date(item.created_at).toLocaleString("en-BD", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="settings-empty-state">
                No account activity has been recorded yet.
              </p>
            )}
          </div>
          <div className="glass-card settings-card danger-card">
            <div>
              <span className="muted-label">SESSION</span>
              <h2>Sign out everywhere</h2>
              <p className="settings-description">
                End this browser session and return to the public landing page.
              </p>
            </div>
            <button
              type="button"
              className="outline-button danger-button"
              onClick={onSignOut}
            >
              <LogIn size={15} /> Sign out
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
