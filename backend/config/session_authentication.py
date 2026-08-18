from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from apps.core.models import UserSession


class SessionAwareJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None
        user, token = result
        session_key = token.get("session_key")
        if not session_key:
            raise AuthenticationFailed("This session is no longer valid.")
        session = UserSession.objects.filter(
            session_key=session_key,
            user=user,
            revoked_at__isnull=True,
        ).first()
        if session is None:
            raise AuthenticationFailed("This session has been revoked.")
        now = timezone.now()
        if session.last_seen_at is None or (now - session.last_seen_at).total_seconds() > 60:
            UserSession.objects.filter(pk=session.pk).update(
                last_seen_at=now,
                updated_at=now,
            )
        request.account_session = session
        return user, token
