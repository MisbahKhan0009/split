import { Bell, Plus, Search, Sun, Zap } from "lucide-react";
import type { Group } from "../types";

export function Topbar({
  activeGroup,
  query,
  setQuery,
  onOpenInvite,
  onNotifications,
  onTheme,
  theme,
  alertCount,
}: {
  activeGroup: Group;
  query: string;
  setQuery: (value: string) => void;
  onOpenInvite: () => void;
  onNotifications: () => void;
  onTheme: () => void;
  theme: string;
  alertCount: number;
}) {
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>Groups</span>
        <b>/</b>
        <strong>{activeGroup.name}</strong>
      </div>
      <div className="topbar-actions">
        <label className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search anything"
          />
          <kbd>⌘ K</kbd>
        </label>
        <button
          className="icon-button theme-toggle"
          onClick={onTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={17} /> : <Zap size={17} />}
        </button>
        <button
          className="icon-button notification-button"
          onClick={onNotifications}
          aria-label={
            alertCount > 0
              ? `Open notifications, ${alertCount} unread`
              : "Open notifications"
          }
        >
          <Bell size={17} />
          {alertCount > 0 && <i />}
        </button>
        {activeGroup.id !== "none" && (
          <button className="invite-button" onClick={onOpenInvite}>
            <Plus size={16} /> Invite
          </button>
        )}
      </div>
    </header>
  );
}
