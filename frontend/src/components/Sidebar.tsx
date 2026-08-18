import {
  Activity,
  CalendarDays,
  Check,
  ChevronDown,
  Command,
  FileText,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Receipt,
  Repeat,
  Split,
  Sparkles,
  Target,
  Users,
  WalletCards,
} from "lucide-react";
import type { Group, View } from "../types";
import type { AuthUser, ProfileDTO } from "../lib/api";
import { money } from "../data/demoData";
import { Avatar } from "./Avatar";
import { AccountMenu } from "./AccountMenu";
import { NavButton } from "./NavButton";

export function Sidebar({
  activeView,
  onNavigate,
  onLanding,
  activeGroup,
  availableGroups,
  groupMenuOpen,
  onToggleGroupMenu,
  onGroupChange,
  onCreateGroup,
  onOpenInvite,
  onOpenPalette,
  profileImage,
  profile,
  accountMenuOpen,
  onToggleAccountMenu,
  onOpenSettings,
  onToggleTheme,
  onSignOut,
  authUser,
}: {
  activeView: View;
  onNavigate: (view: View) => void;
  onLanding: () => void;
  activeGroup: Group;
  availableGroups: Group[];
  groupMenuOpen: boolean;
  onToggleGroupMenu: () => void;
  onGroupChange: (group: Group) => void;
  onCreateGroup: () => void;
  onOpenInvite: () => void;
  onOpenPalette: () => void;
  profileImage?: string;
  profile: ProfileDTO | null;
  accountMenuOpen: boolean;
  onToggleAccountMenu: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
  authUser: AuthUser | null;
}) {
  const accountInitials = (authUser?.display_name || "Account")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sidebar">
      <button type="button" className="brand app-brand" onClick={onLanding}>
        <span className="brand-mark">
          <Split size={17} />
        </span>
        <span>
          splitwise<span className="brand-plus">+</span>
        </span>
      </button>
      <div className="group-switcher-wrap">
        <button
          type="button"
          className="group-switcher"
          onClick={onToggleGroupMenu}
          aria-expanded={groupMenuOpen}
        >
          <span
            className="group-symbol"
            style={{ background: activeGroup.accent }}
          >
            {activeGroup.emoji}
          </span>
          <span>
            <small>ACTIVE GROUP</small>
            <strong>{activeGroup.name}</strong>
          </span>
          <ChevronDown size={15} />
        </button>
        {groupMenuOpen && (
          <div className="group-menu">
            {availableGroups.map((group) => (
              <button
                type="button"
                key={group.id}
                className={group.id === activeGroup.id ? "selected" : ""}
                onClick={() => onGroupChange(group)}
              >
                <span
                  className="group-symbol"
                  style={{ background: group.accent }}
                >
                  {group.emoji}
                </span>
                <span>
                  <strong>{group.name}</strong>
                  <small>
                    {group.members} members · {money(group.total)}
                  </small>
                </span>
                {group.id === activeGroup.id && <Check size={14} />}
              </button>
            ))}
            <div className="group-menu-actions">
              <button type="button" onClick={onCreateGroup}>
                <Plus size={14} /> New group
              </button>
              {activeGroup.id !== "none" && (
                <button type="button" onClick={onOpenInvite}>
                  <Users size={14} /> Invite people
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <nav className="side-nav">
        <span className="nav-section">Workspace</span>
        <NavButton
          icon={<LayoutDashboard size={17} />}
          label="Dashboard"
          active={activeView === "dashboard"}
          onClick={() => onNavigate("dashboard")}
        />
        <NavButton
          icon={<Receipt size={17} />}
          label="Expenses"
          active={activeView === "expenses"}
          onClick={() => onNavigate("expenses")}
        />
        <NavButton
          icon={<WalletCards size={17} />}
          label="Settle up"
          active={activeView === "settle"}
          onClick={() => onNavigate("settle")}
        />
        <NavButton
          icon={<CalendarDays size={17} />}
          label="Plan"
          active={activeView === "plan"}
          onClick={() => onNavigate("plan")}
        />
        <NavButton
          icon={<MessageCircle size={17} />}
          label="Messages"
          active={activeView === "chat"}
          onClick={() => onNavigate("chat")}
        />
        <span className="nav-section space-top">Manage</span>
        <NavButton
          icon={<Target size={17} />}
          label="Budgets"
          active={activeView === "budgets"}
          onClick={() => onNavigate("budgets")}
        />
        <NavButton
          icon={<Repeat size={17} />}
          label="Recurring"
          active={activeView === "recurring"}
          onClick={() => onNavigate("recurring")}
        />
        <NavButton
          icon={<FileText size={17} />}
          label="Documents"
          active={activeView === "documents"}
          onClick={() => onNavigate("documents")}
        />
        <NavButton
          icon={<Activity size={17} />}
          label="Activity"
          active={activeView === "activity"}
          onClick={() => onNavigate("activity")}
        />
        <NavButton
          icon={<Sparkles size={17} />}
          label="Quick access"
          active={activeView === "quick-access"}
          onClick={() => onNavigate("quick-access")}
        />
      </nav>
      <div className="sidebar-bottom">
        <button type="button" className="command-hint" onClick={onOpenPalette}>
          <Command size={14} />
          <span>Quick actions</span>
          <kbd>⌘ K</kbd>
        </button>
        <button
          type="button"
          className="profile profile-button"
          onClick={onToggleAccountMenu}
          aria-expanded={accountMenuOpen}
        >
          <Avatar
            member={{ initials: accountInitials, color: "#b7f36b" }}
            avatarUrl={profileImage}
          />
          <span>
            <strong>{authUser?.display_name || "Account"}</strong>
            <small>{authUser ? "Signed in account" : "Account"}</small>
          </span>
          <MoreHorizontal size={16} />
        </button>
        {accountMenuOpen && (
          <AccountMenu
            profile={profile}
            onOpenSettings={onOpenSettings}
            onToggleTheme={onToggleTheme}
            onSignOut={onSignOut}
          />
        )}
      </div>
    </aside>
  );
}
