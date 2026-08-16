from django.urls import re_path
from .consumers import GroupChatConsumer

websocket_urlpatterns = [
    re_path(r"ws/groups/(?P<group_id>[^/]+)/chat/$", GroupChatConsumer.as_asgi()),
]
