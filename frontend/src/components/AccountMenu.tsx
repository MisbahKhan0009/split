import { ChevronDown, LogIn, Settings2, Sun } from "lucide-react";
import type { ProfileDTO } from "../lib/api";

export function AccountMenu({
  profile,
  onOpenSettings,
  onToggleTheme,
  onSignOut,
}: {
  profile: ProfileDTO | null;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
}) {
  const isLight = profile?.theme === "light";
  return (
    <div className="account-menu" role="menu">
      <div className="account-menu-heading">
        <span className="muted-label">ACCOUNT</span>
        <small>{profile?.status || "Available"}</small>
      </div>
      <button type="button" onClick={onToggleTheme}>
        <Sun size={15} />
        <span>{isLight ? "Use dark theme" : "Use light theme"}</span>
        <span className="menu-value">{isLight ? "Light" : "Dark"}</span>
      </button>
      <button type="button" onClick={onOpenSettings}>
        <Settings2 size={15} />
        <span>Settings</span>
        <ChevronDown size={14} className="menu-chevron" />
      </button>
      <div className="account-menu-divider" />
      <button type="button" className="account-menu-danger" onClick={onSignOut}>
        <LogIn size={15} />
        <span>Sign out</span>
      </button>
    </div>
  );
}
