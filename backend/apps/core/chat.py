from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Q

from .models import ChatMessage, GroupMembership


def is_active_member(user_id, group_id):
    return GroupMembership.objects.filter(
        user_id=user_id, group_id=group_id, is_active=True
    ).exists()


def share_active_group(first_user_id, second_user_id):
    first_groups = GroupMembership.objects.filter(
        user_id=first_user_id, is_active=True
    ).values("group_id")
    return GroupMembership.objects.filter(
        user_id=second_user_id, is_active=True, group_id__in=first_groups
    ).exists()


def direct_room_name(first_user_id, second_user_id):
    low, high = sorted((int(first_user_id), int(second_user_id)))
    return f"direct_{low}_{high}"


def message_room_name(message):
    if message.kind == ChatMessage.Kind.GROUP:
        return f"chat_{message.group_id}"
    return direct_room_name(message.author_id, message.recipient_id)


def visible_messages(user):
    active_groups = GroupMembership.objects.filter(user=user, is_active=True).values(
        "group_id"
    )
    return ChatMessage.objects.filter(
        Q(kind=ChatMessage.Kind.GROUP, group_id__in=active_groups)
        | Q(kind=ChatMessage.Kind.DIRECT, author=user)
        | Q(kind=ChatMessage.Kind.DIRECT, recipient=user)
    ).distinct()


def normalize_reactions(raw_reactions, current_user_id=None):
    normalized = []
    for raw in raw_reactions if isinstance(raw_reactions, list) else []:
        if not isinstance(raw, dict) or not str(raw.get("emoji", "")).strip():
            continue
        emoji = str(raw["emoji"]).strip()[:16]
        user_ids = []
        raw_user_ids = raw.get("user_ids", [])
        if isinstance(raw_user_ids, list):
            for value in raw_user_ids:
                try:
                    user_id = int(value)
                except (TypeError, ValueError):
                    continue
                if user_id not in user_ids:
                    user_ids.append(user_id)
        legacy_user_id = raw.get("user_id")
        try:
            legacy_user_id = int(legacy_user_id) if legacy_user_id is not None else None
        except (TypeError, ValueError):
            legacy_user_id = None
        if legacy_user_id and legacy_user_id not in user_ids:
            user_ids.append(legacy_user_id)
        try:
            raw_count = max(int(raw.get("count", 0)), 0)
        except (TypeError, ValueError):
            raw_count = 0
        try:
            legacy_count = max(
                int(raw.get("legacy_count", max(raw_count - len(user_ids), 0))), 0
            )
        except (TypeError, ValueError):
            legacy_count = 0
        normalized.append(
            {
                "emoji": emoji,
                "count": legacy_count + len(user_ids),
                "user_ids": user_ids,
                "legacy_count": legacy_count,
                "reacted": bool(current_user_id and int(current_user_id) in user_ids),
            }
        )
    return normalized


def toggle_reaction(message, emoji, user_id):
    emoji = str(emoji or "👍").strip()[:16] or "👍"
    reactions = normalize_reactions(message.reactions)
    reaction = next((item for item in reactions if item["emoji"] == emoji), None)
    if reaction is None:
        reaction = {
            "emoji": emoji,
            "count": 0,
            "user_ids": [],
            "legacy_count": 0,
            "reacted": False,
        }
        reactions.append(reaction)
    if int(user_id) in reaction["user_ids"]:
        reaction["user_ids"].remove(int(user_id))
    else:
        reaction["user_ids"].append(int(user_id))
    reaction["count"] = reaction["legacy_count"] + len(reaction["user_ids"])
    persisted = [
        {
            "emoji": item["emoji"],
            "user_ids": item["user_ids"],
            "legacy_count": item["legacy_count"],
        }
        for item in reactions
        if item["legacy_count"] + len(item["user_ids"]) > 0
    ]
    message.reactions = persisted
    message.save(update_fields=["reactions", "updated_at"])
    return message


def broadcast_message_event(message, event, payload):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        message_room_name(message),
        {"type": f"chat.{event}", "event": event, **payload},
    )
