"""Socket.IO real-time server for OneDW.

A JWT-authenticated Socket.IO server mounted alongside the FastAPI app in
``main.py``. Clients are placed into per-user rooms (``user:{id}``) so booking
events can be pushed to the assigned worker and the customer instantly, without
polling or a page refresh.

``emit_to_user`` is safe to call from synchronous request handlers (which run in
a worker thread) — it schedules the emit on the server's event loop.
"""

import asyncio
import socketio

from app.core.config import settings
from app.core.security import decode_token

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.socketio_origins_list,
    logger=False,
    engineio_logger=False,
)

_loop: "asyncio.AbstractEventLoop | None" = None
ONLINE_USERS: "set[str]" = set()


def _user_room(user_id: str) -> str:
    return f"user:{user_id}"


async def _presence_payload(user_id: str, online: bool) -> dict:
    """Key presence updates by the raw user id so the client can look it up
    directly (the camelize helper would mangle a 'user_id' key)."""
    return {user_id: online}


@sio.event
async def connect(sid, environ, auth):
    global _loop
    _loop = asyncio.get_running_loop()

    token = None
    if isinstance(auth, dict):
        token = auth.get("token")

    payload = decode_token(token) if token else None
    if not payload or payload.get("type") != "access":
        raise socketio.exceptions.ConnectionRefusedError("Unauthorized")

    user_id = payload.get("sub")
    if not user_id:
        raise socketio.exceptions.ConnectionRefusedError("Invalid token")

    await sio.save_session(sid, {"user_id": user_id})
    await sio.enter_room(sid, _user_room(user_id))
    return True


@sio.event
async def user_join(sid, data=None):
    """Client joined (logged in) — broadcast presence so other users see them online."""
    try:
        session = await sio.get_session(sid)
    except KeyError:
        return
    user_id = session.get("user_id")
    if not user_id:
        return
    ONLINE_USERS.add(user_id)
    await sio.emit("user:online", user_id)
    await sio.emit("presence:update", await _presence_payload(user_id, True))


@sio.event
async def user_offline(sid, data=None):
    try:
        session = await sio.get_session(sid)
    except KeyError:
        return
    user_id = session.get("user_id")
    if not user_id:
        return
    ONLINE_USERS.discard(user_id)
    await sio.emit("user:offline", user_id)
    await sio.emit("presence:update", await _presence_payload(user_id, False))


@sio.event
async def disconnect(sid):
    try:
        session = await sio.get_session(sid)
    except KeyError:
        return
    if session and session.get("user_id"):
        user_id = session["user_id"]
        await sio.leave_room(sid, _user_room(user_id))
        ONLINE_USERS.discard(user_id)
        await sio.emit("user:offline", user_id)
        await sio.emit("presence:update", await _presence_payload(user_id, False))


def _to_camel(name: str) -> str:
    if name == "id":
        return "_id"
    parts = name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def _camelize(value):
    """Recursively convert dict keys from snake_case to camelCase (id -> _id)."""
    if isinstance(value, dict):
        return {_to_camel(k): _camelize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_camelize(v) for v in value]
    return value


async def _emit(event: str, data: dict, room: str):
    await sio.emit(event, _camelize(data), room=room)


def emit_to_user(user_id: str, event: str, data: dict) -> bool:
    """Emit an event to a single user's room. Thread-safe and non-blocking.

    Returns True if the emit was scheduled, False if the real-time server is
    not yet accepting connections (in which case callers can simply skip the
    push — the REST response still carries the data).
    """
    global _loop
    loop = _loop
    if loop is None or loop.is_closed() or not sio.manager.rooms:
        return False
    try:
        asyncio.run_coroutine_threadsafe(
            _emit(event, data, _user_room(user_id)), loop
        )
        return True
    except Exception:
        return False
