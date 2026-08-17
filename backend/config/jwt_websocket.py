from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class JWTWebSocketAuthMiddleware(BaseMiddleware):
    """Authenticate Channels connections with the JWT in the `token` query parameter."""

    async def __call__(self, scope, receive, send):
        if not scope.get("user") or scope["user"].is_anonymous:
            query = parse_qs(scope.get("query_string", b"").decode())
            token = query.get("token", [None])[0]
            if token:
                scope["user"] = await self.resolve_user(token)
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def resolve_user(self, token):
        authentication = JWTAuthentication()
        try:
            validated = authentication.get_validated_token(token)
            return authentication.get_user(validated)
        except (InvalidToken, TokenError):
            return AnonymousUser()
