import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  LayoutDashboard,
  LogIn,
  MessageCircle,
  Receipt,
  Sparkles,
  Split,
  Target,
  WalletCards,
} from "lucide-react";
import type { View } from "../types";

export function Landing({
  onEnter,
  onNavigate,
}: {
  onEnter: () => void;
  onNavigate: (view: View) => void;
}) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <button className="brand" onClick={onEnter}>
          <span className="brand-mark">
            <Split size={17} />
          </span>
          <span>
            splitwise<span className="brand-plus">+</span>
          </span>
        </button>
        <nav>
          <a href="#product">Product</a>
          <a href="#solutions">Solutions</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="nav-actions">
          <button className="ghost-button" onClick={onEnter}>
            <LogIn size={15} /> Sign in
          </button>
          <button className="primary-button small" onClick={onEnter}>
            Get started <ArrowUpRight size={15} />
          </button>
        </div>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> THE SHARED MONEY WORKSPACE
          </div>
          <h1>
            Shared money,
            <br />
            <em>without</em> the shared headache.
          </h1>
          <p>
            Split expenses, plan together, settle up, and keep every shared
            financial decision in one calm place — built around ৳.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={onEnter}>
              Start for free <ArrowUpRight size={17} />
            </button>
            <button
              className="text-button"
              onClick={() =>
                document
                  .getElementById("product")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore the product <span>↓</span>
            </button>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack">
              <span
                className="avatar avatar-sm"
                style={{ background: "#b7f36b" }}
              >
                ৳
              </span>
              <span
                className="avatar avatar-sm"
                style={{ background: "#8dd8ff" }}
              >
                +
              </span>
              <span
                className="avatar avatar-sm"
                style={{ background: "#ffb1d5" }}
              >
                ↗
              </span>
            </div>
            <span>
              Built for the people
              <br />
              <strong>you share life with.</strong>
            </span>
          </div>
        </div>
        <div className="hero-demo" id="product">
          <div className="demo-glow" />
          <div className="demo-window">
            <div className="demo-window-top">
              <div className="window-dots">
                <i />
                <i />
                <i />
              </div>
              <span>your shared workspace</span>
              <span className="demo-lock">BDT</span>
            </div>
            <div className="demo-window-body">
              <div className="demo-mini-sidebar">
                <span className="active">
                  <LayoutDashboard size={14} />
                </span>
                <span>
                  <Receipt size={14} />
                </span>
                <span>
                  <WalletCards size={14} />
                </span>
                <span>
                  <MessageCircle size={14} />
                </span>
              </div>
              <div className="demo-panel">
                <div className="demo-heading">
                  <div>
                    <span className="muted-label">YOUR WORKSPACE</span>
                    <h3>
                      Shared finances <ChevronDown size={14} />
                    </h3>
                  </div>
                  <span className="demo-members">
                    <span
                      className="avatar avatar-sm"
                      style={{ background: "#b7f36b" }}
                    >
                      ৳
                    </span>
                    <span
                      className="avatar avatar-sm"
                      style={{ background: "#8dd8ff" }}
                    >
                      +
                    </span>
                    <b>Live</b>
                  </span>
                </div>
                <div className="demo-balance">
                  <span className="muted-label">CURRENT STATUS</span>
                  <strong>Connected</strong>
                  <span>Groups, expenses, plans, and chat in one place</span>
                </div>
                <div className="demo-tabs">
                  <button className="selected" onClick={onEnter}>
                    Expenses
                  </button>
                  <button onClick={onEnter}>Balances</button>
                  <button
                    onClick={() => {
                      onEnter();
                      onNavigate("chat");
                    }}
                  >
                    Messages
                  </button>
                </div>
                <div className="demo-card">
                  <div className="demo-card-icon">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <strong>Track every shared expense</strong>
                    <span>Participants, notes, and settlement context</span>
                  </div>
                  <b>৳</b>
                </div>
                <div className="demo-card faded">
                  <div className="demo-card-icon soft">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <strong>Plan together</strong>
                    <span>Budgets, polls, events, and recurring costs</span>
                  </div>
                  <button onClick={onEnter} className="demo-action">
                    Open
                  </button>
                </div>
                <div className="demo-chat">
                  <span className="chat-dot" />
                  <span>Real-time updates across your group</span>
                  <button
                    onClick={() => {
                      onEnter();
                      onNavigate("chat");
                    }}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="social-proof">
        <div>
          <strong>BDT</strong>
          <span>default currency</span>
        </div>
        <div>
          <strong>Live</strong>
          <span>group updates</span>
        </div>
        <div>
          <strong>Clear</strong>
          <span>settlement steps</span>
        </div>
        <div>
          <strong>Private</strong>
          <span>shared spaces</span>
        </div>
      </section>
      <section className="landing-section problem" id="solutions">
        <div className="section-kicker">THE OLD WAY</div>
        <div className="split-heading">
          <h2>
            Money gets messy
            <br />
            <em>when it gets shared.</em>
          </h2>
          <p>
            SplitWise+ turns the awkward questions into clear next steps —
            without making your group feel like a finance department.
          </p>
        </div>
        <div className="problem-grid">
          <div className="problem-card">
            <span>01</span>
            <h3>Know who paid and why</h3>
            <p>
              Keep every expense, participant, note, and settlement detail in
              the same shared context.
            </p>
            <button onClick={onEnter}>
              Track expenses <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="problem-card active-problem">
            <span>02</span>
            <h3>Close the balance clearly</h3>
            <p>
              See the recommended transfers and confirm payments without
              group-chat archaeology.
            </p>
            <button onClick={onEnter}>
              See balances <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="problem-card">
            <span>03</span>
            <h3>Plan before spending</h3>
            <p>
              Use budgets, polls, events, recurring expenses, and activity to
              keep everyone aligned.
            </p>
            <button onClick={onEnter}>
              Plan together <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      </section>
      <section className="workspace-section" id="features">
        <div className="workspace-copy">
          <div className="section-kicker">ONE GROUP. ONE WORKSPACE.</div>
          <h2>
            Everything shared,
            <br />
            <em>finally together.</em>
          </h2>
          <p>
            Expenses are just the beginning. Bring the conversation, decisions,
            plans, and money into the same shared context.
          </p>
          <div className="feature-list">
            <button className="feature-item active" onClick={onEnter}>
              <span className="feature-icon lime">
                <Receipt size={18} />
              </span>
              <span>
                <strong>Expenses that explain themselves</strong>
                <small>
                  Splits, notes, participants, and settlement context
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button
              className="feature-item"
              onClick={() => {
                onEnter();
                onNavigate("chat");
              }}
            >
              <span className="feature-icon blue">
                <MessageCircle size={18} />
              </span>
              <span>
                <strong>Messenger-style conversation</strong>
                <small>
                  Private threads, media, reactions, and live delivery
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button className="feature-item" onClick={onEnter}>
              <span className="feature-icon pink">
                <Target size={18} />
              </span>
              <span>
                <strong>Plans tied to reality</strong>
                <small>Budgets, votes, events, and recurring expenses</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
        <div className="orbit-visual">
          <div className="orbit-core">
            <Split size={27} />
            <span>
              shared
              <br />
              workspace
            </span>
          </div>
          <div className="orbit-node node-expenses">
            <Receipt size={17} />
            <span>Expenses</span>
          </div>
          <div className="orbit-node node-chat">
            <MessageCircle size={17} />
            <span>Live chat</span>
          </div>
          <div className="orbit-node node-budget">
            <Target size={17} />
            <span>Budget</span>
          </div>
          <div className="orbit-node node-plan">
            <CalendarDays size={17} />
            <span>Plans</span>
          </div>
        </div>
      </section>
      <section className="settlement-section">
        <div className="settlement-visual">
          <div className="settlement-before">
            <span className="muted-label">BEFORE</span>
            <div>
              <b>?</b>
              <span /> <b>?</b>
              <strong>unclear</strong>
            </div>
            <div>
              <b>?</b>
              <span /> <b>?</b>
              <strong>untracked</strong>
            </div>
            <div>
              <b>?</b>
              <span /> <b>?</b>
              <strong>awkward</strong>
            </div>
          </div>
          <div className="settlement-arrow">
            <Sparkles size={18} />
            <ArrowUpRight size={18} />
          </div>
          <div className="settlement-after">
            <span className="muted-label">WITH SPLITWISE+</span>
            <div>
              <b>৳</b>
              <span /> <b>↗</b>
              <strong>clear</strong>
            </div>
            <div>
              <b>✓</b>
              <span /> <b>৳</b>
              <strong>settled</strong>
            </div>
            <small>Fewer, clearer next steps</small>
          </div>
        </div>
        <div className="settlement-copy">
          <div className="section-kicker">SMART SETTLEMENT</div>
          <h2>
            Less paying back.
            <br />
            <em>More moving on.</em>
          </h2>
          <p>
            SplitWise+ simplifies shared debts into the fewest, clearest
            payments — so your group can close the loop together.
          </p>
          <button className="text-button" onClick={onEnter}>
            See the workspace <ArrowUpRight size={15} />
          </button>
        </div>
      </section>
      <section className="pricing-section" id="pricing">
        <div className="section-kicker">SIMPLE BY DESIGN</div>
        <h2>
          Start together.
          <br />
          <em>Grow when you need to.</em>
        </h2>
        <div className="pricing-grid">
          <div className="price-card">
            <span className="price-label">FREE</span>
            <h3>For the everyday share</h3>
            <div className="price">
              ৳ 0 <small>/ forever</small>
            </div>
            <p>Everything a small group needs to stay in sync.</p>
            <ul>
              <li>
                <Check size={15} /> Shared expenses
              </li>
              <li>
                <Check size={15} /> Settlement planning
              </li>
              <li>
                <Check size={15} /> Group chat
              </li>
            </ul>
            <button className="secondary-button" onClick={onEnter}>
              Get started
            </button>
          </div>
          <div className="price-card featured">
            <span className="price-label">
              PLUS <i>for growing groups</i>
            </span>
            <h3>For groups with more to manage</h3>
            <div className="price">
              ৳ 400 <small>/ member / month</small>
            </div>
            <p>More space for plans, budgets, media, and history.</p>
            <ul>
              <li>
                <Check size={15} /> Everything in Free
              </li>
              <li>
                <Check size={15} /> Media-rich messaging
              </li>
              <li>
                <Check size={15} /> Advanced analytics
              </li>
            </ul>
            <button className="primary-button" onClick={onEnter}>
              Start Plus <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="price-card">
            <span className="price-label">TEAMS</span>
            <h3>For communities in motion</h3>
            <div className="price">Let’s talk</div>
            <p>Permissions, workspaces, and control for larger groups.</p>
            <ul>
              <li>
                <Check size={15} /> Everything in Plus
              </li>
              <li>
                <Check size={15} /> Team permissions
              </li>
              <li>
                <Check size={15} /> Workspace controls
              </li>
            </ul>
            <button className="secondary-button" onClick={onEnter}>
              Contact us
            </button>
          </div>
        </div>
      </section>
      <footer className="landing-footer">
        <button className="brand" onClick={onEnter}>
          <span className="brand-mark">
            <Split size={17} />
          </span>
          <span>
            splitwise<span className="brand-plus">+</span>
          </span>
        </button>
        <span>Shared money, without the shared headache.</span>
        <span>© 2026 SplitWise+</span>
      </footer>
    </div>
  );
}
