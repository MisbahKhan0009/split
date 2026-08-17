import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from apps.core.consumers import DirectMessageConsumer, GroupChatConsumer
from apps.core.models import ChatMessage, Group, GroupMembership
from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from channels.routing import URLRouter
from channels.testing.websocket import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.urls import re_path

User = get_user_model()


def as_user_application(consumer_application, user):
    async def application(scope, receive, send):
        authenticated_scope = dict(scope)
        authenticated_scope["user"] = user
        await consumer_application(authenticated_scope, receive, send)

    return application


@sync_to_async
def seed_database():
    ChatMessage.objects.all().delete()
    GroupMembership.objects.all().delete()
    Group.objects.filter(slug__startswith="ws-simulation").delete()
    User.objects.filter(username__in=["rafi_ws", "tisha_ws"]).delete()
    rafi = User.objects.create_user(username="rafi_ws", password="safe-password")
    tisha = User.objects.create_user(username="tisha_ws", password="safe-password")
    group = Group.objects.create(
        name="Realtime test group",
        slug="ws-simulation-group",
        owner=rafi,
        currency="BDT",
        currency_symbol="৳",
    )
    GroupMembership.objects.create(
        group=group, user=rafi, role=GroupMembership.Role.OWNER
    )
    GroupMembership.objects.create(
        group=group, user=tisha, role=GroupMembership.Role.MEMBER
    )
    return rafi, tisha, group


@sync_to_async
def persisted_messages():
    return list(
        ChatMessage.objects.values(
            "kind",
            "body",
            "attachments",
            "reactions",
            "group_id",
            "recipient_id",
            "read_at",
        )
    )


async def receive_event(communicator, label):
    payload = await communicator.receive_json_from(timeout=2)
    print(f"{label}: {payload}")
    return payload


async def receive_until(communicator, label, event_name):
    while True:
        payload = await receive_event(communicator, label)
        if payload.get("event") == event_name:
            return payload


async def main():
    rafi, tisha, group = await seed_database()
    channel_layer = get_channel_layer()
    await channel_layer.flush()

    group_app = URLRouter(
        [re_path(r"ws/groups/(?P<group_id>[^/]+)/chat/$", GroupChatConsumer.as_asgi())]
    )
    rafi_group = WebsocketCommunicator(
        as_user_application(group_app, rafi), f"/ws/groups/{group.id}/chat/"
    )
    tisha_group = WebsocketCommunicator(
        as_user_application(group_app, tisha), f"/ws/groups/{group.id}/chat/"
    )
    assert (await rafi_group.connect())[0] is True
    assert (await tisha_group.connect())[0] is True
    await receive_event(rafi_group, "rafi group handshake")
    await receive_event(tisha_group, "tisha group handshake")

    await rafi_group.send_json_to(
        {
            "body": "Adding the river cruise receipt",
            "attachments": [
                {
                    "kind": "image",
                    "name": "river-cruise.jpg",
                    "url": "memory://river-cruise.jpg",
                }
            ],
        }
    )
    rafi_message = await receive_event(rafi_group, "rafi group message")
    tisha_message = await receive_event(tisha_group, "tisha group message")
    assert rafi_message["event"] == "message" and tisha_message["event"] == "message"
    assert rafi_message["attachments"][0]["kind"] == "image"

    await rafi_group.send_json_to({"event": "typing", "is_typing": True})
    typing = await receive_event(tisha_group, "tisha typing event")
    assert typing["event"] == "typing" and typing["is_typing"] is True

    message_id = rafi_message["id"]
    await tisha_group.send_json_to(
        {"event": "reaction", "message_id": message_id, "emoji": "🔥"}
    )
    reaction_from_rafi = await receive_until(
        rafi_group, "rafi reaction event", "reaction"
    )
    reaction_from_tisha = await receive_until(
        tisha_group, "tisha reaction event", "reaction"
    )
    assert (
        reaction_from_rafi["event"] == "reaction"
        and reaction_from_tisha["emoji"] == "🔥"
    )

    await tisha_group.send_json_to({"event": "read", "message_id": message_id})
    read_event = await receive_until(rafi_group, "rafi read event", "read")
    assert read_event["event"] == "read" and read_event["message_id"] == message_id

    await rafi_group.disconnect()
    await tisha_group.disconnect()

    direct_app = URLRouter(
        [
            re_path(
                r"ws/users/(?P<user_id>[^/]+)/chat/$", DirectMessageConsumer.as_asgi()
            )
        ]
    )
    rafi_direct = WebsocketCommunicator(
        as_user_application(direct_app, rafi), f"/ws/users/{tisha.id}/chat/"
    )
    tisha_direct = WebsocketCommunicator(
        as_user_application(direct_app, tisha), f"/ws/users/{rafi.id}/chat/"
    )
    assert (await rafi_direct.connect())[0] is True
    assert (await tisha_direct.connect())[0] is True
    await receive_event(rafi_direct, "rafi direct handshake")
    await receive_event(tisha_direct, "tisha direct handshake")

    await rafi_direct.send_json_to(
        {"body": "Private follow-up: I will request the ৳ 620 split."}
    )
    direct_from_rafi = await receive_event(rafi_direct, "rafi direct message")
    direct_from_tisha = await receive_event(tisha_direct, "tisha direct message")
    assert (
        direct_from_rafi["event"] == "message"
        and direct_from_tisha["message"]
        == "Private follow-up: I will request the ৳ 620 split."
    )

    await rafi_direct.disconnect()
    await tisha_direct.disconnect()

    rows = await persisted_messages()
    print(f"persisted message rows: {rows}")
    assert len(rows) == 2
    assert rows[0]["kind"] == "group" and rows[0]["attachments"][0]["kind"] == "image"
    assert rows[0]["reactions"][0]["emoji"] == "🔥" and rows[0]["read_at"] is not None
    assert rows[1]["kind"] == "direct" and rows[1]["recipient_id"] == tisha.id
    print("RESULT: realtime group and private messaging simulation passed")


if __name__ == "__main__":
    asyncio.run(main())
