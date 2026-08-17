from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import ChatMessage, GroupMembership, UserProfile

User = get_user_model()


class GroupChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.group_id = self.scope["url_route"]["kwargs"]["group_id"]
        self.room_group_name = f"chat_{self.group_id}"
        self.user = self.scope.get("user")
        if not self.user or self.user.is_anonymous or not await self.is_member(self.user.id, self.group_id):
            await self.close(code=4403)
            return
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        await self.send_json({"event": "connected", "group_id": self.group_id})

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        event_type = content.get("event", "message")
        if event_type == "typing":
            await self.channel_layer.group_send(self.room_group_name, {"type": "chat.typing", "user": await self.user_payload(), "is_typing": bool(content.get("is_typing", True))})
            return
        if event_type == "reaction":
            message_id = content.get("message_id")
            emoji = content.get("emoji", "👍")
            await self.record_reaction(message_id, emoji)
            await self.channel_layer.group_send(self.room_group_name, {"type": "chat.reaction", "message_id": message_id, "emoji": emoji, "user": await self.user_payload()})
            return
        if event_type == "read":
            message_id = content.get("message_id")
            await self.record_read(message_id)
            await self.channel_layer.group_send(self.room_group_name, {"type": "chat.read", "message_id": message_id, "user_id": self.user.id})
            return
        body = str(content.get("body", "")).strip()
        attachments = content.get("attachments", [])
        if not body and not attachments:
            return
        message = await self.create_message(body, attachments, content.get("reply_to"))
        await self.channel_layer.group_send(self.room_group_name, {"type": "chat.message", "message": message})

    async def chat_message(self, event):
        await self.send_json({"event": "message", **event["message"]})

    async def chat_typing(self, event):
        await self.send_json({"event": "typing", "user": event["user"], "is_typing": event["is_typing"]})

    async def chat_reaction(self, event):
        await self.send_json({"event": "reaction", "message_id": event["message_id"], "emoji": event["emoji"], "user": event["user"]})

    async def chat_read(self, event):
        await self.send_json({"event": "read", "message_id": event["message_id"], "user_id": event["user_id"]})

    @database_sync_to_async
    def is_member(self, user_id, group_id):
        return GroupMembership.objects.filter(user_id=user_id, group_id=group_id, is_active=True).exists()

    @database_sync_to_async
    def record_reaction(self, message_id, emoji):
        message = ChatMessage.objects.filter(id=message_id, group_id=self.group_id).first()
        if not message:
            return
        reactions = [reaction for reaction in message.reactions if reaction.get("emoji") != emoji]
        existing = next((reaction for reaction in message.reactions if reaction.get("emoji") == emoji), None)
        reactions.append({"emoji": emoji, "count": (existing.get("count", 0) if existing else 0) + 1, "user_id": self.user.id})
        message.reactions = reactions
        message.save(update_fields=["reactions", "updated_at"])

    @database_sync_to_async
    def record_read(self, message_id):
        ChatMessage.objects.filter(id=message_id, group_id=self.group_id).update(read_at=timezone.now(), updated_at=timezone.now())

    @database_sync_to_async
    def user_payload(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        name = self.user.get_full_name() or self.user.username
        return {"id": self.user.id, "name": name, "initials": "".join(part[0] for part in name.split()[:2]).upper(), "avatar": profile.avatar.url if profile.avatar else None}

    @database_sync_to_async
    def create_message(self, body, attachments, reply_to):
        message = ChatMessage.objects.create(author=self.user, group_id=self.group_id, kind=ChatMessage.Kind.GROUP, body=body, attachments=attachments, reply_to_id=reply_to or None)
        return {"id": message.id, "senderId": self.user.id, "member": self.user.get_full_name() or self.user.username, "message": message.body, "attachments": message.attachments, "replyTo": message.reply_to_id, "time": message.created_at.strftime("%H:%M"), "mine": False}


class DirectMessageConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.recipient_id = self.scope["url_route"]["kwargs"]["user_id"]
        self.user = self.scope.get("user")
        if not self.user or self.user.is_anonymous or not await self.user_exists():
            await self.close(code=4403)
            return
        ids = sorted([str(self.user.id), str(self.recipient_id)])
        self.room_group_name = f"direct_{ids[0]}_{ids[1]}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        await self.send_json({"event": "connected", "recipient_id": self.recipient_id})

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        body = str(content.get("body", "")).strip()
        attachments = content.get("attachments", [])
        if not body and not attachments:
            return
        message = await self.create_message(body, attachments, content.get("reply_to"))
        await self.channel_layer.group_send(self.room_group_name, {"type": "chat.message", "message": message})

    async def chat_message(self, event):
        await self.send_json({"event": "message", **event["message"]})

    @database_sync_to_async
    def user_exists(self):
        return User.objects.filter(id=self.recipient_id).exists()

    @database_sync_to_async
    def create_message(self, body, attachments, reply_to):
        message = ChatMessage.objects.create(author=self.user, recipient_id=self.recipient_id, kind=ChatMessage.Kind.DIRECT, body=body, attachments=attachments, reply_to_id=reply_to or None)
        return {"id": message.id, "senderId": self.user.id, "member": self.user.get_full_name() or self.user.username, "message": message.body, "attachments": message.attachments, "replyTo": message.reply_to_id, "time": message.created_at.strftime("%H:%M"), "mine": False}
