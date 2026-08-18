import React, { useState } from "react";
import { ArrowUpRight, Check, CircleDollarSign, Split, X } from "lucide-react";
import { api, type AuthUser } from "../lib/api";

export function AuthModal({
  mode,
  onModeChange,
  onClose,
  onSuccess,
  onDemo,
}: {
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
  onClose: () => void;
  onSuccess: (payload: {
    access: string;
    refresh: string;
    user: AuthUser;
  }) => void;
  onDemo: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (isSignup && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const payload = isSignup
        ? await api.signup({
            username,
            password,
            password_confirm: confirm,
            first_name: firstName,
            last_name: lastName,
            email,
          })
        : await api.signin({ username, password });
      onSuccess(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not complete that request.",
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
        <button
          className="auth-close icon-button"
          onClick={onClose}
          aria-label="Close authentication"
        >
          <X size={17} />
        </button>
        <div className="auth-mark">
          <Split size={19} />
        </div>
        <span className="muted-label">SPLITWISE+ ACCOUNT</span>
        <h2>
          {isSignup
            ? "Start sharing smarter."
            : "Welcome back to your workspace."}
        </h2>
        <p className="auth-subtitle">
          {isSignup
            ? "Create your account and bring every shared ৳ decision into context."
            : "Sign in to continue to your groups, balances, and conversations."}
        </p>
        <div className="auth-tabs">
          <button
            type="button"
            className={!isSignup ? "active" : ""}
            onClick={() => onModeChange("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={isSignup ? "active" : ""}
            onClick={() => onModeChange("signup")}
          >
            Create account
          </button>
        </div>
        <form onSubmit={submit}>
          {isSignup && (
            <div className="auth-grid">
              <label>
                First name
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Rafi"
                  required
                />
              </label>
              <label>
                Last name
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Hasan"
                  required
                />
              </label>
            </div>
          )}
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="rafi_bd"
              autoComplete="username"
              required
            />
          </label>
          {isSignup && (
            <label>
              Email <span className="optional">optional</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </label>
          {isSignup && (
            <label>
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
              />
            </label>
          )}
          {error && (
            <div className="auth-error">
              <CircleDollarSign size={15} />
              {error}
            </div>
          )}
          <button className="primary-button auth-submit" disabled={busy}>
            {busy
              ? "Connecting…"
              : isSignup
                ? "Create my account"
                : "Sign in to SplitWise+"}
            <ArrowUpRight size={15} />
          </button>
        </form>
        <div className="auth-footnote">
          <Check size={13} /> BDT-first workspace · secure JWT session
        </div>
      </section>
    </div>
  );
}
