"""Temporary check: can we PATCH an expense's receipt via multipart, and does
the list/detail response return a usable receipt URL afterward?"""

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
from django.core.files.uploadedfile import SimpleUploadedFile  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402

User = get_user_model()
User.objects.filter(username="receipt_check").delete()
Group.objects.filter(slug="receipt-check-group").delete()

user = User.objects.create_user(username="receipt_check", password="CheckPass123!")
group = Group.objects.create(name="Receipt Check Group", slug="receipt-check-group", owner=user)
GroupMembership.objects.create(group=group, user=user, role=GroupMembership.Role.OWNER, is_active=True)

client = APIClient()
client.credentials(HTTP_AUTHORIZATION=f"Bearer {auth_payload(user)['access']}")

created = client.post(
    "/api/v1/expenses/",
    {
        "group": group.id,
        "title": "Hotel stay",
        "category": "Stay",
        "amount": "5000.00",
        "payer": user.id,
        "note": "",
        "occurred_on": "2026-08-18",
        "split_mode": "equal",
        "participants": [{"user": user.id, "share_amount": "5000.00", "share_value": 0}],
    },
    format="json",
)
print("create expense status:", created.status_code)
expense_id = created.data.get("id")
print("receipt field right after create:", created.data.get("receipt"))

pdf_bytes = b"%PDF-1.4 fake receipt content"
patch_response = client.patch(
    f"/api/v1/expenses/{expense_id}/",
    {"receipt": SimpleUploadedFile("hotel-receipt.pdf", pdf_bytes, content_type="application/pdf")},
    format="multipart",
)
print("patch receipt status:", patch_response.status_code)
print("receipt url after patch:", patch_response.data.get("receipt"))

listed = client.get(f"/api/v1/expenses/?group={group.id}")
print("list expenses receipt field:", listed.data[0].get("receipt"))

Expense.objects.filter(group=group).delete()
User.objects.filter(username="receipt_check").delete()
Group.objects.filter(slug="receipt-check-group").delete()
print("RESULT: receipt upload check complete")
