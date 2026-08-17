# SplitWise+

> Shared money, without the shared headache.

SplitWise+ is a BDT-first collaborative financial workspace for groups that share money, plans, responsibilities, and decisions. The repository contains a responsive liquid-glass frontend plus a modular Django REST and Channels backend foundation.

## What is implemented

The frontend includes a marketing landing page, group workspace, overview dashboard, expense ledger with search and category filters, equal/exact/percentage split flow, receipt state, balance breakdown, optimized settlement actions, itinerary planning, notifications, command palette, theme switching, responsive navigation, and local optimistic feedback.

The default currency is **Bangladeshi taka (`৳`, code `BDT`)** across the landing page, demo data, expenses, balances, settlement views, planning copy, and backend serializers. Demo identities use only casual Bangladeshi Gen Z names: **Rafi, Tisha, Nabil, Mahi, and Shuvo**.

The website now includes **signup and signin**. Visitors can create an account or authenticate with a username and password through the Django JWT API. Successful sessions store access and refresh tokens in browser storage, display the signed-in user in the workspace account footer, and expose sign out. A no-account demo preview remains available from the authentication surface so the product can still be reviewed instantly.

The Messages workspace now behaves like a modern Messenger/WhatsApp-style inbox. It includes a group thread, private-message threads, member profile drawers, profile-picture update controls, emoji selection, GIF sending, image/video/file attachment controls, attachment previews, message reactions, reply context, typing indicators, delivery state, read-state hooks, theme switching, shared-media metadata, and WebSocket-ready group/direct delivery.

## Architecture

| Layer    | Responsibility                                                                                                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | React + TypeScript + Vite, liquid-glass responsive UI, BDT formatting, inbox conversations, media previews, reactions, profiles, and WebSocket clients.                                                                    |
| Backend  | Django, Django REST Framework, Channels, JWT/session authentication, group membership checks, profile APIs, chat history, direct messages, rich attachments, reactions, read receipts, and typing/realtime event handlers. |
| Data     | SQLite by default for development, PostgreSQL through `DATABASE_URL` in deployment, Django media storage for receipts and avatars, and JSON fields for attachment/reaction metadata.                                       |

## Repository structure

```text
splitwise-plus/
├── frontend/
│   ├── src/App.tsx           # landing page, workspace, inbox, chat, profiles
│   ├── src/lib/api.ts        # REST and group/direct WebSocket helpers
│   ├── src/types/index.ts    # shared frontend contracts
│   └── src/styles.css        # liquid-glass and Messenger UI system
├── backend/
│   ├── apps/accounts/        # authentication domain facade and app config
│   ├── apps/groups/          # group domain API surface and app config
│   ├── apps/finance/         # expense and settlement API surface
│   ├── apps/messaging/       # chat API and realtime consumer surface
│   ├── apps/planning/        # itinerary/task service boundary
│   ├── apps/core/            # shared models, compatibility APIs, migrations
│   ├── apps/core/management/commands/seed_demo.py # repeatable BDT seed data
│   └── requirements.txt
└── docs/
```

## Run the frontend

```bash
cd frontend
pnpm install
pnpm run dev
pnpm run build
```

The frontend is intentionally usable without a configured backend so product flows can be reviewed immediately. Backend integration is isolated behind REST and WebSocket contracts.

## Run the backend

```bash
cd backend
python3 -m venv .venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Set `DATABASE_URL` to a PostgreSQL connection string in production. Without it, development uses SQLite. Set `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, and `DJANGO_DEBUG` through the environment; secrets are not committed.

## API and realtime contracts

| Method                | Endpoint                                | Purpose                                                             |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| POST                  | `/api/v1/auth/register/`                | Create an account, profile, and JWT session.                        |
| POST                  | `/api/v1/auth/token/`                   | Issue JWT access and refresh tokens.                                |
| POST                  | `/api/v1/auth/token/refresh/`           | Refresh an access token.                                            |
| GET                   | `/api/v1/auth/me/`                      | Read the authenticated user profile.                                |
| GET/POST              | `/api/v1/groups/`                       | List or create BDT groups. New groups default to `BDT` and `৳`.     |
| GET                   | `/api/v1/groups/{id}/summary/`          | Read spend summary with currency metadata.                          |
| GET/POST/PATCH/DELETE | `/api/v1/expenses/`                     | Manage shared expenses and participant splits.                      |
| GET/POST/PATCH/DELETE | `/api/v1/settlements/`                  | Manage settlement requests and BDT balances.                        |
| GET/PATCH             | `/api/v1/profiles/me/`                  | Read or update the current profile, avatar, bio, status, and theme. |
| GET                   | `/api/v1/messages/?group={id}`          | Read group chat history.                                            |
| GET                   | `/api/v1/messages/?recipient={user_id}` | Read a private-message thread.                                      |
| POST                  | `/api/v1/messages/{id}/react/`          | Add a reaction.                                                     |
| POST                  | `/api/v1/messages/{id}/mark_read/`      | Mark a message as read.                                             |
| WebSocket             | `/ws/groups/{group_id}/chat/`           | Group delivery, typing, reactions, and read events.                 |
| WebSocket             | `/ws/users/{user_id}/chat/`             | Direct-message delivery between two users.                          |

Chat WebSocket messages accept `body`, `attachments`, and optional `reply_to`. Production deployment should replace the in-memory channel layer with Redis and connect object storage for durable media uploads.

## Verification

```bash
cd frontend && pnpm run build
cd ../backend && python3 manage.py check
cd ../backend && python3 manage.py test
cd ../backend && DJANGO_ALLOWED_HOSTS='localhost,127.0.0.1,testserver' python3 scripts/auth_smoke.py
git diff --check
```

The browser smoke notes in `docs/browser-smoke-test.md` cover the BDT landing page, updated identity, workspace, group dropdown switching, direct group-chat access, expense flow, and Messenger-style messaging screen. Run `python manage.py seed_demo` whenever a clean development database needs realistic groups, expenses, settlements, profiles, and chat messages.
