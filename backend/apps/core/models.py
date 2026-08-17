from django.conf import settings
from django.db import models


class TimeStamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UserProfile(TimeStamped):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    avatar = models.ImageField(upload_to="avatars/%Y/%m/", blank=True, null=True)
    bio = models.CharField(max_length=240, blank=True)
    status = models.CharField(max_length=80, default="Available")
    theme = models.CharField(max_length=32, default="default")

    def __str__(self):
        return f"{self.user.username} profile"


class Group(TimeStamped):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    emoji = models.CharField(max_length=8, default="✦")
    currency = models.CharField(max_length=3, default="BDT")
    currency_symbol = models.CharField(max_length=4, default="৳")
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_groups")
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through="GroupMembership", related_name="shared_groups")

    def __str__(self):
        return self.name


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
        constraints = [models.UniqueConstraint(fields=["group", "user"], name="unique_group_member")]


class Expense(TimeStamped):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        ARCHIVED = "archived", "Archived"

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="expenses")
    title = models.CharField(max_length=180)
    category = models.CharField(max_length=40, default="Other")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="paid_expenses")
    note = models.TextField(blank=True)
    occurred_on = models.DateField()
    split_mode = models.CharField(max_length=16, default="equal")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    receipt = models.FileField(upload_to="receipts/%Y/%m/", blank=True, null=True)


class ExpenseParticipant(models.Model):
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    share_amount = models.DecimalField(max_digits=12, decimal_places=2)
    share_value = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["expense", "user"], name="unique_expense_participant")]


class Settlement(TimeStamped):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        CONFIRMED = "confirmed", "Confirmed"
        DECLINED = "declined", "Declined"

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="settlements")
    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="settlements_sent")
    to_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="settlements_received")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.REQUESTED)
    note = models.CharField(max_length=255, blank=True)


class ChatMessage(TimeStamped):
    class Kind(models.TextChoices):
        GROUP = "group", "Group"
        DIRECT = "direct", "Direct"

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="chat_messages", null=True, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_chat_messages")
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_chat_messages", null=True, blank=True)
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.GROUP)
    body = models.TextField(max_length=2000, blank=True)
    attachments = models.JSONField(default=list, blank=True)
    reactions = models.JSONField(default=list, blank=True)
    reply_to = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="replies")
    related_expense = models.ForeignKey(Expense, on_delete=models.SET_NULL, null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
