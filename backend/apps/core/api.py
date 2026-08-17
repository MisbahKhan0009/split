from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    ActivityEvent, Budget, ChatMessage, Expense, ExpenseComment, ExpenseParticipant,
    Group, GroupEvent, GroupMembership, GroupComment, Notification, Poll, PollOption,
    PollVote, RecurringExpense, Settlement, UserProfile,
)

User = get_user_model()


def user_display(user):
    return user.get_full_name() or user.username


def member_of(user, group):
    return group.members.filter(id=user.id).exists()


def log_activity(group, actor, action, target, metadata=None):
    event = ActivityEvent.objects.create(group=group, actor=actor, action=action, target=target, metadata=metadata or {})
    for member_id in group.members.values_list("id", flat=True):
        if member_id != actor.id:
            Notification.objects.create(user_id=member_id, group=group, kind="activity", title=f"{user_display(actor)} {action}", body=target)
    return event


class ProfileSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ["name", "initials", "avatar", "bio", "status", "theme", "updated_at"]

    def get_name(self, obj):
        return user_display(obj.user)

    def get_initials(self, obj):
        return "".join(part[0] for part in user_display(obj.user).split()[:2]).upper()


class MemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField()
    name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()

    class Meta:
        model = GroupMembership
        fields = ["user_id", "name", "role", "initials", "profile"]

    def get_name(self, obj):
        return user_display(obj.user)

    def get_initials(self, obj):
        return "".join(part[0] for part in user_display(obj.user).split()[:2]).upper()

    def get_profile(self, obj):
        profile, _ = UserProfile.objects.get_or_create(user=obj.user)
        return ProfileSerializer(profile, context=self.context).data


class GroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    members_detail = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ["id", "name", "slug", "emoji", "currency", "currency_symbol", "description", "member_count", "members_detail", "created_at"]
        read_only_fields = ["owner", "currency", "currency_symbol"]

    def get_member_count(self, obj):
        return obj.members.count()

    def get_members_detail(self, obj):
        return MemberSerializer(obj.groupmembership_set.select_related("user"), many=True, context=self.context).data

    def create(self, validated_data):
        user = self.context["request"].user
        group = Group.objects.create(owner=user, currency="BDT", currency_symbol="৳", **validated_data)
        GroupMembership.objects.create(group=group, user=user, role=GroupMembership.Role.OWNER)
        log_activity(group, user, "created group", group.name)
        return group


class ParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseParticipant
        fields = ["user", "user_name", "share_amount", "share_value"]

    def get_user_name(self, obj):
        return user_display(obj.user)


class ExpenseCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseComment
        fields = ["id", "expense", "author", "author_name", "body", "attachments", "created_at"]
        read_only_fields = ["author", "author_name"]

    def get_author_name(self, obj):
        return user_display(obj.author)


class ExpenseSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, required=False)
    comments = ExpenseCommentSerializer(many=True, read_only=True)
    payer_name = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = ["id", "group", "title", "category", "amount", "currency", "payer", "payer_name", "note", "occurred_on", "split_mode", "status", "receipt", "participants", "comments", "created_at"]
        read_only_fields = ["status", "currency", "payer_name", "comments"]

    def get_payer_name(self, obj):
        return user_display(obj.payer)

    def get_currency(self, obj):
        return {"code": "BDT", "symbol": "৳"}

    def validate(self, attrs):
        if attrs["amount"] <= 0:
            raise serializers.ValidationError({"amount": "Expense amount must be greater than zero."})
        if attrs.get("split_mode", "equal") not in {"equal", "exact", "percentage", "shares"}:
            raise serializers.ValidationError({"split_mode": "Unsupported split mode."})
        group = attrs.get("group")
        request = self.context.get("request")
        if group and request and not member_of(request.user, group):
            raise serializers.ValidationError({"group": "You must be an active group member."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        participant_data = validated_data.pop("participants", [])
        expense = Expense.objects.create(**validated_data)
        if participant_data:
            total = sum(Decimal(item["share_amount"]) for item in participant_data)
            if expense.split_mode in {"exact", "equal"} and total != expense.amount:
                raise serializers.ValidationError({"participants": f"Participant shares must equal {expense.amount}."})
            ExpenseParticipant.objects.bulk_create([ExpenseParticipant(expense=expense, **item) for item in participant_data])
        log_activity(expense.group, expense.payer, "added expense", expense.title, {"expense_id": expense.id, "amount": str(expense.amount)})
        return expense


class SettlementSerializer(serializers.ModelSerializer):
    currency = serializers.SerializerMethodField()
    from_name = serializers.SerializerMethodField()
    to_name = serializers.SerializerMethodField()

    class Meta:
        model = Settlement
        fields = ["id", "group", "from_user", "from_name", "to_user", "to_name", "amount", "currency", "status", "note", "payment_method", "payment_reference", "proof", "paid_at", "created_at"]
        read_only_fields = ["status", "currency", "from_name", "to_name", "paid_at"]

    def get_currency(self, obj):
        return {"code": "BDT", "symbol": "৳"}

    def get_from_name(self, obj):
        return user_display(obj.from_user)

    def get_to_name(self, obj):
        return user_display(obj.to_user)

    def validate(self, attrs):
        request = self.context.get("request")
        group = attrs.get("group")
        if group and request and not member_of(request.user, group):
            raise serializers.ValidationError({"group": "You must be an active group member."})
        if attrs.get("amount", 0) <= 0:
            raise serializers.ValidationError({"amount": "Settlement amount must be greater than zero."})
        return attrs


class BudgetSerializer(serializers.ModelSerializer):
    spent = serializers.SerializerMethodField()
    percent = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = ["id", "group", "name", "category", "amount", "spent", "percent", "currency", "period", "starts_on", "is_active", "created_at"]
        read_only_fields = ["spent", "percent", "currency"]

    def get_spent(self, obj):
        query = obj.group.expenses.filter(status__in=[Expense.Status.PENDING, Expense.Status.CONFIRMED])
        if obj.category != "All":
            query = query.filter(category=obj.category)
        return query.aggregate(total=Sum("amount"))["total"] or Decimal("0")

    def get_percent(self, obj):
        if not obj.amount:
            return 0
        return min(100, round(float(self.get_spent(obj) / obj.amount * 100), 1))

    def get_currency(self, obj):
        return {"code": "BDT", "symbol": "৳"}


class RecurringExpenseSerializer(serializers.ModelSerializer):
    payer_name = serializers.SerializerMethodField()

    class Meta:
        model = RecurringExpense
        fields = ["id", "group", "title", "category", "amount", "payer", "payer_name", "frequency", "next_run", "split_mode", "is_active", "last_created_expense", "created_at"]
        read_only_fields = ["payer_name", "last_created_expense"]

    def get_payer_name(self, obj):
        return user_display(obj.payer)


class ActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_initials = serializers.SerializerMethodField()

    class Meta:
        model = ActivityEvent
        fields = ["id", "group", "actor", "actor_name", "actor_initials", "action", "target", "metadata", "created_at"]

    def get_actor_name(self, obj):
        return user_display(obj.actor)

    def get_actor_initials(self, obj):
        return "".join(part[0] for part in user_display(obj.actor).split()[:2]).upper()


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "group", "kind", "title", "body", "target_url", "is_read", "created_at"]


class PollOptionSerializer(serializers.ModelSerializer):
    votes = serializers.SerializerMethodField()

    class Meta:
        model = PollOption
        fields = ["id", "label", "votes"]

    def get_votes(self, obj):
        return obj.votes.count()


class PollSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True, read_only=True)
    creator_name = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = ["id", "group", "creator", "creator_name", "question", "options", "total_votes", "closes_at", "is_closed", "created_at"]
        read_only_fields = ["creator", "creator_name", "options", "total_votes"]

    def get_creator_name(self, obj):
        return user_display(obj.creator)

    def get_total_votes(self, obj):
        return obj.votes.count()


class GroupEventSerializer(serializers.ModelSerializer):
    creator_name = serializers.SerializerMethodField()
    attendee_count = serializers.SerializerMethodField()

    class Meta:
        model = GroupEvent
        fields = ["id", "group", "creator", "creator_name", "title", "description", "starts_at", "location", "budget", "checklist", "attendees", "attendee_count", "created_at"]
        read_only_fields = ["creator", "creator_name", "attendee_count"]

    def get_creator_name(self, obj):
        return user_display(obj.creator)

    def get_attendee_count(self, obj):
        return obj.attendees.count()


class GroupCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = GroupComment
        fields = ["id", "group", "author", "author_name", "body", "attachments", "created_at"]
        read_only_fields = ["author", "author_name"]

    def get_author_name(self, obj):
        return user_display(obj.author)


class ChatMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_initials = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ["id", "group", "author", "author_name", "author_initials", "recipient", "recipient_name", "kind", "body", "attachments", "reactions", "reply_to", "related_expense", "read_at", "created_at"]
        read_only_fields = ["author", "author_name", "author_initials", "created_at"]

    def get_author_name(self, obj):
        return user_display(obj.author)

    def get_author_initials(self, obj):
        return "".join(part[0] for part in user_display(obj.author).split()[:2]).upper()

    def get_recipient_name(self, obj):
        return user_display(obj.recipient) if obj.recipient else None


class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(members=self.request.user).distinct().prefetch_related("members")

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["get"])
    def summary(self, request, pk=None):
        group = self.get_object()
        expenses = group.expenses.filter(status__in=[Expense.Status.PENDING, Expense.Status.CONFIRMED])
        total = expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        category_totals = list(expenses.values("category").annotate(total=Sum("amount")).order_by("-total")[:8])
        return Response({"group": group.name, "currency": {"code": "BDT", "symbol": "৳"}, "total_spend": total, "expense_count": expenses.count(), "member_count": group.members.count(), "category_totals": category_totals})

    @action(detail=True, methods=["get"])
    def settlement_plan(self, request, pk=None):
        group = self.get_object()
        balances = {user.id: Decimal("0") for user in group.members.all()}
        for expense in group.expenses.filter(status__in=[Expense.Status.PENDING, Expense.Status.CONFIRMED]).prefetch_related("participants"):
            balances[expense.payer_id] += expense.amount
            for participant in expense.participants.all():
                balances[participant.user_id] -= participant.share_amount
        creditors = [[uid, amount] for uid, amount in balances.items() if amount > Decimal("0.01")]
        debtors = [[uid, -amount] for uid, amount in balances.items() if amount < Decimal("-0.01")]
        transfers = []
        i = j = 0
        while i < len(debtors) and j < len(creditors):
            amount = min(debtors[i][1], creditors[j][1])
            transfers.append({"from_user": debtors[i][0], "to_user": creditors[j][0], "amount": amount})
            debtors[i][1] -= amount; creditors[j][1] -= amount
            if debtors[i][1] <= Decimal("0.01"): i += 1
            if creditors[j][1] <= Decimal("0.01"): j += 1
        names = {u.id: user_display(u) for u in group.members.all()}
        return Response({"currency": {"code": "BDT", "symbol": "৳"}, "transfers": [{**item, "from_name": names[item["from_user"]], "to_name": names[item["to_user"]]} for item in transfers]})


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Expense.objects.filter(group__members=self.request.user).select_related("payer").prefetch_related("participants", "comments")
        group_id = self.request.query_params.get("group")
        return queryset.filter(group_id=group_id) if group_id else queryset

    @action(detail=True, methods=["post"])
    def comment(self, request, pk=None):
        expense = self.get_object()
        serializer = ExpenseCommentSerializer(data={"expense": expense.id, "body": request.data.get("body", ""), "attachments": request.data.get("attachments", [])})
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(author=request.user)
        log_activity(expense.group, request.user, "commented on", expense.title, {"expense_id": expense.id})
        return Response(ExpenseCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class SettlementViewSet(viewsets.ModelViewSet):
    serializer_class = SettlementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Settlement.objects.filter(group__members=self.request.user).select_related("from_user", "to_user")
        group_id = self.request.query_params.get("group")
        return queryset.filter(group_id=group_id) if group_id else queryset

    def perform_create(self, serializer):
        settlement = serializer.save()
        log_activity(settlement.group, self.request.user, "requested settlement", f"৳ {settlement.amount}")

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        settlement = self.get_object()
        settlement.status = Settlement.Status.CONFIRMED
        settlement.paid_at = timezone.now()
        settlement.save(update_fields=["status", "paid_at", "updated_at"])
        Notification.objects.create(user=settlement.to_user, group=settlement.group, kind="settlement", title="Settlement confirmed", body=f"৳ {settlement.amount} was marked as paid.")
        log_activity(settlement.group, request.user, "confirmed settlement", f"৳ {settlement.amount}")
        return Response(self.get_serializer(settlement).data)

    @action(detail=False, methods=["get"])
    def optimized(self, request):
        group_id = request.query_params.get("group")
        if not group_id:
            return Response({"transfers": []})
        return GroupViewSet().settlement_plan(request, pk=group_id)


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Budget.objects.filter(group__members=self.request.user)

    def perform_create(self, serializer):
        budget = serializer.save()
        log_activity(budget.group, self.request.user, "created budget", budget.name)


class RecurringExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RecurringExpense.objects.filter(group__members=self.request.user)

    def perform_create(self, serializer):
        recurring = serializer.save()
        log_activity(recurring.group, self.request.user, "scheduled recurring expense", recurring.title)

    @action(detail=True, methods=["post"])
    def generate_now(self, request, pk=None):
        recurring = self.get_object()
        expense = Expense.objects.create(group=recurring.group, title=recurring.title, category=recurring.category, amount=recurring.amount, payer=recurring.payer, occurred_on=date.today(), split_mode=recurring.split_mode, status=Expense.Status.PENDING)
        recurring.last_created_expense = expense
        recurring.next_run = date.today() + (timedelta(days=7) if recurring.frequency == "weekly" else timedelta(days=365) if recurring.frequency == "yearly" else timedelta(days=30))
        recurring.save(update_fields=["last_created_expense", "next_run", "updated_at"])
        log_activity(recurring.group, request.user, "generated recurring expense", expense.title, {"expense_id": expense.id})
        return Response(ExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)


class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ActivityEvent.objects.filter(group__members=self.request.user).select_related("actor")
        group_id = self.request.query_params.get("group")
        return queryset.filter(group_id=group_id) if group_id else queryset


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related("group")

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"updated": True})


class PollViewSet(viewsets.ModelViewSet):
    serializer_class = PollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Poll.objects.filter(group__members=self.request.user).prefetch_related("options", "votes")

    def perform_create(self, serializer):
        poll = serializer.save(creator=self.request.user)
        for label in self.request.data.get("options", []):
            PollOption.objects.create(poll=poll, label=label)
        log_activity(poll.group, self.request.user, "started poll", poll.question)

    @action(detail=True, methods=["post"])
    def vote(self, request, pk=None):
        poll = self.get_object()
        option = poll.options.get(pk=request.data.get("option"))
        PollVote.objects.update_or_create(poll=poll, user=request.user, defaults={"option": option})
        return Response(self.get_serializer(poll).data)


class GroupEventViewSet(viewsets.ModelViewSet):
    serializer_class = GroupEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GroupEvent.objects.filter(group__members=self.request.user).prefetch_related("attendees")

    def perform_create(self, serializer):
        event = serializer.save(creator=self.request.user)
        event.attendees.add(self.request.user)
        log_activity(event.group, self.request.user, "created event", event.title)

    @action(detail=True, methods=["post"])
    def rsvp(self, request, pk=None):
        event = self.get_object()
        if request.user in event.attendees.all():
            event.attendees.remove(request.user)
        else:
            event.attendees.add(request.user)
        return Response(self.get_serializer(event).data)


class GroupCommentViewSet(viewsets.ModelViewSet):
    serializer_class = GroupCommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GroupComment.objects.filter(group__members=self.request.user).select_related("author")

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        log_activity(comment.group, self.request.user, "posted group note", comment.body[:80])


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.filter(user__shared_groups__members=self.request.user).distinct()

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if request.method == "PATCH":
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(self.get_serializer(profile).data)


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        group_id = self.request.query_params.get("group")
        recipient_id = self.request.query_params.get("recipient")
        if group_id:
            return ChatMessage.objects.filter(group_id=group_id, group__members=user).select_related("author", "recipient")
        if recipient_id:
            return ChatMessage.objects.filter(kind=ChatMessage.Kind.DIRECT).filter(Q(author=user, recipient_id=recipient_id) | Q(author_id=recipient_id, recipient=user)).select_related("author", "recipient")
        return ChatMessage.objects.filter(Q(author=user) | Q(recipient=user)).select_related("author", "recipient")

    def perform_create(self, serializer):
        kind = serializer.validated_data.get("kind", ChatMessage.Kind.GROUP)
        group = serializer.validated_data.get("group")
        recipient = serializer.validated_data.get("recipient")
        if kind == ChatMessage.Kind.GROUP and (not group or not member_of(self.request.user, group)):
            raise serializers.ValidationError({"group": "You must be an active group member."})
        if kind == ChatMessage.Kind.DIRECT and (not recipient or not self.request.user.shared_groups.filter(members=recipient).exists()):
            raise serializers.ValidationError({"recipient": "You can only message a shared group member."})
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"])
    def react(self, request, pk=None):
        message = self.get_object()
        emoji = request.data.get("emoji", "👍")
        reactions = [reaction for reaction in message.reactions if reaction.get("emoji") != emoji]
        existing = next((reaction for reaction in message.reactions if reaction.get("emoji") == emoji), None)
        reactions.append({"emoji": emoji, "count": (existing.get("count", 0) if existing else 0) + 1, "user_id": request.user.id})
        message.reactions = reactions
        message.save(update_fields=["reactions", "updated_at"])
        return Response(self.get_serializer(message).data)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        message = self.get_object()
        message.read_at = timezone.now()
        message.save(update_fields=["read_at", "updated_at"])
        return Response(self.get_serializer(message).data)
