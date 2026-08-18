import { ReactElement } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  MessageCircle,
  Receipt,
  WalletCards,
} from "lucide-react";
import type { View } from "../types";

export function NavButton({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: ReactElement;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      className={`nav-button ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {badge && <b>{badge}</b>}
    </button>
  );
}
export function NavIcon({ view }: { view: View }) {
  return view === "overview" ? (
    <LayoutDashboard size={17} />
  ) : view === "expenses" ? (
    <Receipt size={17} />
  ) : view === "settle" ? (
    <WalletCards size={17} />
  ) : view === "plan" ? (
    <CalendarDays size={17} />
  ) : (
    <MessageCircle size={17} />
  );
}
