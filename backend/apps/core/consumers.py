from types import SimpleNamespace

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone

from .api import ChatMessageSerializer
from .chat import (
    direct_room_name,
    is_active_member,
    normalize_reactions,
    share_active_group,
    toggle_reaction,
)
from .models import ChatMessage, UserProfile


class BaseChatConsumer(AsyncJsonWebsocketConsumer):
    async def disconnect(self, close_code):
        if getattr(self, "room_group_name", None):
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )

    async def chat_message(self, event):
        await self.send_json({"event": "message", "message": event["message"]})

    async def chat_typing(self, event):
        if event["user"]["id"] != self.user.id:
            await self.send_json(
                {
                    "event": "typing",
                    "user": event["user"],
                    "is_typing": event["is_typing"],
                }
            )

    async def chat_reaction(self, event):
        await self.send_json({"event": "reaction", "message": event["message"]})

    async def chat_read(self, event):
        await self.send_json(
            {
                "event": "read",
                "message": event["message"],
                "user_id": event.get("user_id"),
            }
        )

    async def broadcast_typing(self, is_typing):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.typing",
                "user": await self.user_payload(),
                "is_typing": bool(is_typing),
            },
        )

    async def broadcast_reaction(self, message_id, emoji):
        message = await self.update_reaction(message_id, emoji)
        if message:
            await self.channel_layer.group_send(
                self.room_group_name, {"type": "chat.reaction", "message": message}
            )

    async def broadcast_read(self, message_id):
        message = await self.update_read(message_id)
        if message:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.read",
                    "message": message,
                    "user_id": self.user.id,
                },
            )

    @database_sync_to_async
    def user_payload(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        name = self.user.get_full_name() or self.user.username
        avatar = profile.avatar.url if profile.avatar else None
        return {
            "id": self.user.id,
            "name": name,
            "initials": "".join(part[0] for part in name.split()[:2]).upper(),
            "avatar": avatar,
        }

    def serializer_context(self):
        return {"request": SimpleNamespace(user=self.user)}

    def serialize(self, message):
        return ChatMessageSerializer(message, context=self.serializer_context()).data

    @database_sync_to_async
    def update_reaction(self, message_id, emoji):
        message = (
            self.thread_messages()
            .filter(pk=message_id)
            .select_related("author", "recipient", "reply_to", "reply_to__author")
            .first()
        )
        if not message:
            return None
        toggle_reaction(message, emoji, self.user.id)
        return self.serialize(message)

    @database_sync_to_async
    def update_read(self, message_id):
        message = (
            self.thread_messages()
            .filter(pk=message_id)
            .select_related("author", "recipient", "reply_to", "reply_to__author")
            .first()
        )
        if not message:
            return None
        if message.author_id != self.user.id and not message.read_at:
            message.read_at = timezone.now()
            message.save(update_fields=["read_at", "updated_at"])
        return self.serialize(message)


class GroupChatConsumer(BaseChatConsumer):
    async def connect(self):
        self.group_id = self.scope["url_route"]["kwargs"]["group_id"]
        self.room_group_name = f"chat_{self.group_id}"
        self.user = self.scope.get("user")
        if not self.user or self.user.is_anonymous or not await self.is_member():
            await self.close(code=4403)
            return
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        await self.send_json({"event": "connected", "group_id": str(self.group_id)})

    async def receive_json(self, content, **kwargs):
        event_type = content.get("event", "message")
        if event_type == "typing":
            await self.broadcast_typing(content.get("is_typing", True))
            return
        if event_type == "reaction":
            await self.broadcast_reaction(
                content.get("message_id"), content.get("emoji", "👍")
            )
            return
        if event_type == "read":
            await self.broadcast_read(content.get("message_id"))
            return
        message, errors = await self.create_message(content)
        if errors:
            await self.send_json({"event": "error", "errors": errors})
            return
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "chat.message", "message": message}
        )

    @database_sync_to_async
    def is_member(self):
        return is_active_member(self.user.id, self.group_id)

    def thread_messages(self):
        return ChatMessage.objects.filter(
            kind=ChatMessage.Kind.GROUP, group_id=self.group_id
        )

    @database_sync_to_async
    def create_message(self, content):
        serializer = ChatMessageSerializer(
            data={
                "kind": ChatMessage.Kind.GROUP,
                "group": self.group_id,
                "body": content.get("body", ""),
                "attachments": content.get("attachments", []),
                "reply_to": content.get("reply_to"),
            },
            context=self.serializer_context(),
        )
        if not serializer.is_valid():
            return None, serializer.errors
        message = serializer.save(author=self.user)
        return self.serialize(message), None


class DirectMessageConsumer(BaseChatConsumer):
    async def connect(self):
        self.recipient_id = self.scope["url_route"]["kwargs"]["user_id"]
        self.user = self.scope.get("user")
        if not self.user or self.user.is_anonymous or not await self.can_message():
            await self.close(code=4403)
            return
        self.room_group_name = direct_room_name(self.user.id, self.recipient_id)
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        await self.send_json(
            {"event": "connected", "recipient_id": str(self.recipient_id)}
        )

    async def receive_json(self, content, **kwargs):
        event_type = content.get("event", "message")
        if event_type == "typing":
            await self.broadcast_typing(content.get("is_typing", True))
            return
        if event_type == "reaction":
            await self.broadcast_reaction(
                content.get("message_id"), content.get("emoji", "👍")
            )
            return
        if event_type == "read":
            await self.broadcast_read(content.get("message_id"))
            return
        message, errors = await self.create_message(content)
        if errors:
            await self.send_json({"event": "error", "errors": errors})
            return
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "chat.message", "message": message}
        )

    @database_sync_to_async
    def can_message(self):
        try:
            recipient_id = int(self.recipient_id)
        except (TypeError, ValueError):
            return False
        return recipient_id != self.user.id and share_active_group(
            self.user.id, recipient_id
        )

    def thread_messages(self):
        first_id, second_id = self.user.id, int(self.recipient_id)
        return ChatMessage.objects.filter(kind=ChatMessage.Kind.DIRECT).filter(
            author_id=first_id, recipient_id=second_id
        ) | ChatMessage.objects.filter(
            kind=ChatMessage.Kind.DIRECT, author_id=second_id, recipient_id=first_id
        )

    @database_sync_to_async
    def create_message(self, content):
        serializer = ChatMessageSerializer(
            data={
                "kind": ChatMessage.Kind.DIRECT,
                "recipient": self.recipient_id,
                "body": content.get("body", ""),
                "attachments": content.get("attachments", []),
                "reply_to": content.get("reply_to"),
            },
            context=self.serializer_context(),
        )
        if not serializer.is_valid():
            return None, serializer.errors
        message = serializer.save(author=self.user)
        return self.serialize(message), None
