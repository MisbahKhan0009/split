import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application


django_asgi_application = get_asgi_application()

from config.jwt_websocket import JWTWebSocketAuthMiddleware
from apps.core.routing import websocket_urlpatterns


application = ProtocolTypeRouter({
    "http": django_asgi_application,
    "websocket": AuthMiddlewareStack(JWTWebSocketAuthMiddleware(URLRouter(websocket_urlpatterns))),
})
