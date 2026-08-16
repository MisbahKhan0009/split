# SplitWise+

> Shared money, without the shared headache.

SplitWise+ is a collaborative financial workspace for groups that share money, plans, responsibilities, and decisions. This repository contains the first production milestone described in `SplitWise_Plus_PRD_v2.md`: a responsive liquid-glass frontend experience plus a modular Django REST and Channels backend foundation.

## What is implemented

The frontend includes a marketing landing page with an interactive product demo, a group workspace, overview dashboard, expense ledger with search and category filters, equal/exact/percentage split flow, receipt attachment state, balance breakdown, optimized settlement actions, itinerary and task planning, live-style group chat, contextual notifications, command palette, theme switching, responsive mobile navigation, loading/empty/error-aware interaction patterns, and local optimistic feedback.

The backend provides Django models for groups, memberships, expenses, participants, settlements, and chat messages. REST endpoints are available for groups, expense CRUD, settlements, settlement confirmation, group summaries, and JWT token issuance. The WebSocket contract is `ws://localhost:8000/ws/groups/{group_id}/chat/`, with membership checks and persisted messages.

## Repository structure

```text
splitwise-plus/
├── frontend/                 # React + TypeScript + Vite application
│   ├── src/App.tsx           # Product shell and interactive MVP flows
│   ├── src/styles.css        # Liquid-glass design system and responsive UI
│   └── package.json
├── backend/                  # Django + DRF + Channels service
│   ├── apps/core/models.py   # Group finance domain model
│   ├── apps/core/api.py      # Serializers and REST viewsets
│   ├── apps/core/consumers.py# Group chat WebSocket consumer
│   └── requirements.txt
└── docs/
```

## Run the frontend

```bash
cd frontend
pnpm install
pnpm run dev
```

The frontend is intentionally usable without a configured backend so product flows can be reviewed immediately. Backend integration is isolated behind the REST and WebSocket contracts above.

## Run the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Set `DATABASE_URL` to a PostgreSQL connection string in production. Without it, development uses SQLite. Set `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, and `DJANGO_DEBUG` through the environment; secrets are not committed.

## API outline

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/token/` | Issue JWT access and refresh tokens |
| POST | `/api/v1/auth/token/refresh/` | Refresh an access token |
| GET/POST | `/api/v1/groups/` | List or create groups |
| GET | `/api/v1/groups/{id}/summary/` | Read group spend summary |
| GET/POST/PATCH/DELETE | `/api/v1/expenses/` | Manage shared expenses |
| GET/POST/PATCH/DELETE | `/api/v1/settlements/` | Manage settlement requests |
| POST | `/api/v1/settlements/{id}/confirm/` | Confirm a settlement |
| WebSocket | `/ws/groups/{group_id}/chat/` | Real-time group chat |

Expense validation rejects non-positive amounts and ensures exact/equal participant shares reconcile to the transaction total. All group-scoped querysets filter through active membership.

## Verification

```bash
cd frontend && pnpm run build
cd ../backend && python manage.py test
```

The UI uses semantic controls, visible focusable actions, reduced-motion support, mobile navigation, actionable empty states, and non-blocking toast feedback. Financial operations are modeled as REST mutations; only chat uses Channels/WebSockets, matching the PRD architecture.
