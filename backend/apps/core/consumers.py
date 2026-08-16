import json
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from .models import ChatMessage, Group, GroupMembership

User = get_user_model()


class GroupChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.group_id = self.scope["url_route"]["kwargs"]["group_id"]
        self.room_name = f"group_chat_{self.group_id}"
        self.room_group_name = f"chat_{self.group_id}"
        user = self.scope.get("user")
        if not user or user.is_anonymous or not await self.is_member(user.id, self.group_id):
            await self.close(code=4403)
            return
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        body = str(content.get("body", "")).strip()
        if not body:
            return
        message = await self.create_message(self.scope["user"].id, self.group_id, body)
        await self.channel_layer.group_send(self.room_group_name, {"type": "chat.message", "message": message})

    async def chat_message(self, event):
        await self.send_json(event["message"])

    @database_sync_to_async
    def is_member(self, user_id, group_id):
        return GroupMembership.objects.filter(user_id=user_id, group_id=group_id, is_active=True).exists()

    @database_sync_to_async
    def create_message(self, user_id, group_id, body):
        message = ChatMessage.objects.create(author_id=user_id, group_id=group_id, body=body)
        return {"id": message.id, "body": message.body, "author": message.author.get_full_name() or message.author.username, "created_at": message.created_at.isoformat()}
