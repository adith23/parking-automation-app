from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional

import socketio

from app.core.config import settings
from app.core.redis import get_async_redis, search_room_key

logger = logging.getLogger(__name__)

SEARCH_NAMESPACE = "/driver-search"

# Try to construct the AsyncRedisManager in a robust way:
# 1) Prefer passing the REDIS_URL directly (AsyncRedisManager supports a URL).
# 2) If that fails (e.g., manager cannot handle a particular SSL setup),
#    fall back to creating an async redis client and passing it to the manager.
def _create_socket_manager():
    try:
        manager = socketio.AsyncRedisManager(settings.REDIS_URL)
        logger.info("Socket.IO AsyncRedisManager created using REDIS_URL.")
        return manager
    except Exception as e:
        logger.debug("AsyncRedisManager creation with URL failed: %s", e)
        # Fallback: try to create an async redis client and pass it in
        try:
            # get_async_redis returns a singleton client but it's async; create new client here
            # Use the redis.from_url to create a dedicated client for the manager.
            # Use import inside function to keep top-level import cheap.
            from redis.asyncio import from_url as async_redis_from_url

            client = async_redis_from_url(
                settings.REDIS_URL,
                decode_responses=False,
            )
            manager = socketio.AsyncRedisManager(client)
            logger.info("Socket.IO AsyncRedisManager created using Redis client instance.")
            return manager
        except Exception as e2:
            logger.error("Failed to create AsyncRedisManager: %s", e2)
            raise


# Create the socket server with the manager
socket_server = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.SOCKET_IO_CORS_ORIGINS,
    client_manager=_create_socket_manager(),
)

socket_app = socketio.ASGIApp(socket_server, socketio_path="socket.io")


# Socket event handlers
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
