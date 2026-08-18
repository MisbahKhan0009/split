import {
  ArrowUpRight,
  Activity,
  Bell,
  LayoutDashboard,
  Plus,
  Users,
  WalletCards,
} from "lucide-react";
import type { View } from "../types";
import type { UserDashboard } from "../lib/api";
import { money } from "../data/demoData";

export function UserDashboardView({
  dashboard,
  dashboardUpdatedAt,
  onCreateGroup,
  onNavigate,
}: {
  dashboard: UserDashboard | null;
  dashboardUpdatedAt: Date | null;
  onCreateGroup: () => void;
  onNavigate: (view: View) => void;
}) {
  if (!dashboard)
    return (
      <section className="page-header">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> PERSONAL DASHBOARD
          </div>
          <h1>Loading your overview…</h1>
          <p>
            Pulling your current balances, activity, and groups from Django.
          </p>
        </div>
      </section>
    );
  const hasGroups = dashboard.group_count > 0;
  const groupSpend = dashboard.groups.map((group) => ({
    label: group.name,
    value: Number(group.total_spend),
  }));
  const position = [
    { label: "Paid", value: Number(dashboard.paid_total) },
    { label: "Share", value: Number(dashboard.owed_total) },
    { label: "To pay", value: Number(dashboard.pending_to_pay) },
    { label: "To receive", value: Number(dashboard.pending_to_receive) },
  ];
  return (
    <section className="user-dashboard">
      <div className="page-header">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> PERSONAL DASHBOARD
          </div>
          <h1>
            Hi,{" "}
            {dashboard.user.first_name ||
              dashboard.user.display_name.split(" ")[0]}
            .
          </h1>
          <p>
            Your personal view of shared money, balances, and group activity.
          </p>
          <small className="dashboard-sync-status">
            <span className="live-dot" /> Backend synced{" "}
            {dashboardUpdatedAt
              ? dashboardUpdatedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "just now"}{" "}
            · refreshes every 10s
          </small>
        </div>
        <button
          className="outline-button"
          onClick={() => onNavigate("overview")}
          disabled={!hasGroups}
        >
          <LayoutDashboard size={15} /> Current workspace
        </button>
      </div>
      {!hasGroups ? (
        <>
          <div className="glass-card dashboard-empty">
            <div className="auth-mark">
              <Users size={20} />
            </div>
            <span className="muted-label">YOUR SHARED MONEY STARTS HERE</span>
            <h2>No groups yet.</h2>
            <p>
              You are not automatically added to any group. Create your first
              group or accept an invitation from your inbox when someone invites
              you.
            </p>
            <button className="primary-button" onClick={onCreateGroup}>
              <Plus size={16} /> Create your first group
            </button>
          </div>
          <div className="dashboard-chart-grid">
            <DashboardBarChart
              title="Shared spend by group"
              subtitle="Your group totals will appear here"
              data={[]}
              currency="৳"
            />
            <DashboardBarChart
              title="Money position"
              subtitle="Your paid, shared, and settlement totals"
              data={position}
              currency="৳"
            />
          </div>
        </>
      ) : (
        <>
          <div className="insight-grid dashboard-insights">
            <div className="glass-card insight-card">
              <span className="muted-label">TOTAL SHARED SPEND</span>
              <strong>{money(Number(dashboard.total_spend))}</strong>
              <small>
                {dashboard.expense_count} expenses across{" "}
                {dashboard.group_count} groups
              </small>
            </div>
            <div className="glass-card insight-card">
              <span className="muted-label">YOU PAID</span>
              <strong>{money(Number(dashboard.paid_total))}</strong>
              <small>recorded payments</small>
            </div>
            <div className="glass-card insight-card">
              <span className="muted-label">YOUR SHARE</span>
              <strong>{money(Number(dashboard.owed_total))}</strong>
              <small>your participant shares</small>
            </div>
            <div className="glass-card insight-card">
              <span className="muted-label">TO SETTLE</span>
              <strong>{money(Number(dashboard.pending_to_pay))}</strong>
              <small>
                {money(Number(dashboard.pending_to_receive))} coming back to you
              </small>
            </div>
          </div>
          <div className="dashboard-chart-grid">
            <DashboardBarChart
              title="Shared spend by group"
              subtitle="Live totals from your groups"
              data={groupSpend}
              currency="৳"
            />
            <DashboardBarChart
              title="Money position"
              subtitle="Current user-level finance snapshot"
              data={position}
              currency="৳"
            />
          </div>
          <div className="dashboard-grid">
            <div className="glass-card dashboard-section">
              <div className="section-heading">
                <div>
                  <span className="muted-label">YOUR GROUPS</span>
                  <h2>Shared spaces</h2>
                </div>
                <button className="text-button" onClick={onCreateGroup}>
                  <Plus size={15} /> New group
                </button>
              </div>
              {dashboard.groups.map((group) => (
                <div className="connected-list-row" key={group.id}>
                  <span>
                    <b>{group.emoji}</b> {group.name}
                    <small>
                      {group.member_count} members ·{" "}
                      {group.total_spend === "0"
                        ? "No spend yet"
                        : money(Number(group.total_spend))}
                    </small>
                  </span>
                  <button
                    className="text-button"
                    onClick={() => onNavigate("overview")}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="glass-card dashboard-section">
              <div className="section-heading">
                <div>
                  <span className="muted-label">YOUR ATTENTION</span>
                  <h2>Next steps</h2>
                </div>
              </div>
              <div className="dashboard-next-step">
                <Bell size={17} />
                <span>
                  <strong>{dashboard.unread_notifications}</strong> unread
                  notifications
                </span>
              </div>
              <div className="dashboard-next-step">
                <Users size={17} />
                <span>
                  <strong>{dashboard.pending_invitations}</strong> pending
                  invitations
                </span>
              </div>
              <div className="dashboard-next-step">
                <WalletCards size={17} />
                <span>
                  <strong>{money(Number(dashboard.pending_to_pay))}</strong>{" "}
                  waiting to settle
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function DashboardBarChart({
  title,
  subtitle,
  data,
  currency,
}: {
  title: string;
  subtitle: string;
  data: { label: string; value: number }[];
  currency: string;
}) {
  const hasValue = data.some((item) => item.value > 0);
  const max = Math.max(...data.map((item) => item.value), 1);
  const points = data.length ? data : [{ label: "No data", value: 0 }];
  return (
    <div className="glass-card dashboard-chart">
      <div className="section-heading">
        <div>
          <span className="muted-label">CHART</span>
          <h2>{title}</h2>
          <small>{subtitle}</small>
        </div>
        <span className="chart-total">
          {currency}
          {Math.round(
            data.reduce((sum, item) => sum + item.value, 0),
          ).toLocaleString()}
        </span>
      </div>
      <div className="chart-area">
        <div className="chart-y-axis">
          <span>
            {currency}
            {Math.round(max).toLocaleString()}
          </span>
          <span>
            {currency}
            {Math.round(max / 2).toLocaleString()}
          </span>
          <span>{currency}0</span>
        </div>
        <div className="chart-plot">
          <div className="chart-gridline top" />
          <div className="chart-gridline middle" />
          <div className="chart-gridline baseline" />{" "}
          <div className="chart-bars">
            {points.map((item) => (
              <div className="chart-column" key={item.label}>
                <div
                  className={`chart-bar ${item.value === 0 ? "zero" : ""}`}
                  style={{
                    height: `${Math.max((item.value / max) * 100, item.value === 0 ? 2 : 6)}%`,
                  }}
                  title={`${item.label}: ${currency}${item.value.toLocaleString()}`}
                >
                  <span>
                    {item.value > 0
                      ? `${currency}${Math.round(item.value).toLocaleString()}`
                      : "0"}
                  </span>
                </div>
                <small>
                  {item.label.length > 12
                    ? `${item.label.slice(0, 12)}…`
                    : item.label}
                </small>
              </div>
            ))}
          </div>
        </div>
      </div>
      {!hasValue && (
        <div className="chart-empty-note">
          <Activity size={13} /> No recorded amounts yet. The axes are ready for
          your first shared transaction.
        </div>
      )}
    </div>
  );
}
