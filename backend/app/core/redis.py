from __future__ import annotations

from functools import lru_cache
from typing import Optional
import ssl
import logging
from urllib.parse import urlparse

from redis import Redis
from redis.asyncio import Redis as AsyncRedis

from app.core.config import settings

logger = logging.getLogger(__name__)

_sync_client: Optional[Redis] = None
_async_client: Optional[AsyncRedis] = None


def get_redis() -> Redis:
    """Return a singleton synchronous Redis client."""

    global _sync_client

    if _sync_client is None:

        try:
            # Parse the URL to extract components
            parsed = urlparse(settings.REDIS_URL)

            # Extract username and password from URL if present
            username = parsed.username or "default"
            password = parsed.password

            # Use direct connection parameters instead of URL for Redis Cloud
            _sync_client = Redis(
                host=parsed.hostname or "localhost",
                port=parsed.port or 6379,
                username=username,
                password=password,
                decode_responses=False,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True,
            )

            # Test the connection
            try:
                _sync_client.ping()
                logger.info("Successfully connected to Redis")
            except Exception as ping_error:
                logger.warning(
                    f"Redis ping failed: {ping_error}. Redis features may be unavailable."
                )
                _sync_client = None
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
            logger.error(
                f"Redis URL (masked): {settings.REDIS_URL.split('@')[0] if '@' in settings.REDIS_URL else 'REDIS_URL'}"
            )
            _sync_client = None

    return _sync_client


async def get_async_redis() -> AsyncRedis:
    """Return a singleton asynchronous Redis client."""

    global _async_client

    if _async_client is None:
        
        try:
            # Parse the URL to extract components
            parsed = urlparse(settings.REDIS_URL)

            # Extract username and password from URL if present
            username = parsed.username or "default"
            password = parsed.password

            _async_client = AsyncRedis(
                host=parsed.hostname or "localhost",
                port=parsed.port or 6379,
                username=username,
                password=password,
                decode_responses=False,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True,
            )

            # Test the connection
            try:
                await _async_client.ping()
                logger.info("Successfully connected to Async Redis")
            except Exception as ping_error:
                logger.warning(
                    f"Async Redis ping failed: {ping_error}. Redis features may be unavailable."
                )
                _async_client = None
        except Exception as e:
            logger.error(f"Failed to initialize Async Redis client: {e}")
            logger.error(
                f"Redis URL (masked): {settings.REDIS_URL.split('@')[0] if '@' in settings.REDIS_URL else 'REDIS_URL'}"
            )
            _async_client = None

    return _async_client


async def close_redis_clients() -> None:
    """Close existing Redis connections (called on application shutdown)."""

    global _sync_client, _async_client

    if _sync_client is not None:
        _sync_client.close()
        _sync_client = None

    if _async_client is not None:
        await _async_client.aclose()
        _async_client = None


@lru_cache
def geo_key() -> str:
    """Key used to store parking lot centroids in Redis GEOSET."""

    return settings.REDIS_GEO_KEY


def availability_hash_key(parking_lot_id: int) -> str:
    """Return Redis hash key for a parking lot's slot availability."""

    return f"slot_availability:{parking_lot_id}"


def search_room_key(latitude: float, longitude: float, radius: float) -> str:
    """Build a deterministic Socket.IO room name for a search area."""

    return f"search:{latitude:.5f}:{longitude:.5f}:{int(radius)}"
