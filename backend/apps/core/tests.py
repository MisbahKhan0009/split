from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from .api import ExpenseSerializer, GroupSerializer
from .models import Group, GroupMembership

User = get_user_model()


class CoreModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="rafi", password="safe-password")
        self.factory = APIRequestFactory()

    def test_group_creation_adds_owner_membership(self):
        request = self.factory.post("/api/v1/groups/")
        request.user = self.user
        serializer = GroupSerializer(
            data={"name": "Dhaka trip", "slug": "dhaka-trip", "emoji": "✦"},
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        group = serializer.save()
        self.assertTrue(
            GroupMembership.objects.filter(
                group=group, user=self.user, role="owner"
            ).exists()
        )

    def test_exact_split_requires_amount_to_match(self):
        group = Group.objects.create(
            name="Dhaka trip", slug="dhaka-trip-2", owner=self.user
        )
        payload = {
            "group": group.id,
            "title": "Dinner",
            "category": "Food",
            "amount": "100.00",
            "payer": self.user.id,
            "occurred_on": date.today(),
            "split_mode": "exact",
            "participants": [{"user": self.user.id, "share_amount": "90.00"}],
        }
        serializer = ExpenseSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with self.assertRaises(Exception):
            serializer.save()
