from datetime import date
from decimal import Decimal

from apps.core.models import (
    ChatMessage,
    Expense,
    ExpenseParticipant,
    Group,
    GroupMembership,
    Settlement,
    UserProfile,
)
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed realistic BDT-first SplitWise+ development data."

    def handle(self, *args, **options):
        User = get_user_model()
        people = [
            ("rafi", "Rafi", "Hasan", "Always down for a good adda.", "Online now"),
            (
                "tisha",
                "Tisha",
                "Rahman",
                "Coffee, cameras, and clean splits.",
                "Online now",
            ),
            ("nabil", "Nabil", "Karim", "Maps first, plans later.", "Active 2m ago"),
            (
                "mahi",
                "Mahi",
                "Sultana",
                "Designing the next hangout.",
                "Active 12m ago",
            ),
            (
                "shuvo",
                "Shuvo",
                "Ahmed",
                "Receipts are my love language.",
                "Active yesterday",
            ),
        ]
        users = {}
        for username, first_name, last_name, bio, status in people:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": f"{username}@splitwise.local",
                },
            )
            if created:
                user.set_password("splitwise-demo-123")
                user.save(update_fields=["password"])
            UserProfile.objects.update_or_create(
                user=user, defaults={"bio": bio, "status": status}
            )
            users[username] = user

        group_specs = [
            ("dhaka-trip", "Dhaka trip", "✦", "Aug 14 – Aug 21, 2025", users["rafi"]),
            ("home", "Dhanmondi 3B", "⌂", "Monthly household", users["rafi"]),
            ("studio-adda", "Studio adda", "◌", "Design sprint", users["tisha"]),
        ]
        groups = {}
        for slug, name, emoji, description, owner in group_specs:
            group, _ = Group.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "emoji": emoji,
                    "description": description,
                    "currency": "BDT",
                    "currency_symbol": "৳",
                    "owner": owner,
                },
            )
            groups[slug] = group
            member_names = (
                ["rafi", "tisha", "nabil", "mahi"]
                if slug != "studio-adda"
                else ["tisha", "nabil", "mahi", "shuvo"]
            )
            for username in member_names:
                GroupMembership.objects.update_or_create(
                    group=group,
                    user=users[username],
                    defaults={
                        "role": (
                            GroupMembership.Role.OWNER
                            if users[username] == owner
                            else GroupMembership.Role.MEMBER
                        ),
                        "is_active": True,
                    },
                )

        trip = groups["dhaka-trip"]
        expenses = [
            (
                "Hotel at Gulshan",
                "Stay",
                "8400.00",
                "tisha",
                "Two nights, city-view room",
                date(2025, 8, 14),
                Expense.Status.CONFIRMED,
            ),
            (
                "Dinner at Dhanmondi",
                "Food",
                "2480.00",
                "rafi",
                "Shared plates + drinks",
                date(2025, 8, 15),
                Expense.Status.CONFIRMED,
            ),
            (
                "Airport ride",
                "Transport",
                "1920.00",
                "nabil",
                "Eight return seats",
                date(2025, 8, 15),
                Expense.Status.CONFIRMED,
            ),
            (
                "Bangladesh National Museum",
                "Activities",
                "1760.00",
                "mahi",
                "Group admission",
                date(2025, 8, 16),
                Expense.Status.PENDING,
            ),
            (
                "River cruise proposal",
                "Activities",
                "3200.00",
                "shuvo",
                "Friday evening option",
                date(2025, 8, 17),
                Expense.Status.PENDING,
            ),
        ]
        for title, category, amount, payer, note, occurred_on, status in expenses:
            expense, _ = Expense.objects.update_or_create(
                group=trip,
                title=title,
                defaults={
                    "category": category,
                    "amount": Decimal(amount),
                    "payer": users[payer],
                    "note": note,
                    "occurred_on": occurred_on,
                    "split_mode": "equal",
                    "status": status,
                },
            )
            share = (Decimal(amount) / Decimal("4")).quantize(Decimal("0.01"))
            for username in ["rafi", "tisha", "nabil", "mahi"]:
                ExpenseParticipant.objects.update_or_create(
                    expense=expense,
                    user=users[username],
                    defaults={"share_amount": share, "share_value": Decimal("25.00")},
                )

        Settlement.objects.update_or_create(
            group=trip,
            from_user=users["rafi"],
            to_user=users["tisha"],
            amount=Decimal("840.00"),
            defaults={"status": Settlement.Status.REQUESTED, "note": "Hotel share"},
        )
        Settlement.objects.update_or_create(
            group=trip,
            from_user=users["rafi"],
            to_user=users["nabil"],
            amount=Decimal("220.00"),
            defaults={
                "status": Settlement.Status.REQUESTED,
                "note": "Airport ride balance",
            },
        )

        ChatMessage.objects.filter(group=trip).delete()
        messages = [
            (users["tisha"], "Should we book the river cruise for Friday?"),
            (users["rafi"], "Yes — I found one for ৳ 3,200 for all of us."),
            (users["nabil"], "I'm in. Add it to the trip budget?"),
        ]
        for author, body in messages:
            ChatMessage.objects.create(
                group=trip, author=author, kind=ChatMessage.Kind.GROUP, body=body
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Seeded 5 users, 3 BDT groups, 5 expenses, 2 settlements, and 3 group chat messages."
            )
        )
