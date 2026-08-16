from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import ChatMessage, Expense, ExpenseParticipant, Group, GroupMembership, Settlement


class MemberSerializer(serializers.ModelSerializer):
    initials = serializers.SerializerMethodField()

    class Meta:
        model = GroupMembership
        fields = ["user_id", "role", "initials"]

    def get_initials(self, obj):
        return "".join(part[0] for part in (obj.user.get_full_name() or obj.user.username).split()[:2]).upper()


class GroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    def get_member_count(self, obj):
        return obj.members.count()

    class Meta:
        model = Group
        fields = ["id", "name", "slug", "emoji", "currency", "description", "member_count", "created_at"]
        read_only_fields = ["owner"]

    def create(self, validated_data):
        user = self.context["request"].user
        group = Group.objects.create(owner=user, **validated_data)
        GroupMembership.objects.create(group=group, user=user, role=GroupMembership.Role.OWNER)
        return group


class ParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = ExpenseParticipant
        fields = ["user", "user_name", "share_amount", "share_value"]


class ExpenseSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, required=False)
    payer_name = serializers.CharField(source="payer.get_full_name", read_only=True)

    class Meta:
        model = Expense
        fields = ["id", "group", "title", "category", "amount", "payer", "payer_name", "note", "occurred_on", "split_mode", "status", "receipt", "participants", "created_at"]
        read_only_fields = ["status"]

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
    class Meta:
        model = Settlement
        fields = ["id", "group", "from_user", "to_user", "amount", "status", "note", "created_at"]
        read_only_fields = ["status"]


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
        return Response({"group": group.name, "total_spend": total, "expense_count": expenses.count(), "member_count": group.members.count()})


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


class ChatMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "group", "author", "author_name", "body", "related_expense", "created_at"]
        read_only_fields = ["author"]
