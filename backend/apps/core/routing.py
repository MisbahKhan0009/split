from django.urls import re_path

from .consumers import DirectMessageConsumer, GroupChatConsumer

websocket_urlpatterns = [
    re_path(r"ws/groups/(?P<group_id>[^/]+)/chat/$", GroupChatConsumer.as_asgi()),
    re_path(r"ws/users/(?P<user_id>[^/]+)/chat/$", DirectMessageConsumer.as_asgi()),
]
