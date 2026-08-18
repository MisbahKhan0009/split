"""Verify creating an expense with a user-chosen past date works and round-trips."""

import os
import sys
from pathlib import Path

import django

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ["DJANGO_ALLOWED_HOSTS"] = "localhost,127.0.0.1,testserver"
django.setup()

from apps.core.auth import auth_payload  # noqa: E402
from apps.core.models import Expense, Group, GroupMembership  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402

User = get_user_model()
User.objects.filter(username="date_check").delete()
Group.objects.filter(slug="date-check-group").delete()

user = User.objects.create_user(username="date_check", password="CheckPass123!")
group = Group.objects.create(name="Date Check Group", slug="date-check-group", owner=user)
GroupMembership.objects.create(group=group, user=user, role=GroupMembership.Role.OWNER, is_active=True)

client = APIClient()
client.credentials(HTTP_AUTHORIZATION=f"Bearer {auth_payload(user)['access']}")

created = client.post(
    "/api/v1/expenses/",
    {
        "group": group.id,
        "title": "Backdated dinner",
        "category": "Food",
        "amount": "500.00",
        "payer": user.id,
        "note": "",
        "occurred_on": "2026-06-15",
        "split_mode": "equal",
        "participants": [{"user": user.id, "share_amount": "500.00", "share_value": 0}],
    },
    format="json",
)
print("create status:", created.status_code)
print("occurred_on stored:", created.data.get("occurred_on"))

listed = client.get(f"/api/v1/expenses/?group={group.id}").data
print("listed occurred_on:", listed[0]["occurred_on"] if listed else None)

Expense.objects.filter(group=group).delete()
User.objects.filter(username="date_check").delete()
Group.objects.filter(slug="date-check-group").delete()
print("RESULT: date field check complete")
