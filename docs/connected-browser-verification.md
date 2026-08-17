# Connected browser verification

On 2026-08-17, the running frontend at `http://localhost:5173` was opened in Chromium. Signup with a fresh Rafi Hasan test account succeeded after refreshing the backend on port 8000 with the latest CORS configuration. The app restored the JWT session after a browser refresh once session hydration was fixed, loaded the real backend-created group `Browser Dhaka Crew`, and rendered the `LIVE BACKEND SYNC` panel.

The browser panel displayed the connected group name, member count, shared spend, budget count, and notification count. Creating `Browser food budget` with amount `৳ 5,000` through the visible React form produced the toast `Budget created in the shared workspace.`, confirming the UI mutation reached Django and refreshed state.

The backend HTTP smoke test also passed signup, group creation, summary, expense creation, budget creation, poll creation/vote, event creation, persisted group chat message, notifications, and activity retrieval against port 8001.

The expanded panel was then verified after a frontend rebuild. It visibly exposed live backend controls for budgets, quick polls, recurring expenses, group events, notifications, and optimized settlements. Publishing the poll `Book the river cruise this Friday?` from the React panel produced the toast `Poll published to the group.`.
