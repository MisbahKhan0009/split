from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, Sum
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import ChatMessage, Expense, ExpenseParticipant, Group, GroupMembership, Settlement, UserProfile

User = get_user_model()


def user_display(user):
    return user.get_full_name() or user.username


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
    user_id = serializers.IntegerField(source="user_id")
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
        return group


class ParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = ExpenseParticipant
        fields = ["user", "user_name", "share_amount", "share_value"]


class ExpenseSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, required=False)
    payer_name = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = ["id", "group", "title", "category", "amount", "currency", "payer", "payer_name", "note", "occurred_on", "split_mode", "status", "receipt", "participants", "created_at"]
        read_only_fields = ["status", "currency"]

    def get_payer_name(self, obj):
        return user_display(obj.payer)

    def get_currency(self, obj):
        return {"code": "BDT", "symbol": "৳"}

    def validate(self, attrs):
        if attrs["amount"] <= 0:
            raise serializers.ValidationError({"amount": "Expense amount must be greater than zero."})
        if attrs.get("split_mode", "equal") not in {"equal", "exact", "percentage", "shares"}:
            raise serializers.ValidationError({"split_mode": "Unsupported split mode."})
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
        return expense


class SettlementSerializer(serializers.ModelSerializer):
    currency = serializers.SerializerMethodField()

    class Meta:
        model = Settlement
        fields = ["id", "group", "from_user", "to_user", "amount", "currency", "status", "note", "created_at"]
        read_only_fields = ["status", "currency"]

    def get_currency(self, obj):
        return {"code": "BDT", "symbol": "৳"}


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
        return Response({"group": group.name, "currency": {"code": "BDT", "symbol": "৳"}, "total_spend": total, "expense_count": expenses.count(), "member_count": group.members.count()})


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Expense.objects.filter(group__members=self.request.user).select_related("payer").prefetch_related("participants")


class SettlementViewSet(viewsets.ModelViewSet):
    serializer_class = SettlementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Settlement.objects.filter(group__members=self.request.user).select_related("from_user", "to_user")

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        settlement = self.get_object()
        settlement.status = Settlement.Status.CONFIRMED
        settlement.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(settlement).data, status=status.HTTP_200_OK)


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.filter(user__shared_groups__members=self.request.user).distinct()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
        query = Q(author=user) | Q(recipient=user)
        if group_id:
            return ChatMessage.objects.filter(group_id=group_id, group__members=user).select_related("author", "recipient")
        if recipient_id:
            return ChatMessage.objects.filter(kind=ChatMessage.Kind.DIRECT).filter(Q(author=user, recipient_id=recipient_id) | Q(author_id=recipient_id, recipient=user)).select_related("author", "recipient")
        return ChatMessage.objects.filter(query).select_related("author", "recipient")

    def perform_create(self, serializer):
        kind = serializer.validated_data.get("kind", ChatMessage.Kind.GROUP)
        if kind == ChatMessage.Kind.GROUP:
            group = serializer.validated_data.get("group")
            if not group or not group.members.filter(id=self.request.user.id).exists():
                raise serializers.ValidationError({"group": "You must be an active group member."})
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
        from django.utils import timezone
        message = self.get_object()
        message.read_at = timezone.now()
        message.save(update_fields=["read_at", "updated_at"])
        return Response(self.get_serializer(message).data)
