import uuid

from django.conf import settings
from django.db import models


class TimeStamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UserProfile(TimeStamped):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    avatar = models.ImageField(upload_to="avatars/%Y/%m/", blank=True, null=True)
    bio = models.CharField(max_length=240, blank=True)
    status = models.CharField(max_length=80, default="Available")
    theme = models.CharField(max_length=32, default="default")

    def __str__(self):
        return f"{self.user.username} profile"


class UserSession(TimeStamped):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="account_sessions"
    )
    session_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    device_label = models.CharField(max_length=120, default="Web browser")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-last_seen_at"]

    @property
    def is_active(self):
        return self.revoked_at is None


class UserActivityLog(TimeStamped):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="account_activity"
    )
    action = models.CharField(max_length=80)
    description = models.CharField(max_length=240)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_label = models.CharField(max_length=120, default="Web browser")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]


class Group(TimeStamped):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    emoji = models.CharField(max_length=8, default="✦")
    currency = models.CharField(max_length=3, default="BDT")
    currency_symbol = models.CharField(max_length=4, default="৳")
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_groups"
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="GroupMembership",
        related_name="shared_groups",
    )

    def __str__(self):
        return self.name


class GroupInvitation(TimeStamped):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        REVOKED = "revoked", "Revoked"

    group = models.ForeignKey(
        "Group", on_delete=models.CASCADE, related_name="invitations"
    )
    inviter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_group_invitations",
    )
    invitee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_group_invitations",
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PENDING
    )
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["group", "invitee"],
                condition=models.Q(status="pending"),
                name="unique_pending_group_invite",
            )
        ]


class GroupMembership(TimeStamped):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=12, choices=Role.choices, default=Role.MEMBER)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["group", "user"], name="unique_group_member"
            )
        ]


class Expense(TimeStamped):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        ARCHIVED = "archived", "Archived"

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="expenses")
    title = models.CharField(max_length=180)
    category = models.CharField(max_length=40, default="Other")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="paid_expenses"
    )
    note = models.TextField(blank=True)
    occurred_on = models.DateField()
    split_mode = models.CharField(max_length=16, default="equal")
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PENDING
    )
    receipt = models.FileField(upload_to="receipts/%Y/%m/", blank=True, null=True)


class ExpenseParticipant(models.Model):
    expense = models.ForeignKey(
        Expense, on_delete=models.CASCADE, related_name="participants"
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    share_amount = models.DecimalField(max_digits=12, decimal_places=2)
    share_value = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["expense", "user"], name="unique_expense_participant"
            )
        ]


class ExpenseComment(TimeStamped):
    expense = models.ForeignKey(
        Expense, on_delete=models.CASCADE, related_name="comments"
    )
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    body = models.CharField(max_length=1000)
    attachments = models.JSONField(default=list, blank=True)


class Settlement(TimeStamped):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        CONFIRMED = "confirmed", "Confirmed"
        DECLINED = "declined", "Declined"

    group = models.ForeignKey(
        Group, on_delete=models.CASCADE, related_name="settlements"
    )
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="settlements_sent",
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="settlements_received",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.REQUESTED
    )
    note = models.CharField(max_length=255, blank=True)
    payment_method = models.CharField(max_length=40, blank=True)
    payment_reference = models.CharField(max_length=120, blank=True)
    proof = models.FileField(
        upload_to="settlement-proofs/%Y/%m/", blank=True, null=True
    )
    paid_at = models.DateTimeField(null=True, blank=True)


class Budget(TimeStamped):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="budgets")
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=40, default="All")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    period = models.CharField(max_length=20, default="monthly")
    starts_on = models.DateField()
    is_active = models.BooleanField(default=True)


class RecurringExpense(TimeStamped):
    class Frequency(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    group = models.ForeignKey(
        Group, on_delete=models.CASCADE, related_name="recurring_expenses"
    )
    title = models.CharField(max_length=180)
    category = models.CharField(max_length=40, default="Other")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    frequency = models.CharField(
        max_length=12, choices=Frequency.choices, default=Frequency.MONTHLY
    )
    next_run = models.DateField()
    split_mode = models.CharField(max_length=16, default="equal")
    is_active = models.BooleanField(default=True)
    last_created_expense = models.ForeignKey(
        Expense,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_by_recurring",
    )


class ActivityEvent(TimeStamped):
    group = models.ForeignKey(
        Group, on_delete=models.CASCADE, related_name="activity_events"
    )
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    action = models.CharField(max_length=60)
    target = models.CharField(max_length=180)
    metadata = models.JSONField(default=dict, blank=True)


class Notification(TimeStamped):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    kind = models.CharField(max_length=40, default="info")
    title = models.CharField(max_length=180)
    body = models.CharField(max_length=500, blank=True)
    target_url = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)


class Poll(TimeStamped):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="polls")
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    question = models.CharField(max_length=240)
    closes_at = models.DateTimeField(null=True, blank=True)
    is_closed = models.BooleanField(default=False)


class PollOption(TimeStamped):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="options")
    label = models.CharField(max_length=160)


class PollVote(TimeStamped):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="votes")
    option = models.ForeignKey(
        PollOption, on_delete=models.CASCADE, related_name="votes"
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["poll", "user"], name="unique_poll_vote")
        ]


class GroupEvent(TimeStamped):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="events")
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    starts_at = models.DateTimeField()
    location = models.CharField(max_length=180, blank=True)
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    checklist = models.JSONField(default=list, blank=True)
    attendees = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="group_events", blank=True
    )


class ChatMessage(TimeStamped):
    class Kind(models.TextChoices):
        GROUP = "group", "Group"
        DIRECT = "direct", "Direct"

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="chat_messages",
        null=True,
        blank=True,
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_chat_messages",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_chat_messages",
        null=True,
        blank=True,
    )
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.GROUP)
    body = models.TextField(max_length=2000, blank=True)
    attachments = models.JSONField(default=list, blank=True)
    reactions = models.JSONField(default=list, blank=True)
    reply_to = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="replies"
    )
    related_expense = models.ForeignKey(
        Expense, on_delete=models.SET_NULL, null=True, blank=True
    )
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]


class GroupComment(TimeStamped):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    body = models.CharField(max_length=1000)
    attachments = models.JSONField(default=list, blank=True)
