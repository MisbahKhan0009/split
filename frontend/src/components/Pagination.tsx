import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPrev,
  onNext,
  onGoTo,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (page: number) => void;
}) {
  if (total === 0 || pageCount <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Keep the page-number strip short: current page, its neighbors, and the
  // first/last page, with an ellipsis marker for any gap in between.
  const pageNumbers: (number | "ellipsis")[] = [];
  for (let index = 1; index <= pageCount; index += 1) {
    const isEdge = index === 1 || index === pageCount;
    const isNearCurrent = Math.abs(index - page) <= 1;
    if (isEdge || isNearCurrent) pageNumbers.push(index);
    else if (pageNumbers[pageNumbers.length - 1] !== "ellipsis")
      pageNumbers.push("ellipsis");
  }

  return (
    <div className="pagination-bar">
      <small className="pagination-summary">
        Showing {start}–{end} of {total}
      </small>
      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-nav"
          onClick={onPrev}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>
        {pageNumbers.map((entry, index) =>
          entry === "ellipsis" ? (
            <span className="pagination-ellipsis" key={`ellipsis-${index}`}>
              …
            </span>
          ) : (
            <button
              type="button"
              key={entry}
              className={`pagination-page ${entry === page ? "active" : ""}`}
              onClick={() => onGoTo(entry)}
              aria-current={entry === page}
            >
              {entry}
            </button>
          ),
        )}
        <button
          type="button"
          className="pagination-nav"
          onClick={onNext}
          disabled={page === pageCount}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
