import { FormEvent, useState } from "react";
import { ArrowUpRight, CircleDollarSign, Users, X } from "lucide-react";

export function GroupCreateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    emoji: string;
    description: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✦");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onCreate({ name, emoji, description });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create the group.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-backdrop" onClick={onClose}>
      <section
        className="auth-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="auth-close icon-button" onClick={onClose}>
          <X size={17} />
        </button>
        <div className="auth-mark">
          <Users size={19} />
        </div>
        <span className="muted-label">NEW SHARED SPACE</span>
        <h2>Create a group</h2>
        <p className="auth-subtitle">
          Start a real BDT workspace, then invite people by username.
        </p>
        <form onSubmit={submit}>
          <label>
            Group name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Dhanmondi house"
              required
            />
          </label>
          <div className="auth-grid">
            <label>
              Icon
              <input
                value={emoji}
                onChange={(event) => setEmoji(event.target.value)}
                maxLength={2}
              />
            </label>
            <label>
              Description
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What are you sharing?"
              />
            </label>
          </div>
          {error && (
            <div className="auth-error">
              <CircleDollarSign size={15} />
              {error}
            </div>
          )}
          <button className="primary-button auth-submit" disabled={busy}>
            {busy ? "Creating…" : "Create group"}
            <ArrowUpRight size={15} />
          </button>
        </form>
      </section>
    </div>
  );
}
