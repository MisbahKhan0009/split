import {
  ArrowUpRight,
  LayoutDashboard,
  MessageCircle,
  Plus,
  Search,
} from "lucide-react";
import type { View } from "../types";

export function CommandPalette({
  onClose,
  onNavigate,
  onAddExpense,
}: {
  onClose: () => void;
  onNavigate: (view: View) => void;
  onAddExpense: () => void;
}) {
  const actions = [
    {
      label: "Open overview",
      icon: <LayoutDashboard size={16} />,
      action: () => onNavigate("overview"),
    },
    {
      label: "Open messages",
      icon: <MessageCircle size={16} />,
      action: () => onNavigate("chat"),
    },
    { label: "Add expense", icon: <Plus size={16} />, action: onAddExpense },
  ];
  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div
        className="command-palette"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="palette-search">
          <Search size={17} />
          <input autoFocus placeholder="Jump to anything…" />
        </div>
        {actions.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              item.action();
              onClose();
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            <ArrowUpRight size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}
