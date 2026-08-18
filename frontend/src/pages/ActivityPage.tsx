import { Activity as ActivityIcon, ArrowUpRight } from "lucide-react";
import type { ActivityItem, Group } from "../types";
import { Avatar } from "../components/Avatar";
import { usePagination } from "../lib/usePagination";
import { Pagination } from "../components/Pagination";

export function ActivityPage({
  activeGroup,
  activity,
}: {
  activeGroup: Group;
  activity: ActivityItem[];
}) {
  const {
    pageItems,
    page,
    pageCount,
    total,
    pageSize,
    nextPage,
    prevPage,
    goTo,
  } = usePagination(activity, 15);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> GROUP HISTORY
          </div>
          <h1>
            Activity <span className="count-pill">{activity.length}</span>
          </h1>
          <p>
            {activeGroup.name} · every expense, invite, and decision, in order.
          </p>
        </div>
      </div>
      <div className="activity-card glass-card activity-page-list">
        {activity.length ? (
          pageItems.map((item) => (
            <div className="activity-row" key={item.id}>
              <Avatar
                member={{ initials: item.initials, color: item.color }}
                size="sm"
              />
              <span>
                <strong>{item.member}</strong> {item.action}{" "}
                <b>{item.target}</b>
                <small>{item.time}</small>
              </span>
              <ArrowUpRight size={15} className="activity-row-marker" />
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <ActivityIcon size={22} />
            </div>
            <h3>No activity yet.</h3>
            <p>
              New expenses, messages, invitations, and decisions will appear
              here as your group uses the workspace.
            </p>
          </div>
        )}
      </div>
      <Pagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        onPrev={prevPage}
        onNext={nextPage}
        onGoTo={goTo}
      />
    </>
  );
}
