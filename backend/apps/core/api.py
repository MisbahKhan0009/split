import uuid
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .auth import record_account_activity
from .chat import (
    broadcast_message_event,
    is_active_member,
    normalize_reactions,
    share_active_group,
    toggle_reaction,
    visible_messages,
)
from .models import (
    ActivityEvent,
    Budget,
    ChatMessage,
    Expense,
    ExpenseComment,
    ExpenseParticipant,
    Group,
    GroupComment,
    GroupEvent,
    GroupInvitation,
    GroupMembership,
    Notification,
    Poll,
    PollOption,
    PollVote,
    RecurringExpense,
    Settlement,
    UserProfile,
)

User = get_user_model()


def user_display(user):
    return user.get_full_name() or user.username


def member_of(user, group):
    return GroupMembership.objects.filter(
        user=user, group=group, is_active=True
    ).exists()


def log_activity(group, actor, action, target, metadata=None):
    event = ActivityEvent.objects.create(
        group=group, actor=actor, action=action, target=target, metadata=metadata or {}
    )
    for member_id in group.members.values_list("id", flat=True):
        if member_id != actor.id:
            Notification.objects.create(
                user_id=member_id,
                group=group,
                kind="activity",
                title=f"{user_display(actor)} {action}",
                body=target,
            )
    return event


class UserDirectorySerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "display_name",
            "initials",
            "avatar",
        ]

    def get_display_name(self, obj):
        return user_display(obj)

    def get_initials(self, obj):
        return "".join(part[0] for part in user_display(obj).split()[:2]).upper()

    def get_avatar(self, obj):
        # Reverse one-to-one raises an AttributeError subclass, so getattr default is safe.
        profile = getattr(obj, "profile", None)
        if not profile or not profile.avatar:
            return None
        request = self.context.get("request")
        return (
            request.build_absolute_uri(profile.avatar.url)
            if request
            else profile.avatar.url
        )


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


class GroupInvitationSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="group.name", read_only=True)
    inviter_name = serializers.SerializerMethodField()
    invitee_name = serializers.SerializerMethodField()
    invitee_username = serializers.CharField(source="invitee.username", read_only=True)
    token = serializers.UUIDField(read_only=True)
    invite_url = serializers.SerializerMethodField()

    class Meta:
        model = GroupInvitation
        fields = [
            "id",
            "group",
            "group_name",
            "inviter",
            "inviter_name",
            "invitee",
            "invitee_name",
            "invitee_username",
            "token",
            "invite_url",
            "status",
            "accepted_at",
            "created_at",
        ]
        read_only_fields = ["inviter", "token", "status", "accepted_at", "created_at"]

    def get_inviter_name(self, obj):
        return user_display(obj.inviter)

    def get_invitee_name(self, obj):
        return user_display(obj.invitee)

    def get_invite_url(self, obj):
        request = self.context.get("request")
        path = f"/invitations/{obj.token}/"
        return request.build_absolute_uri(path) if request else path


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
        try:
            profile = obj.user.profile
        except UserProfile.DoesNotExist:
            profile, _ = UserProfile.objects.get_or_create(user=obj.user)
        return ProfileSerializer(profile, context=self.context).data


class GroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    members_detail = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "slug",
            "emoji",
            "currency",
            "currency_symbol",
            "description",
            "member_count",
            "members_detail",
            "created_at",
        ]
        read_only_fields = ["owner", "currency", "currency_symbol"]

    def get_member_count(self, obj):
        return obj.groupmembership_set.filter(is_active=True).count()

    def get_members_detail(self, obj):
        memberships = obj.groupmembership_set.filter(is_active=True).select_related(
            "user", "user__profile"
        )
        return MemberSerializer(memberships, many=True, context=self.context).data

    def create(self, validated_data):
        user = self.context["request"].user
        group = Group.objects.create(
            owner=user, currency="BDT", currency_symbol="৳", **validated_data
        )
        GroupMembership.objects.create(
            group=group, user=user, role=GroupMembership.Role.OWNER
        )
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
        fields = [
            "id",
            "expense",
            "author",
            "author_name",
            "body",
            "attachments",
            "created_at",
        ]
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
        fields = [
            "id",
            "group",
            "title",
            "category",
            "amount",
            "currency",
            "payer",
            "payer_name",
            "note",
            "occurred_on",
            "split_mode",
            "status",
            "receipt",
            "participants",
            "comments",
            "created_at",
        ]
        read_only_fields = ["status", "currency", "payer_name", "comments"]

    def get_payer_name(self, obj):
        return user_display(obj.payer)

    def get_currency(self, obj):
        return {"code": "BDT", "symbol": "৳"}

    def validate(self, attrs):
        # On a partial update (e.g. PATCHing only the receipt file), fields not
        # included in this request are absent from attrs; fall back to the
        # existing instance so those checks don't crash on a KeyError.
        amount = attrs.get("amount", getattr(self.instance, "amount", None))
        if amount is not None and amount <= 0:
            raise serializers.ValidationError(
                {"amount": "Expense amount must be greater than zero."}
            )
        split_mode = attrs.get(
            "split_mode", getattr(self.instance, "split_mode", "equal")
        )
        if split_mode not in {"equal", "exact", "percentage", "shares"}:
            raise serializers.ValidationError({"split_mode": "Unsupported split mode."})
        group = attrs.get("group", getattr(self.instance, "group", None))
        request = self.context.get("request")
        if group and request and not member_of(request.user, group):
            raise serializers.ValidationError(
                {"group": "You must be an active group member."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        participant_data = validated_data.pop("participants", [])
        expense = Expense.objects.create(**validated_data)
        if participant_data:
            total = sum(Decimal(item["share_amount"]) for item in participant_data)
            # Allow a small rounding tolerance (e.g. splitting ৳100 three ways
            # can legitimately sum to 99.99 or 100.01 depending on how a
            # client rounds each share). Reject only real mismatches.
            if expense.split_mode in {
                "exact",
                "equal",
            } and abs(
                total - expense.amount
            ) > Decimal("0.02"):
                raise serializers.ValidationError(
                    {"participants": f"Participant shares must equal {expense.amount}."}
                )
            ExpenseParticipant.objects.bulk_create(
                [
                    ExpenseParticipant(expense=expense, **item)
                    for item in participant_data
                ]
            )
        log_activity(
            expense.group,
            expense.payer,
            "added expense",
            expense.title,
            {"expense_id": expense.id, "amount": str(expense.amount)},
        )
        return expense


class SettlementSerializer(serializers.ModelSerializer):
    currency = serializers.SerializerMethodField()
    from_name = serializers.SerializerMethodField()
    to_name = serializers.SerializerMethodField()

    class Meta:
        model = Settlement
        fields = [
            "id",
            "group",
            "from_user",
            "from_name",
            "to_user",
            "to_name",
            "amount",
            "currency",
            "status",
            "note",
            "payment_method",
            "payment_reference",
            "proof",
            "paid_at",
            "created_at",
        ]
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
            raise serializers.ValidationError(
                {"group": "You must be an active group member."}
            )
        if attrs.get("amount", 0) <= 0:
            raise serializers.ValidationError(
                {"amount": "Settlement amount must be greater than zero."}
            )
        return attrs


class BudgetSerializer(serializers.ModelSerializer):
    spent = serializers.SerializerMethodField()
    percent = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            "id",
            "group",
            "name",
            "category",
            "amount",
            "spent",
            "percent",
            "currency",
            "period",
            "starts_on",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["spent", "percent", "currency"]

    def get_spent(self, obj):
        query = obj.group.expenses.filter(
            status__in=[Expense.Status.PENDING, Expense.Status.CONFIRMED]
        )
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
        fields = [
            "id",
            "group",
            "title",
            "category",
            "amount",
            "payer",
            "payer_name",
            "frequency",
            "next_run",
            "split_mode",
            "is_active",
            "last_created_expense",
            "created_at",
        ]
        read_only_fields = ["payer_name", "last_created_expense"]

    def get_payer_name(self, obj):
        return user_display(obj.payer)


class ActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_initials = serializers.SerializerMethodField()

    class Meta:
        model = ActivityEvent
        fields = [
            "id",
            "group",
            "actor",
            "actor_name",
            "actor_initials",
            "action",
            "target",
            "metadata",
            "created_at",
        ]

    def get_actor_name(self, obj):
        return user_display(obj.actor)

    def get_actor_initials(self, obj):
        return "".join(part[0] for part in user_display(obj.actor).split()[:2]).upper()


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "group",
            "kind",
            "title",
            "body",
            "target_url",
            "is_read",
            "created_at",
        ]


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
        fields = [
            "id",
            "group",
            "creator",
            "creator_name",
            "question",
            "options",
            "total_votes",
            "closes_at",
            "is_closed",
            "created_at",
        ]
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
        fields = [
            "id",
            "group",
            "creator",
            "creator_name",
            "title",
            "description",
            "starts_at",
            "location",
            "budget",
            "checklist",
            "attendees",
            "attendee_count",
            "created_at",
        ]
        read_only_fields = ["creator", "creator_name", "attendee_count"]

    def get_creator_name(self, obj):
        return user_display(obj.creator)

    def get_attendee_count(self, obj):
        return obj.attendees.count()


class GroupCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = GroupComment
        fields = [
            "id",
            "group",
            "author",
            "author_name",
            "body",
            "attachments",
            "created_at",
        ]
        read_only_fields = ["author", "author_name"]

    def get_author_name(self, obj):
        return user_display(obj.author)


class ChatMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_initials = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()
    reply_preview = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "group",
            "author",
            "author_name",
            "author_initials",
            "recipient",
            "recipient_name",
            "kind",
            "body",
            "attachments",
            "reactions",
            "reply_to",
            "reply_preview",
            "related_expense",
            "read_at",
            "created_at",
        ]
        read_only_fields = ["author", "author_name", "author_initials", "created_at"]

    def get_author_name(self, obj):
        return user_display(obj.author)

    def get_author_initials(self, obj):
        return "".join(part[0] for part in user_display(obj.author).split()[:2]).upper()

    def get_recipient_name(self, obj):
        return user_display(obj.recipient) if obj.recipient else None

    def get_reactions(self, obj):
        request = self.context.get("request")
        user_id = request.user.id if request and request.user.is_authenticated else None
        return normalize_reactions(obj.reactions, user_id)

    def get_reply_preview(self, obj):
        if not obj.reply_to_id:
            return None
        return {
            "id": obj.reply_to_id,
            "author_name": user_display(obj.reply_to.author),
            "body": obj.reply_to.body,
        }

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None
        instance = self.instance
        kind = attrs.get("kind", instance.kind if instance else ChatMessage.Kind.GROUP)
        group = attrs.get("group", instance.group if instance else None)
        recipient = attrs.get("recipient", instance.recipient if instance else None)
        body = str(attrs.get("body", instance.body if instance else "") or "").strip()
        attachments = attrs.get("attachments", instance.attachments if instance else [])
        reply_to = attrs.get("reply_to", instance.reply_to if instance else None)

        if kind == ChatMessage.Kind.GROUP:
            if not group or recipient:
                raise serializers.ValidationError(
                    "Group messages require a group and cannot have a recipient."
                )
            if not user or not is_active_member(user.id, group.id):
                raise serializers.ValidationError(
                    {"group": "You must be an active group member."}
                )
        elif kind == ChatMessage.Kind.DIRECT:
            if not recipient or group:
                raise serializers.ValidationError(
                    "Direct messages require a recipient and cannot have a group."
                )
            if (
                not user
                or recipient.id == user.id
                or not share_active_group(user.id, recipient.id)
            ):
                raise serializers.ValidationError(
                    {"recipient": "You can only message an active shared-group member."}
                )
        else:
            raise serializers.ValidationError({"kind": "Unsupported message kind."})

        if not body and not attachments:
            raise serializers.ValidationError(
                "A message needs text or at least one attachment."
            )
        if not isinstance(attachments, list):
            raise serializers.ValidationError(
                {"attachments": "Attachments must be a list."}
            )
        if reply_to:
            same_group = (
                kind == ChatMessage.Kind.GROUP
                and reply_to.kind == kind
                and reply_to.group_id == group.id
            )
            direct_users = (
                {user.id, recipient.id} if kind == ChatMessage.Kind.DIRECT else set()
            )
            reply_users = (
                {reply_to.author_id, reply_to.recipient_id}
                if reply_to.kind == ChatMessage.Kind.DIRECT
                else set()
            )
            if not same_group and direct_users != reply_users:
                raise serializers.ValidationError(
                    {"reply_to": "Replies must reference the same conversation."}
                )
        attrs["body"] = body
        return attrs


class UserDirectoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserDirectorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            User.objects.filter(is_active=True)
            .exclude(id=self.request.user.id)
            .select_related("profile")
            .order_by("username")
        )
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )
        return queryset[:20]


class GroupInvitationViewSet(viewsets.ModelViewSet):
    serializer_class = GroupInvitationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        return (
            GroupInvitation.objects.filter(Q(invitee=user) | Q(inviter=user))
            .select_related("group", "inviter", "invitee")
            .order_by("-created_at")
        )

    def create(self, request, *args, **kwargs):
        group_id = request.data.get("group")
        username = str(request.data.get("username", "")).strip()
        if not group_id or not username:
            raise serializers.ValidationError(
                {"group": "Group and username are required."}
            )
        group = Group.objects.filter(pk=group_id, members=request.user).first()
        if not group:
            raise serializers.ValidationError(
                {"group": "You must be an active member of this group."}
            )
        invitee = User.objects.filter(username__iexact=username, is_active=True).first()
        if not invitee:
            raise serializers.ValidationError(
                {"username": "No active user was found with that username."}
            )
        if (
            invitee.id == request.user.id
            or group.members.filter(pk=invitee.id).exists()
        ):
            raise serializers.ValidationError(
                {"username": "That user is already a member of this group."}
            )
        invitation, created = GroupInvitation.objects.get_or_create(
            group=group,
            invitee=invitee,
            status=GroupInvitation.Status.PENDING,
            defaults={"inviter": request.user},
        )
        if not created:
            invitation.inviter = request.user
            invitation.save(update_fields=["inviter", "updated_at"])
        Notification.objects.create(
            user=invitee,
            group=group,
            kind="invitation",
            title=f"{user_display(request.user)} invited you",
            body=f"Join {group.name}",
            target_url=f"/invitations/{invitation.token}/",
        )
        return Response(
            self.get_serializer(invitation).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        invitation = self.get_object()
        if invitation.invitee_id != request.user.id:
            return Response(
                {"detail": "Only the invited user can accept this invitation."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if invitation.status != GroupInvitation.Status.PENDING:
            return Response(self.get_serializer(invitation).data)
        GroupMembership.objects.get_or_create(
            group=invitation.group,
            user=request.user,
            defaults={"role": GroupMembership.Role.MEMBER, "is_active": True},
        )
        invitation.status = GroupInvitation.Status.ACCEPTED
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["status", "accepted_at", "updated_at"])
        log_activity(
            invitation.group, request.user, "joined group", invitation.group.name
        )
        Notification.objects.create(
            user=invitation.inviter,
            group=invitation.group,
            kind="invitation",
            title=f"{user_display(request.user)} joined",
            body=f"{user_display(request.user)} accepted your invitation.",
        )
        return Response(self.get_serializer(invitation).data)

    @action(detail=False, methods=["post"], url_path="accept_by_token")
    def accept_by_token(self, request):
        token = request.query_params.get("token") or request.data.get("token")
        invitation = (
            GroupInvitation.objects.filter(token=token)
            .select_related("group", "inviter", "invitee")
            .first()
        )
        if not invitation:
            return Response(
                {"detail": "Invitation link is invalid or expired."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if invitation.invitee_id != request.user.id:
            return Response(
                {
                    "detail": "Sign in as the invited username before accepting this invitation."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if invitation.status == GroupInvitation.Status.PENDING:
            GroupMembership.objects.get_or_create(
                group=invitation.group,
                user=request.user,
                defaults={"role": GroupMembership.Role.MEMBER, "is_active": True},
            )
            invitation.status = GroupInvitation.Status.ACCEPTED
            invitation.accepted_at = timezone.now()
            invitation.save(update_fields=["status", "accepted_at", "updated_at"])
            log_activity(
                invitation.group, request.user, "joined group", invitation.group.name
            )
            Notification.objects.create(
                user=invitation.inviter,
                group=invitation.group,
                kind="invitation",
                title=f"{user_display(request.user)} joined",
                body=f"{user_display(request.user)} accepted your invitation.",
            )
        return Response(self.get_serializer(invitation).data)

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        invitation = self.get_object()
        if invitation.invitee_id != request.user.id:
            return Response(
                {"detail": "Only the invited user can decline this invitation."},
                status=status.HTTP_403_FORBIDDEN,
            )
        invitation.status = GroupInvitation.Status.DECLINED
        invitation.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(invitation).data)


class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Group.objects.filter(members=self.request.user)
            .distinct()
            .prefetch_related("members")
        )

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["get"])
    def summary(self, request, pk=None):
        group = self.get_object()
        expenses = group.expenses.filter(
            status__in=[Expense.Status.PENDING, Expense.Status.CONFIRMED]
        )
        total = expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        category_totals = list(
            expenses.values("category")
            .annotate(total=Sum("amount"))
            .order_by("-total")[:8]
        )
        return Response(
            {
                "group": group.name,
                "currency": {"code": "BDT", "symbol": "৳"},
                "total_spend": total,
                "expense_count": expenses.count(),
                "member_count": group.members.count(),
                "category_totals": category_totals,
            }
        )

    @action(detail=True, methods=["get"])
    def settlement_plan(self, request, pk=None):
        group = self.get_object()
        # Use a defaultdict rather than pre-seeding balances only for current
        # members: a payer or participant on an older expense may no longer
        # be an active member (removed from the group, or was never a
        # member if the expense predates a membership change). Excluding
        # them would either KeyError or silently drop their share, so the
        # plan should account for money owed even if that member later left.
        balances = defaultdict(Decimal)
        for expense in group.expenses.filter(
            status__in=[Expense.Status.PENDING, Expense.Status.CONFIRMED]
        ).prefetch_related("participants"):
            balances[expense.payer_id] += expense.amount
            for participant in expense.participants.all():
                balances[participant.user_id] -= participant.share_amount
        creditors = [
            [uid, amount]
            for uid, amount in balances.items()
            if amount > Decimal("0.01")
        ]
        debtors = [
            [uid, -amount]
            for uid, amount in balances.items()
            if amount < Decimal("-0.01")
        ]
        transfers = []
        i = j = 0
        while i < len(debtors) and j < len(creditors):
            amount = min(debtors[i][1], creditors[j][1])
            transfers.append(
                {
                    "from_user": debtors[i][0],
                    "to_user": creditors[j][0],
                    "amount": amount,
                }
            )
            debtors[i][1] -= amount
            creditors[j][1] -= amount
            if debtors[i][1] <= Decimal("0.01"):
                i += 1
            if creditors[j][1] <= Decimal("0.01"):
                j += 1
        involved_ids = {item["from_user"] for item in transfers} | {
            item["to_user"] for item in transfers
        }
        names = {
            user.id: user_display(user)
            for user in User.objects.filter(id__in=involved_ids)
        }
        return Response(
            {
                "currency": {"code": "BDT", "symbol": "৳"},
                "transfers": [
                    {
                        **item,
                        "from_name": names.get(item["from_user"], "Former member"),
                        "to_name": names.get(item["to_user"], "Former member"),
                    }
                    for item in transfers
                ],
            }
        )


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Expense.objects.filter(group__members=self.request.user)
            .select_related("payer")
            .prefetch_related("participants", "comments")
            .order_by("-occurred_on", "-created_at")
        )
        group_id = self.request.query_params.get("group")
        return queryset.filter(group_id=group_id) if group_id else queryset

    @action(detail=True, methods=["post"])
    def comment(self, request, pk=None):
        expense = self.get_object()
        serializer = ExpenseCommentSerializer(
            data={
                "expense": expense.id,
                "body": request.data.get("body", ""),
                "attachments": request.data.get("attachments", []),
            }
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(author=request.user)
        log_activity(
            expense.group,
            request.user,
            "commented on",
            expense.title,
            {"expense_id": expense.id},
        )
        return Response(
            ExpenseCommentSerializer(comment).data, status=status.HTTP_201_CREATED
        )


class SettlementViewSet(viewsets.ModelViewSet):
    serializer_class = SettlementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Settlement.objects.filter(group__members=self.request.user)
            .select_related("from_user", "to_user")
            .order_by("-created_at")
        )
        group_id = self.request.query_params.get("group")
        return queryset.filter(group_id=group_id) if group_id else queryset

    def perform_create(self, serializer):
        group = serializer.validated_data["group"]
        from_user = serializer.validated_data["from_user"]
        to_user = serializer.validated_data["to_user"]
        requester = self.request.user
        # Anyone can request money that's owed *to* them. A settlement can
        # also be raised on someone else's behalf, but only by the group
        # owner, so members can't be pressured into paying by a random peer.
        is_owner = group.owner_id == requester.id
        if requester.id not in {from_user.id, to_user.id} and not is_owner:
            raise serializers.ValidationError(
                {
                    "detail": "Only the group owner can request a settlement on behalf of another member."
                }
            )
        if from_user.id == to_user.id:
            raise serializers.ValidationError(
                {"to_user": "A member cannot owe themselves."}
            )
        settlement = serializer.save()
        Notification.objects.create(
            user=settlement.from_user,
            group=settlement.group,
            kind="settlement",
            title=f"{user_display(requester)} requested a payment",
            body=f"You owe {user_display(settlement.to_user)} ৳ {settlement.amount}.",
            target_url=f"/settle/{settlement.id}/",
        )
        log_activity(
            settlement.group,
            requester,
            "requested settlement",
            f"৳ {settlement.amount}",
            {
                "settlement_id": settlement.id,
                "from_user": from_user.id,
                "to_user": to_user.id,
            },
        )

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        settlement = self.get_object()
        settlement.status = Settlement.Status.CONFIRMED
        settlement.paid_at = timezone.now()
        settlement.save(update_fields=["status", "paid_at", "updated_at"])
        Notification.objects.create(
            user=settlement.to_user,
            group=settlement.group,
            kind="settlement",
            title="Settlement confirmed",
            body=f"৳ {settlement.amount} was marked as paid.",
        )
        log_activity(
            settlement.group,
            request.user,
            "confirmed settlement",
            f"৳ {settlement.amount}",
        )
        return Response(self.get_serializer(settlement).data)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        """Simulate paying a settlement. No real money moves; this exists so
        the workspace can demonstrate a full request -> pay -> confirmed loop
        without integrating a real payment gateway."""
        settlement = self.get_object()
        if settlement.from_user_id != request.user.id:
            return Response(
                {"detail": "Only the person who owes this settlement can pay it."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if settlement.status != Settlement.Status.REQUESTED:
            return Response(self.get_serializer(settlement).data)
        method = str(request.data.get("payment_method", "simulated"))[:40]
        settlement.status = Settlement.Status.CONFIRMED
        settlement.payment_method = method
        settlement.payment_reference = f"SIM-{uuid.uuid4().hex[:10].upper()}"
        settlement.paid_at = timezone.now()
        settlement.save(
            update_fields=[
                "status",
                "payment_method",
                "payment_reference",
                "paid_at",
                "updated_at",
            ]
        )
        Notification.objects.create(
            user=settlement.to_user,
            group=settlement.group,
            kind="settlement",
            title=f"{user_display(request.user)} paid you",
            body=f"৳ {settlement.amount} was paid via {method} (simulated payment).",
            target_url=f"/settle/{settlement.id}/",
        )
        log_activity(
            settlement.group,
            request.user,
            "paid settlement",
            f"৳ {settlement.amount}",
            {
                "settlement_id": settlement.id,
                "payment_reference": settlement.payment_reference,
            },
        )
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
        queryset = Budget.objects.filter(group__members=self.request.user).order_by(
            "-created_at"
        )
        group_id = self.request.query_params.get("group")
        return queryset.filter(group_id=group_id) if group_id else queryset

    def perform_create(self, serializer):
        budget = serializer.save()
        log_activity(budget.group, self.request.user, "created budget", budget.name)


class RecurringExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = RecurringExpense.objects.filter(
            group__members=self.request.user
        ).order_by("-created_at")
        group_id = self.request.query_params.get("group")
        return queryset.filter(group_id=group_id) if group_id else queryset

    def perform_create(self, serializer):
        recurring = serializer.save()
        log_activity(
            recurring.group,
            self.request.user,
            "scheduled recurring expense",
            recurring.title,
        )

    @action(detail=True, methods=["post"])
    def generate_now(self, request, pk=None):
        recurring = self.get_object()
        expense = Expense.objects.create(
            group=recurring.group,
            title=recurring.title,
            category=recurring.category,
            amount=recurring.amount,
            payer=recurring.payer,
            occurred_on=date.today(),
            split_mode=recurring.split_mode,
            status=Expense.Status.PENDING,
        )
        recurring.last_created_expense = expense
        recurring.next_run = date.today() + (
            timedelta(days=7)
            if recurring.frequency == "weekly"
            else (
                timedelta(days=365)
                if recurring.frequency == "yearly"
                else timedelta(days=30)
            )
        )
        recurring.save(update_fields=["last_created_expense", "next_run", "updated_at"])
        log_activity(
            recurring.group,
            request.user,
            "generated recurring expense",
            expense.title,
            {"expense_id": expense.id},
        )
        return Response(ExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)


class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            ActivityEvent.objects.filter(group__members=self.request.user)
            .select_related("actor")
            .order_by("-created_at")
        )
        group_id = self.request.query_params.get("group")
        return queryset.filter(group_id=group_id) if group_id else queryset


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Notification.objects.filter(user=self.request.user)
            .select_related("group")
            .order_by("-created_at")
        )

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"updated": True})


class PollViewSet(viewsets.ModelViewSet):
    serializer_class = PollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Poll.objects.filter(group__members=self.request.user)
            .prefetch_related("options", "votes")
            .order_by("-created_at")
        )
        group_id = self.request.query_params.get("group")
        return queryset.filter(group_id=group_id) if group_id else queryset

    def perform_create(self, serializer):
        poll = serializer.save(creator=self.request.user)
        for label in self.request.data.get("options", []):
            PollOption.objects.create(poll=poll, label=label)
        log_activity(poll.group, self.request.user, "started poll", poll.question)

    @action(detail=True, methods=["post"])
    def vote(self, request, pk=None):
        poll = self.get_object()
        option = poll.options.get(pk=request.data.get("option"))
        PollVote.objects.update_or_create(
            poll=poll, user=request.user, defaults={"option": option}
        )
        return Response(self.get_serializer(poll).data)


class GroupEventViewSet(viewsets.ModelViewSet):
    serializer_class = GroupEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            GroupEvent.objects.filter(group__members=self.request.user)
            .prefetch_related("attendees")
            .order_by("-created_at")
        )
        group_id = self.request.query_params.get("group")
        return queryset.filter(group_id=group_id) if group_id else queryset

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
        return GroupComment.objects.filter(
            group__members=self.request.user
        ).select_related("author")

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        log_activity(
            comment.group, self.request.user, "posted group note", comment.body[:80]
        )


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.filter(
            user__shared_groups__members=self.request.user
        ).distinct()

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if request.method == "PATCH":
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            record_account_activity(
                request.user,
                "profile_update",
                "Updated profile settings",
                request,
                {"fields": list(serializer.validated_data.keys())},
            )
        return Response(self.get_serializer(profile).data)


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = visible_messages(self.request.user)
        group_id = self.request.query_params.get("group")
        recipient_id = self.request.query_params.get("recipient")
        if group_id:
            queryset = queryset.filter(kind=ChatMessage.Kind.GROUP, group_id=group_id)
        elif recipient_id:
            queryset = queryset.filter(kind=ChatMessage.Kind.DIRECT).filter(
                Q(author=self.request.user, recipient_id=recipient_id)
                | Q(author_id=recipient_id, recipient=self.request.user)
            )
        return queryset.select_related(
            "author", "recipient", "reply_to", "reply_to__author"
        )

    def perform_create(self, serializer):
        message = serializer.save(author=self.request.user)
        payload = self.get_serializer(message).data
        transaction.on_commit(
            lambda: broadcast_message_event(message, "message", {"message": payload})
        )

    @action(detail=True, methods=["post"])
    def react(self, request, pk=None):
        with transaction.atomic():
            message = self.get_queryset().select_for_update().get(pk=pk)
            toggle_reaction(message, request.data.get("emoji", "👍"), request.user.id)
            payload = self.get_serializer(message).data
            transaction.on_commit(
                lambda: broadcast_message_event(
                    message, "reaction", {"message": payload}
                )
            )
        return Response(payload)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        message = self.get_object()
        if message.author_id != request.user.id and not message.read_at:
            message.read_at = timezone.now()
            message.save(update_fields=["read_at", "updated_at"])
        payload = self.get_serializer(message).data
        transaction.on_commit(
            lambda: broadcast_message_event(
                message, "read", {"message": payload, "user_id": request.user.id}
            )
        )
        return Response(payload)

    @action(
        detail=False, methods=["post"], parser_classes=[MultiPartParser, FormParser]
    )
    def upload(self, request):
        upload = request.FILES.get("file")
        group_id = request.data.get("group")
        recipient_id = request.data.get("recipient")
        if bool(group_id) == bool(recipient_id):
            raise serializers.ValidationError(
                "Provide exactly one group or recipient target."
            )
        if group_id and not is_active_member(request.user.id, group_id):
            raise serializers.ValidationError(
                {"group": "You must be an active group member."}
            )
        if recipient_id:
            try:
                recipient_id = int(recipient_id)
            except (TypeError, ValueError):
                raise serializers.ValidationError({"recipient": "Invalid recipient."})
            if recipient_id == request.user.id or not share_active_group(
                request.user.id, recipient_id
            ):
                raise serializers.ValidationError(
                    {
                        "recipient": "You can only upload to an active shared-group conversation."
                    }
                )
        if not upload:
            raise serializers.ValidationError({"file": "Choose a file to upload."})
        if upload.size > 10 * 1024 * 1024:
            raise serializers.ValidationError(
                {"file": "Files must be 10 MB or smaller."}
            )

        allowed_extensions = {
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".webp",
            ".mp4",
            ".webm",
            ".mov",
            ".pdf",
            ".doc",
            ".docx",
            ".zip",
        }
        allowed_mimes = {
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/zip",
            "application/x-zip-compressed",
            "application/octet-stream",
        }
        extension = Path(upload.name).suffix.lower()
        content_type = (upload.content_type or "application/octet-stream").lower()
        if extension not in allowed_extensions or content_type not in allowed_mimes:
            raise serializers.ValidationError({"file": "Unsupported file type."})

        stored_name = default_storage.save(
            f"chat/{timezone.now():%Y/%m}/{uuid.uuid4().hex}{extension}", upload
        )
        url = request.build_absolute_uri(default_storage.url(stored_name))
        if content_type.startswith("image/"):
            kind = "gif" if extension == ".gif" else "image"
        elif content_type.startswith("video/"):
            kind = "video"
        else:
            kind = "file"
        return Response(
            {
                "id": uuid.uuid4().hex,
                "kind": kind,
                "name": Path(upload.name).name,
                "url": url,
                "size": upload.size,
                "content_type": content_type,
            },
            status=status.HTTP_201_CREATED,
        )
