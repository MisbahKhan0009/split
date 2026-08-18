import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Plus,
  Paperclip,
  Receipt,
  Sparkles,
  Split,
  Users,
  WalletCards,
  X,
  FileText,
} from "lucide-react";
import type { Expense } from "../types";
import { memberColors, money } from "../data/demoData";
import { Avatar } from "./Avatar";

type MemberOption = {
  user_id: number;
  name: string;
  initials: string;
  role: string;
};

type SplitMode = "Equal" | "Exact" | "Percentage";

export function ExpenseModal({
  onClose,
  onSave,
  memberOptions,
  currentUserId,
}: {
  onClose: () => void;
  onSave: (expense: Expense) => void;
  memberOptions: MemberOption[];
  currentUserId: number;
}) {
  const people: MemberOption[] = memberOptions.length
    ? memberOptions
    : [
        { user_id: -1, name: "Rafi", initials: "RF", role: "member" },
        { user_id: -2, name: "Tisha", initials: "TS", role: "member" },
        { user_id: -3, name: "Nabil", initials: "NB", role: "member" },
        { user_id: -4, name: "Mahi", initials: "MH", role: "member" },
      ];
  // Every member gets a stable color from the shared palette, keyed by their
  // position in the group so it matches the color used elsewhere for them.
  const colorFor = (userId: number) => {
    const index = people.findIndex((person) => person.user_id === userId);
    return memberColors[(index < 0 ? 0 : index) % memberColors.length];
  };

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [mode, setMode] = useState<SplitMode>("Equal");
  const [payerId, setPayerId] = useState(
    people.find((person) => person.user_id === currentUserId)?.user_id ??
      people[0]?.user_id,
  );
  const [payerMenuOpen, setPayerMenuOpen] = useState(false);
  const payerMenuRef = useRef<HTMLDivElement | null>(null);
  const todayIso = new Date().toISOString().slice(0, 10);
  const [occurredOn, setOccurredOn] = useState(todayIso);
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const [participantIds, setParticipantIds] = useState<number[]>(() =>
    people.map((person) => person.user_id),
  );
  // Manual entries for Exact/Percentage modes, keyed by user id.
  const [exactAmounts, setExactAmounts] = useState<Record<number, string>>({});
  const [percentages, setPercentages] = useState<Record<number, string>>({});

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        payerMenuRef.current &&
        !payerMenuRef.current.contains(event.target as Node)
      )
        setPayerMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const payer =
    people.find((person) => person.user_id === payerId) ?? people[0];
  const parsedAmount = Number(amount) || 0;
  const participants = people.filter((person) =>
    participantIds.includes(person.user_id),
  );
  const perPerson = parsedAmount / Math.max(participants.length, 1);

  const exactTotal = participants.reduce(
    (sum, person) => sum + (Number(exactAmounts[person.user_id]) || 0),
    0,
  );
  const percentageTotal = participants.reduce(
    (sum, person) => sum + (Number(percentages[person.user_id]) || 0),
    0,
  );

  const shareFor = (userId: number): number => {
    if (mode === "Equal") return perPerson;
    if (mode === "Exact") return Number(exactAmounts[userId]) || 0;
    return (parsedAmount * (Number(percentages[userId]) || 0)) / 100;
  };

  const splitIsValid =
    mode === "Equal"
      ? participants.length > 0
      : mode === "Exact"
        ? participants.length > 0 &&
          participants.every(
            (person) => Number(exactAmounts[person.user_id]) > 0,
          ) &&
          Math.abs(exactTotal - parsedAmount) < 0.01
        : participants.length > 0 &&
          participants.every(
            (person) => Number(percentages[person.user_id]) > 0,
          ) &&
          Math.abs(percentageTotal - 100) < 0.01;

  const canSave = title.trim().length > 1 && parsedAmount > 0 && splitIsValid;

  const categories = [
    { name: "Food", icon: "◒", hint: "Meals, coffee, snacks" },
    { name: "Stay", icon: "⌂", hint: "Hotels and rentals" },
    { name: "Transport", icon: "↗", hint: "Rides and tickets" },
    { name: "Activities", icon: "✦", hint: "Plans and experiences" },
  ];

  const toggleParticipant = (userId: number) =>
    setParticipantIds((current) =>
      current.includes(userId)
        ? current.filter((item) => item !== userId)
        : [...current, userId],
    );

  const changeMode = (nextMode: SplitMode) => {
    setMode(nextMode);
    if (nextMode === "Exact" && Object.keys(exactAmounts).length === 0) {
      // Seed with an even split so the fields aren't empty on first switch.
      const seeded: Record<number, string> = {};
      participants.forEach((person) => {
        seeded[person.user_id] = perPerson ? perPerson.toFixed(2) : "";
      });
      setExactAmounts(seeded);
    }
    if (nextMode === "Percentage" && Object.keys(percentages).length === 0) {
      const even = participants.length
        ? (100 / participants.length).toFixed(2)
        : "";
      const seeded: Record<number, string> = {};
      participants.forEach((person) => {
        seeded[person.user_id] = even;
      });
      setPercentages(seeded);
    }
  };

  return (
    <div
      className="modal-backdrop expense-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="expense-modal expense-modal-modern"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave || !payer) return;
          onSave({
            id: crypto.randomUUID(),
            title: title.trim(),
            category,
            amount: parsedAmount,
            payer: payer.name,
            date: new Date(`${occurredOn}T00:00:00`).toLocaleDateString(
              "en-BD",
              { day: "numeric", month: "short", year: "numeric" },
            ),
            occurredOn,
            note:
              note.trim() ||
              (mode === "Equal"
                ? "Split equally with the group"
                : `${mode} split`),
            receipt: Boolean(receiptFile),
            receiptFile: receiptFile ?? undefined,
            status: "Confirmed",
            splitMode:
              mode === "Equal"
                ? "equal"
                : mode === "Exact"
                  ? "exact"
                  : "percentage",
            backendPayerId: payer.user_id >= 0 ? payer.user_id : currentUserId,
            backendParticipants: participants.map((person, index) => {
              // Rounding each share to 2dp independently can leave the sum a
              // cent or two off the total (e.g. 100 / 3 -> 33.33 x3 = 99.99).
              // The backend requires equal/exact shares to sum exactly, so
              // the last participant absorbs the rounding remainder.
              const isLast = index === participants.length - 1;
              const roundedShare = Number(shareFor(person.user_id).toFixed(2));
              const shareSoFar = participants
                .slice(0, index)
                .reduce(
                  (sum, other) => sum + Number(shareFor(other.user_id).toFixed(2)),
                  0,
                );
              const shareAmount =
                mode !== "Percentage" && isLast
                  ? Number((parsedAmount - shareSoFar).toFixed(2))
                  : roundedShare;
              return {
                user: person.user_id >= 0 ? person.user_id : currentUserId,
                share_amount: shareAmount,
                share_value:
                  mode === "Percentage"
                    ? Number(percentages[person.user_id]) || 0
                    : 0,
              };
            }),
          });
        }}
      >
        <div className="expense-modal-head">
          <div className="expense-kicker">
            <span className="expense-kicker-dot" /> NEW SHARED EXPENSE
          </div>
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close expense modal"
          >
            <X size={18} />
          </button>
          <h2>Make the split feel easy.</h2>
          <p>Add one expense and we’ll keep the group balance clear.</p>
        </div>
        <div className="expense-modal-body">
          <div className="expense-form-column">
            <label className="expense-field expense-title-field">
              <span>What did you pay for?</span>
              <div className="expense-input-shell">
                <Receipt size={17} />
                <input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Dinner at Dhanmondi"
                />
              </div>
            </label>
            <div className="expense-two-col expense-three-col">
              <label className="expense-field">
                <span>Amount</span>
                <div className="expense-input-shell amount-shell">
                  <b>৳</b>
                  <input
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value.replace(/[^0-9.]/g, ""))
                    }
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </div>
              </label>
              <label className="expense-field">
                <span>Date</span>
                <div className="expense-input-shell">
                  <input
                    type="date"
                    value={occurredOn}
                    max={todayIso}
                    onChange={(event) =>
                      setOccurredOn(event.target.value || todayIso)
                    }
                  />
                </div>
              </label>
              <div className="expense-field">
                <span>Paid by</span>
                <div className="payer-picker" ref={payerMenuRef}>
                  <button
                    type="button"
                    className="expense-select-shell payer-trigger"
                    onClick={() => setPayerMenuOpen((value) => !value)}
                    aria-expanded={payerMenuOpen}
                  >
                    {payer && (
                      <Avatar
                        member={{
                          initials: payer.initials,
                          color: colorFor(payer.user_id),
                        }}
                        size="sm"
                      />
                    )}
                    <span className="payer-trigger-name">
                      {payer?.name ?? "Select payer"}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  {payerMenuOpen && (
                    <div className="payer-menu">
                      {people.map((person) => (
                        <button
                          type="button"
                          key={person.user_id}
                          className={
                            person.user_id === payerId ? "selected" : ""
                          }
                          onClick={() => {
                            setPayerId(person.user_id);
                            setPayerMenuOpen(false);
                          }}
                        >
                          <Avatar
                            member={{
                              initials: person.initials,
                              color: colorFor(person.user_id),
                            }}
                            size="sm"
                          />
                          <span>{person.name}</span>
                          {person.user_id === payerId && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="expense-section-label">
              <span>Choose a category</span>
              <small>Helps your group understand the spend</small>
            </div>
            <div className="expense-category-grid">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={`expense-category-choice ${category === item.name ? "selected" : ""}`}
                  onClick={() => setCategory(item.name)}
                >
                  <span>{item.icon}</span>
                  <strong>{item.name}</strong>
                  <small>{item.hint}</small>
                </button>
              ))}
            </div>
            <div className="expense-section-label">
              <span>Who is included?</span>
              <small>
                {participants.length} of {people.length} people selected
              </small>
            </div>
            <div className="participant-picker">
              {people.map((person) => {
                const selected = participantIds.includes(person.user_id);
                return (
                  <button
                    type="button"
                    key={person.user_id}
                    className={`participant-chip ${selected ? "selected" : ""}`}
                    onClick={() => toggleParticipant(person.user_id)}
                  >
                    <Avatar
                      member={{
                        initials: person.initials,
                        color: colorFor(person.user_id),
                      }}
                      size="sm"
                    />
                    <span>{person.name}</span>
                    {selected ? <Check size={13} /> : <Plus size={13} />}
                  </button>
                );
              })}
            </div>
            <div className="expense-section-label split-label">
              <span>How should this split?</span>
              <small>Change this later if the group decides differently</small>
            </div>
            <div className="split-mode-grid">
              {[
                {
                  name: "Equal" as SplitMode,
                  icon: <Users size={16} />,
                  copy: "Everyone pays the same",
                },
                {
                  name: "Exact" as SplitMode,
                  icon: <WalletCards size={16} />,
                  copy: "Set each person’s amount",
                },
                {
                  name: "Percentage" as SplitMode,
                  icon: <Split size={16} />,
                  copy: "Split by contribution",
                },
              ].map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={`split-mode-choice ${mode === item.name ? "selected" : ""}`}
                  onClick={() => changeMode(item.name)}
                >
                  {item.icon}
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.copy}</small>
                  </span>
                  {mode === item.name && <Check size={14} />}
                </button>
              ))}
            </div>
            {mode === "Exact" && (
              <div className="split-entry-list">
                {participants.map((person) => (
                  <div className="split-entry-row" key={person.user_id}>
                    <Avatar
                      member={{
                        initials: person.initials,
                        color: colorFor(person.user_id),
                      }}
                      size="sm"
                    />
                    <span>{person.name}</span>
                    <div className="split-entry-input">
                      <b>৳</b>
                      <input
                        value={exactAmounts[person.user_id] ?? ""}
                        onChange={(event) =>
                          setExactAmounts((current) => ({
                            ...current,
                            [person.user_id]: event.target.value.replace(
                              /[^0-9.]/g,
                              "",
                            ),
                          }))
                        }
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
                <div
                  className={`split-entry-total ${Math.abs(exactTotal - parsedAmount) < 0.01 ? "balanced" : "unbalanced"}`}
                >
                  <span>Assigned</span>
                  <strong>
                    {money(exactTotal)} of {money(parsedAmount)}
                  </strong>
                </div>
              </div>
            )}
            {mode === "Percentage" && (
              <div className="split-entry-list">
                {participants.map((person) => (
                  <div className="split-entry-row" key={person.user_id}>
                    <Avatar
                      member={{
                        initials: person.initials,
                        color: colorFor(person.user_id),
                      }}
                      size="sm"
                    />
                    <span>{person.name}</span>
                    <div className="split-entry-input percentage-input">
                      <input
                        value={percentages[person.user_id] ?? ""}
                        onChange={(event) =>
                          setPercentages((current) => ({
                            ...current,
                            [person.user_id]: event.target.value.replace(
                              /[^0-9.]/g,
                              "",
                            ),
                          }))
                        }
                        inputMode="decimal"
                        placeholder="0"
                      />
                      <b>%</b>
                    </div>
                    <small className="split-entry-derived">
                      {money(shareFor(person.user_id))}
                    </small>
                  </div>
                ))}
                <div
                  className={`split-entry-total ${Math.abs(percentageTotal - 100) < 0.01 ? "balanced" : "unbalanced"}`}
                >
                  <span>Assigned</span>
                  <strong>{percentageTotal.toFixed(1)}% of 100%</strong>
                </div>
              </div>
            )}
            <label className="expense-field expense-note-field">
              <span>
                Note <em>Optional</em>
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a little context for the group…"
                rows={2}
              />
            </label>
            <input
              ref={receiptInputRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setReceiptFile(file);
                event.target.value = "";
              }}
            />
            <div className={`receipt-upload ${receiptFile ? "attached" : ""}`}>
              <button
                type="button"
                className="receipt-upload-main"
                onClick={() => receiptInputRef.current?.click()}
              >
                <span className="receipt-upload-icon">
                  {receiptFile ? (
                    <FileText size={16} />
                  ) : (
                    <Paperclip size={16} />
                  )}
                </span>
                <span>
                  <strong>
                    {receiptFile ? receiptFile.name : "Attach a receipt"}
                  </strong>
                  <small>
                    {receiptFile
                      ? "Uploaded to this expense · shows up in Documents"
                      : "Optional · JPG, PNG, WEBP, or PDF, up to 10 MB"}
                  </small>
                </span>
              </button>
              {receiptFile ? (
                <button
                  type="button"
                  className="receipt-upload-clear"
                  onClick={() => setReceiptFile(null)}
                  aria-label="Remove receipt"
                >
                  <X size={14} />
                </button>
              ) : (
                <ArrowUpRight size={15} className="receipt-upload-arrow" />
              )}
            </div>
          </div>
          <aside className="expense-preview-panel">
            <div className="preview-eyebrow">LIVE SPLIT PREVIEW</div>
            <div className="preview-orb">
              <Sparkles size={18} />
            </div>
            <h3>{title.trim() || "Your new expense"}</h3>
            <p>
              {category} · paid by {payer?.name ?? "—"}
            </p>
            <div className="preview-total">
              <small>Total</small>
              <strong>{money(parsedAmount)}</strong>
            </div>
            <div className="preview-divider" />
            <div className="preview-split-row">
              <span>
                <Users size={15} /> {participants.length} people
              </span>
              <strong>
                {mode === "Equal" ? `${money(perPerson)} each` : mode}
              </strong>
            </div>
            <div className="preview-members">
              {participants.slice(0, 4).map((person) => (
                <Avatar
                  key={person.user_id}
                  member={{
                    initials: person.initials,
                    color: colorFor(person.user_id),
                  }}
                  size="sm"
                />
              ))}
              {participants.length > 4 && (
                <span className="preview-more">+{participants.length - 4}</span>
              )}
            </div>
            {mode !== "Equal" && !splitIsValid && parsedAmount > 0 && (
              <div className="preview-warning">
                <span>
                  {mode === "Exact"
                    ? "Amounts must add up to the total."
                    : "Percentages must add up to 100%."}
                </span>
              </div>
            )}
            <div className="preview-tip">
              <Sparkles size={14} />
              <span>
                Everyone sees the same story, from payment to settlement.
              </span>
            </div>
          </aside>
        </div>
        <div className="expense-modal-footer">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="expense-save-button"
            type="submit"
            disabled={!canSave}
          >
            <span>
              {!title.trim() || parsedAmount <= 0
                ? "Add a title and amount"
                : !splitIsValid
                  ? "Fix the split before saving"
                  : "Save expense"}
            </span>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
