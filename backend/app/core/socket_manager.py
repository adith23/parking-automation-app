from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

import socketio

from app.core.config import settings
from app.core.redis import get_async_redis, search_room_key


SEARCH_NAMESPACE = "/driver-search"


socket_server = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.SOCKET_IO_CORS_ORIGINS,
    client_manager=socketio.AsyncRedisManager(settings.REDIS_URL),
)

socket_app = socketio.ASGIApp(socket_server, socketio_path="socket.io")


@socket_server.event(namespace=SEARCH_NAMESPACE)
async def connect(sid, environ):  # type: ignore[no-untyped-def]
    await socket_server.save_session(sid, {"rooms": set()}, namespace=SEARCH_NAMESPACE)


@socket_server.event(namespace=SEARCH_NAMESPACE)
async def disconnect(sid):  # type: ignore[no-untyped-def]
    session = await socket_server.get_session(sid, namespace=SEARCH_NAMESPACE)
    for room in session.get("rooms", set()):
        await socket_server.leave_room(sid, room, namespace=SEARCH_NAMESPACE)


@socket_server.on("subscribe", namespace=SEARCH_NAMESPACE)
async def manual_subscribe(sid, data):  # type: ignore[no-untyped-def]
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    radius = data.get("radius")
    if latitude is None or longitude is None or radius is None:
        return

    room = search_room_key(float(latitude), float(longitude), float(radius))
    await socket_server.enter_room(sid, room, namespace=SEARCH_NAMESPACE)
    session = await socket_server.get_session(sid, namespace=SEARCH_NAMESPACE)
    session.setdefault("rooms", set()).add(room)
    await socket_server.save_session(sid, session, namespace=SEARCH_NAMESPACE)


@socket_server.on("unsubscribe", namespace=SEARCH_NAMESPACE)
async def manual_unsubscribe(sid, data):  # type: ignore[no-untyped-def]
    room = data.get("room")
    if room:
        await socket_server.leave_room(sid, room, namespace=SEARCH_NAMESPACE)
        session = await socket_server.get_session(sid, namespace=SEARCH_NAMESPACE)
        session.setdefault("rooms", set()).discard(room)
        await socket_server.save_session(sid, session, namespace=SEARCH_NAMESPACE)


async def subscribe_driver_to_search(socket_id: str, room: str, initial_payload: Dict[str, Any]) -> None:
    await socket_server.enter_room(socket_id, room, namespace=SEARCH_NAMESPACE)
    session = await socket_server.get_session(socket_id, namespace=SEARCH_NAMESPACE)
    session.setdefault("rooms", set()).add(room)
    await socket_server.save_session(socket_id, session, namespace=SEARCH_NAMESPACE)
    await socket_server.emit(
        "search_results",
        initial_payload,
        room=room,
        namespace=SEARCH_NAMESPACE,
    )


async def broadcast_availability_update(parking_lot_id: int, payload: Dict[str, Any]) -> None:
    await socket_server.emit(
        "availability_update",
        payload,
        namespace=SEARCH_NAMESPACE,
    )


async def disconnect_all() -> None:
    await socket_server.disconnect_all(namespace=SEARCH_NAMESPACE)

