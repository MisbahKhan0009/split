# Connected browser verification

On 2026-08-17, the running frontend at `http://localhost:5173` was opened in Chromium. Signup with a fresh Rafi Hasan test account succeeded after refreshing the backend on port 8000 with the latest CORS configuration. The app restored the JWT session after a browser refresh once session hydration was fixed, loaded the real backend-created group `Browser Dhaka Crew`, and rendered the `LIVE BACKEND SYNC` panel.

The browser panel displayed the connected group name, member count, shared spend, budget count, and notification count. Creating `Browser food budget` with amount `৳ 5,000` through the visible React form produced the toast `Budget created in the shared workspace.`, confirming the UI mutation reached Django and refreshed state.

The backend HTTP smoke test also passed signup, group creation, summary, expense creation, budget creation, poll creation/vote, event creation, persisted group chat message, notifications, and activity retrieval against port 8001.

The expanded panel was then verified after a frontend rebuild. It visibly exposed live backend controls for budgets, quick polls, recurring expenses, group events, notifications, and optimized settlements. Publishing the poll `Book the river cruise this Friday?` from the React panel produced the toast `Poll published to the group.`.

## Fresh-account browser verification — 2026-08-17

- Created fresh account `tisha_flow_2026` through the visible React signup form.
- Signup transitioned to the authenticated workspace and displayed `Tisha Rahman` as signed in.
- Opened the group switcher and used the visible **New group** action.
- Created `Dhanmondi Flatmates` with the description `Shared rent, utilities, and weekly groceries`.
- The new group was selected in the UI and displayed `1 members · ৳ 0`.
- Opened the visible **Invite** action for the newly-created group.
- Typed `rafi` into the invitation search field.
- Real database suggestions appeared, including `@auth_smoke`, `@e2e_...`, `@rafi`, and other persisted users.

The next checks are to select a suggestion, send an invitation, verify the recipient inbox and acceptance/membership update, then create an expense in the new group through the visible modal.

- Selected the real `@rafi` database suggestion.
- The UI displayed `Invitation sent to @rafi.` and persisted a pending invitation row for `Dhanmondi Flatmates`, with Accept, Decline, and Copy invitation link actions.

The remaining recipient test will use a second authenticated account so acceptance can be verified against the invitation recipient restriction.

- Created a second real account `rafi_accept_2026` in the browser session and sent an invitation to it from the visible modal.
- The sender UI displayed `Invitation sent to @rafi_accept_2026.` and a separate pending invitation row for that exact username.

Next, the browser will sign out of Tisha’s account, sign in as `rafi_accept_2026`, open the invitation inbox, and accept the pending invitation.

- Signed out of Tisha’s account through the visible Sign out control.
- Signed in through the visible React form as `rafi_accept_2026`.
- Opened the notification control and saw the real `Dhanmondi Flatmates` invitation with a visible **Join** action.
- Clicked **Join**. The UI reported `Invitation accepted and membership updated.` and the group switcher changed from `1 members` to `2 members`, confirming persistent membership creation through the browser workflow.

- The first expense submission exposed a frontend bug: the connected summary remained at zero because several group-ID checks used an over-escaped numeric regex and skipped backend calls.
- Corrected all connected numeric-ID guards and rebuilt the frontend.
- Reopened the expense modal and submitted `Flatmates electricity bill` for `৳ 2,400` with both real group members selected.
- The visible expense ledger showed the saved expense as a real backend row, the connected panel updated to `৳ 2,400 · 1 expenses · 2 members`, and the settlement panel showed `Tisha Rahman → Rafi Ahmed ৳ 1,200`.
- The UI displayed `Expense saved and balances recalculated in ৳`, confirming the complete frontend-to-Django-to-frontend flow.

## Current-user Dashboard and fresh-account verification — 2026-08-17

A fresh account, `mahi_dashboard_2026`, was created through the visible React signup form. The account was not assigned to any group. After correcting the dashboard aggregation’s settlement status value and restarting Django, the live browser showed the sidebar label **Dashboard**, the signed-in user `Mahi Khan`, and the empty state: **No groups yet.** The UI explicitly explained that new users are not automatically added to groups and offered **Create your first group**.

The initial browser attempt exposed a backend 500 caused by using a nonexistent `Settlement.Status.PENDING`; this was corrected to the model’s real `Settlement.Status.REQUESTED` value, and the browser recheck passed.

## Production-presentable cleanup verification — 2026-08-17

Removed preview-workspace entry points, seeded authenticated groups/expenses/activity/chat, hard-coded sidebar badges, static notifications, fake online/member counts, and the `Make the group more useful` preview-oriented heading. The public landing page now uses product-oriented copy without fake group names, balances, people, or historical usage metrics.

Browser verification after the final rebuild:

- Dashboard rendered the real Mahi Circle group and live BDT totals from Django.
- Expenses rendered `0` real expenses with a truthful empty state.
- Group plans rendered no events and no polls because none exist in the backend.
- Messages rendered one real online member, one real group, zero messages, zero shared media, and zero files.
- Connected workspace controls remained available and displayed live backend counts.
- No preview, seeded, dummy, or hard-coded activity copy appeared in the authenticated workspace.

The final frontend build, Django checks, Django tests, connected HTTP smoke test, and `git diff --check` passed.

The authenticated workspace now treats backend state as authoritative. When data is absent, the UI explains what is missing and how to create it instead of inventing records. The marketing landing page remains intentionally illustrative as product communication, but no longer presents fictional people, group balances, or historical usage metrics as real product data.
