from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Sum

from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Expense, Group, GroupMembership, GroupInvitation, Notification, Settlement, UserProfile


User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_username(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError("That username is already taken.")
        return normalized

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        UserProfile.objects.get_or_create(user=user)
        return user


def user_payload(user):
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "display_name": user.get_full_name() or user.username,
    }


def auth_payload(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh), "user": user_payload(user)}


class LoginView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            user = User.objects.get(username__iexact=request.data.get("username", ""))
            response.data["user"] = user_payload(user)
        return response


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(auth_payload(serializer.save()), status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(user_payload(request.user))


class CurrentUserDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        memberships = GroupMembership.objects.filter(user=user, is_active=True).select_related("group")
        group_ids = list(memberships.values_list("group_id", flat=True))
        expenses = Expense.objects.filter(group_id__in=group_ids, status__in=[Expense.Status.PENDING, Expense.Status.CONFIRMED])
        paid = expenses.filter(payer=user).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        owed = expenses.filter(participants__user=user).aggregate(total=Sum("participants__share_amount"))["total"] or Decimal("0")
        settlements_sent = Settlement.objects.filter(group_id__in=group_ids, from_user=user, status=Settlement.Status.REQUESTED).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        settlements_received = Settlement.objects.filter(group_id__in=group_ids, to_user=user, status=Settlement.Status.REQUESTED).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        groups = [{"id": group.id, "name": group.name, "emoji": group.emoji, "member_count": group.members.count(), "total_spend": str(group.expenses.filter(status__in=[Expense.Status.PENDING, Expense.Status.CONFIRMED]).aggregate(total=Sum("amount"))["total"] or Decimal("0"))} for group in [membership.group for membership in memberships]]
        return Response({
            "user": user_payload(user),
            "currency": {"code": "BDT", "symbol": "৳"},
            "group_count": len(groups),
            "expense_count": expenses.count(),
            "total_spend": str(expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0")),
            "paid_total": str(paid),
            "owed_total": str(owed),
            "pending_to_pay": str(settlements_sent),
            "pending_to_receive": str(settlements_received),
            "unread_notifications": Notification.objects.filter(user=user, is_read=False).count(),
            "pending_invitations": GroupInvitation.objects.filter(invitee=user, status=GroupInvitation.Status.PENDING).count(),
            "groups": groups,
        })
