from __future__ import annotations

from functools import lru_cache
from typing import Optional
import ssl
import logging
from urllib.parse import urlparse

from redis import Redis, from_url as sync_redis_from_url
from redis.asyncio import Redis as AsyncRedis, from_url as async_redis_from_url

from app.core.config import settings

logger = logging.getLogger(__name__)

_sync_client: Optional[Redis] = None
_async_client: Optional[AsyncRedis] = None


def _mask_redis_url(url: str) -> str:
    """Return a masked version of a Redis URL for safe logging."""
    try:
        parsed = urlparse(url)
        if parsed.password:
            return url.replace(parsed.password, "****")
    except Exception:
        pass
    return url


def get_redis() -> Optional[Redis]:
    """
    Return a singleton synchronous Redis client created from settings.REDIS_URL.

    Uses redis.from_url which understands schemes like redis:// and rediss:// and
    handles username/password encoded in the URL. Returns None on failure.
    """
    global _sync_client

    if _sync_client is None:
        if not settings.REDIS_URL:
            logger.info("No REDIS_URL configured; skipping sync redis client creation.")
            return None

        try:
            # Use from_url so scheme and SSL are handled by the driver
            _sync_client = sync_redis_from_url(
                settings.REDIS_URL,
                decode_responses=False,
                socket_timeout=5,
                socket_connect_timeout=5,
            )

            # Test connection
            try:
                _sync_client.ping()
                logger.info("Successfully connected to Redis (sync).")
            except Exception as ping_err:
                logger.warning(
                    "Redis (sync) ping failed: %s. Redis features may be unavailable.",
                    ping_err,
                )
                _sync_client = None
        except Exception as e:
            logger.error("Failed to initialize sync Redis client: %s", e)
            logger.debug("Redis URL (masked): %s", _mask_redis_url(settings.REDIS_URL))
            _sync_client = None

    return _sync_client


async def get_async_redis() -> Optional[AsyncRedis]:
    """
    Return a singleton asynchronous Redis client created from settings.REDIS_URL.

    Uses redis.asyncio.from_url which supports TLS when the URL starts with rediss://.
    Returns None on failure.
    """
    global _async_client

    if _async_client is None:
        if not settings.REDIS_URL:
            logger.info(
                "No REDIS_URL configured; skipping async redis client creation."
            )
            return None

        try:
            _async_client = async_redis_from_url(
                settings.REDIS_URL,
                decode_responses=False,
                socket_timeout=5,
                socket_connect_timeout=5,
            )

            # Test the connection
            try:
                await _async_client.ping()
                logger.info("Successfully connected to Redis (async).")
            except Exception as ping_err:
                logger.warning(
                    "Async Redis ping failed: %s. Redis features may be unavailable.",
                    ping_err,
                )
                # If ping fails, close and clear the client so next attempt can recreate
                try:
                    await _async_client.aclose()
                except Exception:
                    pass
                _async_client = None
        except Exception as e:
            logger.error("Failed to initialize async Redis client: %s", e)
            logger.debug("Redis URL (masked): %s", _mask_redis_url(settings.REDIS_URL))
            _async_client = None

    return _async_client


async def close_redis_clients() -> None:
    """
    Close existing Redis connections (called on application shutdown).
    Handles both sync and async clients safely.
    """
    global _sync_client, _async_client

    if _sync_client is not None:
        try:
            _sync_client.close()
        except Exception as e:
            logger.debug("Error while closing sync redis client: %s", e)
        _sync_client = None

    if _async_client is not None:
        try:
            await _async_client.aclose()
        except Exception as e:
            logger.debug("Error while closing async redis client: %s", e)
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
