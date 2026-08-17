import os
import uuid
from datetime import date, datetime, timedelta, timezone

import requests

BASE = os.getenv("SPLITWISE_API_BASE", "http://127.0.0.1:8001/api/v1")
username = f"e2e_{uuid.uuid4().hex[:10]}"
password = "LocalPass123!"
session = requests.Session()

response = session.post(
    f"{BASE}/auth/register/",
    json={
        "username": username,
        "password": password,
        "password_confirm": password,
        "first_name": "Rafi",
        "last_name": "E2E",
        "email": f"{username}@example.test",
    },
)
assert response.status_code == 201, response.text
payload = response.json()
session.headers.update({"Authorization": f"Bearer {payload['access']}"})

created = session.post(
    f"{BASE}/groups/",
    json={
        "name": "E2E Dhaka Crew",
        "slug": username,
        "emoji": "✦",
        "description": "Connected feature test",
    },
)
assert created.status_code == 201, created.text
group_id = created.json()["id"]

summary = session.get(f"{BASE}/groups/{group_id}/summary/")
assert summary.status_code == 200, summary.text

expense = session.post(
    f"{BASE}/expenses/",
    json={
        "group": group_id,
        "title": "E2E dinner",
        "category": "Food",
        "amount": "1200.00",
        "payer": payload["user"]["id"],
        "note": "Connected test",
        "occurred_on": str(date.today()),
        "split_mode": "equal",
    },
)
assert expense.status_code == 201, expense.text

budget = session.post(
    f"{BASE}/budgets/",
    json={
        "group": group_id,
        "name": "Dinner budget",
        "category": "Food",
        "amount": "5000.00",
        "period": "monthly",
        "starts_on": str(date.today()),
    },
)
assert budget.status_code == 201, budget.text

poll = session.post(
    f"{BASE}/polls/",
    json={
        "group": group_id,
        "question": "Keep the dinner plan?",
        "options": ["Yes", "No"],
    },
)
assert poll.status_code == 201, poll.text
poll_id = poll.json()["id"]
option_id = poll.json()["options"][0]["id"] if poll.json().get("options") else None
if option_id:
    vote = session.post(f"{BASE}/polls/{poll_id}/vote/", json={"option": option_id})
    assert vote.status_code == 200, vote.text

event = session.post(
    f"{BASE}/events/",
    json={
        "group": group_id,
        "title": "E2E dinner event",
        "description": "Connected event",
        "starts_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "location": "Dhanmondi",
        "budget": "1200.00",
        "checklist": ["Confirm table"],
    },
)
assert event.status_code == 201, event.text

message = session.post(
    f"{BASE}/messages/",
    json={
        "group": group_id,
        "kind": "group",
        "body": "Connected API message",
        "attachments": [],
    },
)
assert message.status_code == 201, message.text

notifications = session.get(f"{BASE}/notifications/")
assert notifications.status_code == 200, notifications.text
activity = session.get(f"{BASE}/activity/?group={group_id}")
assert activity.status_code == 200, activity.text

print(
    f"RESULT: connected HTTP workflow passed for user={username}, group={group_id}; summary={summary.json().get('total_spend')}, notifications={len(notifications.json())}, activity={len(activity.json())}"
)
