from decimal import Decimal

import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import (
    Expense,
    Group,
    GroupInvitation,
    GroupMembership,
    Notification,
    Settlement,
    UserActivityLog,
    UserProfile,
    UserSession,
)

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
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
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


def client_ip(request):
    if not request:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
    return forwarded or request.META.get("REMOTE_ADDR") or None


def device_label(request):
    user_agent = (request.META.get("HTTP_USER_AGENT", "") if request else "").lower()
    if any(token in user_agent for token in ("mobile", "android", "iphone")):
        return "Mobile browser"
    return "Desktop browser"


def record_account_activity(user, action, description, request=None, metadata=None):
    return UserActivityLog.objects.create(
        user=user,
        action=action,
        description=description,
        ip_address=client_ip(request),
        device_label=device_label(request),
        metadata=metadata or {},
    )


def auth_payload(user, request=None):
    session = UserSession.objects.create(
        user=user,
        device_label=device_label(request),
        ip_address=client_ip(request),
        user_agent=(request.META.get("HTTP_USER_AGENT", "") if request else "")[:500],
    )
    refresh = RefreshToken.for_user(user)
    refresh["session_key"] = str(session.session_key)
    refresh.access_token["session_key"] = str(session.session_key)
    record_account_activity(
        user,
        "sign_in",
        "Signed in to SplitWise+",
        request,
        {"session_id": str(session.session_key)},
    )
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": user_payload(user),
    }


class LoginView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            user = User.objects.get(username__iexact=request.data.get("username", ""))
            response.data.update(auth_payload(user, request))
        return response


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(auth_payload(serializer.save(), request), status=status.HTTP_201_CREATED)


class SessionRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                session_key = token.get("session_key")
                if session_key and not UserSession.objects.filter(
                    session_key=session_key, revoked_at__isnull=True
                ).exists():
                    return Response(
                        {"detail": "This session has been revoked."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
            except Exception:
                pass
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK and refresh_token:
            try:
                token = RefreshToken(refresh_token)
                session = UserSession.objects.filter(
                    session_key=token.get("session_key"), revoked_at__isnull=True
                ).first()
                if session:
                    session.last_seen_at = timezone.now()
                    session.save(update_fields=["last_seen_at", "updated_at"])
            except Exception:
                pass
        return response


def session_payload(session, current_key=None):
    return {
        "id": str(session.session_key),
        "device_label": session.device_label,
        "ip_address": session.ip_address,
        "user_agent": session.user_agent,
        "created_at": session.created_at,
        "last_seen_at": session.last_seen_at,
        "is_current": str(session.session_key) == str(current_key) if current_key else False,
    }


class AccountActivityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = request.user.account_activity.all()[:40]
        return Response([
            {
                "id": row.id,
                "action": row.action,
                "description": row.description,
                "device_label": row.device_label,
                "ip_address": row.ip_address,
                "created_at": row.created_at,
                "metadata": row.metadata,
            }
            for row in rows
        ])


class AccountSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current = getattr(request, "account_session", None)
        current_key = current.session_key if current else None
        sessions = request.user.account_sessions.filter(revoked_at__isnull=True)[:12]
        return Response([session_payload(session, current_key) for session in sessions])


class RevokeCurrentSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session = getattr(request, "account_session", None)
        if session:
            session.revoked_at = timezone.now()
            session.save(update_fields=["revoked_at", "updated_at"])
            record_account_activity(request.user, "sign_out", "Signed out of this browser session", request)
        return Response({"detail": "Current session revoked."})


class RevokeSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_key):
        session = request.user.account_sessions.filter(
            session_key=session_key, revoked_at__isnull=True
        ).first()
        if not session:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
        session.revoked_at = timezone.now()
        session.save(update_fields=["revoked_at", "updated_at"])
        record_account_activity(request.user, "session_revoke", f"Revoked {session.device_label}", request)
        return Response({"detail": "Session revoked."})


class RevokeAllSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = getattr(request, "account_session", None)
        queryset = request.user.account_sessions.filter(revoked_at__isnull=True)
        if current:
            queryset = queryset.exclude(pk=current.pk)
        count = queryset.update(revoked_at=timezone.now(), updated_at=timezone.now())
        record_account_activity(request.user, "session_revoke_all", f"Revoked {count} other sessions", request)
        return Response({"detail": "Other sessions revoked.", "revoked_count": count})


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(user_payload(request.user))


class CurrentUserDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        memberships = GroupMembership.objects.filter(
            user=user, is_active=True
        ).select_related("group")
        group_ids = list(memberships.values_list("group_id", flat=True))
        expenses = Expense.objects.filter(
            group_id__in=group_ids,
            status__in=[Expense.Status.PENDING, Expense.Status.CONFIRMED],
        )
        paid = expenses.filter(payer=user).aggregate(total=Sum("amount"))[
            "total"
        ] or Decimal("0")
        owed = expenses.filter(participants__user=user).aggregate(
            total=Sum("participants__share_amount")
        )["total"] or Decimal("0")
        settlements_sent = Settlement.objects.filter(
            group_id__in=group_ids, from_user=user, status=Settlement.Status.REQUESTED
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        settlements_received = Settlement.objects.filter(
            group_id__in=group_ids, to_user=user, status=Settlement.Status.REQUESTED
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        groups = [
            {
                "id": group.id,
                "name": group.name,
                "emoji": group.emoji,
                "member_count": group.members.count(),
                "total_spend": str(
                    group.expenses.filter(
                        status__in=[Expense.Status.PENDING, Expense.Status.CONFIRMED]
                    ).aggregate(total=Sum("amount"))["total"]
                    or Decimal("0")
                ),
            }
            for group in [membership.group for membership in memberships]
        ]
        return Response(
            {
                "user": user_payload(user),
                "currency": {"code": "BDT", "symbol": "৳"},
                "group_count": len(groups),
                "expense_count": expenses.count(),
                "total_spend": str(
                    expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0")
                ),
                "paid_total": str(paid),
                "owed_total": str(owed),
                "pending_to_pay": str(settlements_sent),
                "pending_to_receive": str(settlements_received),
                "unread_notifications": Notification.objects.filter(
                    user=user, is_read=False
                ).count(),
                "pending_invitations": GroupInvitation.objects.filter(
                    invitee=user, status=GroupInvitation.Status.PENDING
                ).count(),
                "groups": groups,
            }
        )
