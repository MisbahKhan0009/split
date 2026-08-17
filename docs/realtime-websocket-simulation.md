# Realtime WebSocket Simulation

The SplitWise+ Django Channels implementation was exercised with two simulated authenticated users, **Rafi** and **Tisha**, using the in-memory channel layer and the generated Django migration.

## Command

```bash
cd backend
python3 manage.py migrate --noinput
python3 scripts/ws_simulation.py
```

## Observed flow

| Flow             | Result | Verification                                                                                               |
| ---------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Group handshake  | Passed | Both simulated users connected to `/ws/groups/{group_id}/chat/` and received `connected` events.           |
| Group message    | Passed | A message with an image attachment was broadcast to both users and persisted as a `group` message.         |
| Typing indicator | Passed | A `typing` event was broadcast to the other group client and remained ordered in the channel queue.        |
| Reaction         | Passed | A fire reaction was broadcast to both clients and persisted in the message JSON reaction list.             |
| Read receipt     | Passed | A `read` event was broadcast and `read_at` was persisted on the group message.                             |
| Direct handshake | Passed | Both users connected to the paired `/ws/users/{user_id}/chat/` rooms.                                      |
| Private message  | Passed | A direct message was delivered to both clients and persisted with `kind=direct` and the correct recipient. |

The final run printed `RESULT: realtime group and private messaging simulation passed`. The observed event order also confirmed that group broadcasts include the sender’s own typing event, so production clients should filter self-typing indicators by user ID when rendering them.

## Scope and limitation

This test uses `InMemoryChannelLayer`, which validates consumer routing, event fan-out, authentication scope injection, persistence, and message ordering in one process. A production deployment should use the configured Redis channel layer for cross-process delivery, real session/JWT middleware at the ASGI edge, and durable object storage for uploaded media.
