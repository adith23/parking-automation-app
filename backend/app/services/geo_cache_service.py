from __future__ import annotations

import asyncio
import json
from typing import List

from redis.asyncio.client import PubSub

from sqlalchemy import func

from geoalchemy2.shape import to_shape

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.redis import availability_hash_key, geo_key, get_async_redis, get_redis
from app.core.socket_manager import broadcast_availability_update
from app.models.owner_models.parking_lot_model import ParkingLot
from app.models.owner_models.parking_slot_model import ParkingSlot


async def _sync_geo_cache_once() -> None:
    redis = get_redis()
    if redis is None:
        return

    db = SessionLocal()
    try:
        lots = db.query(ParkingLot.id, ParkingLot.gps_coordinates).all()
        pipeline = redis.pipeline()
        pipeline.delete(geo_key())

        for lot_id, geom in lots:
            if geom is None:
                continue
            try:
                shapely_point = to_shape(geom)
                # Add each point individually: key, longitude, latitude, member
                pipeline.geoadd(
                    geo_key(), shapely_point.x, shapely_point.y, str(lot_id)
                )
            except Exception:
                continue

        pipeline.execute()
    finally:
        db.close()


async def _publish_initial_availability() -> None:
    redis_sync = get_redis()
    if redis_sync is None:
        return

    db = SessionLocal()
    try:
        rows = db.query(
            ParkingSlot.parking_lot_id,
            ParkingSlot.status,
            ParkingSlot.id,
        ).all()
        availability: dict[int, dict[str, int]] = {}
        for lot_id, status, _ in rows:
            lot_state = availability.setdefault(
                lot_id, {"available": 0, "occupied": 0, "reserved": 0, "unavailable": 0}
            )
            lot_state[status] = lot_state.get(status, 0) + 1

        pipeline = redis_sync.pipeline()
        for lot_id, state in availability.items():
            hash_key = availability_hash_key(lot_id)
            pipeline.hset(hash_key, mapping=state)
        pipeline.execute()
    finally:
        db.close()


async def _availability_listener_task() -> None:
    redis = await get_async_redis()
    pubsub: PubSub = redis.pubsub()
    await pubsub.subscribe(settings.REDIS_AVAILABILITY_CHANNEL)

    async for message in pubsub.listen():
        if message.get("type") != "message":
            continue
        try:
            payload = json.loads(message.get("data"))
        except Exception:
            continue

        lot_id = payload.get("parking_lot_id")
        if lot_id is None:
            continue

        db = SessionLocal()
        try:
            counts = (
                db.query(ParkingSlot.status, func.count(ParkingSlot.id))
                .filter(ParkingSlot.parking_lot_id == lot_id)
                .group_by(ParkingSlot.status)
                .all()
            )
        finally:
            db.close()

        mapping = {"available": 0, "occupied": 0, "reserved": 0, "unavailable": 0}
        for status, count in counts:
            mapping[status] = count

        hash_key = availability_hash_key(lot_id)
        await redis.hset(hash_key, mapping=mapping)

        payload.setdefault("availability", mapping)
        await broadcast_availability_update(lot_id, payload)


async def start_geo_cache_tasks() -> List[asyncio.Task]:
    await _sync_geo_cache_once()
    await _publish_initial_availability()

    geo_task = asyncio.create_task(_geo_cache_refresh_loop())
    listener_task = asyncio.create_task(_availability_listener_task())
    return [geo_task, listener_task]


async def _geo_cache_refresh_loop() -> None:
    while True:
        await _sync_geo_cache_once()
        await asyncio.sleep(settings.GEO_CACHE_REFRESH_SECONDS)


async def stop_geo_cache_tasks(tasks: List[asyncio.Task]) -> None:
    for task in tasks:
        task.cancel()
    for task in tasks:
        try:
            await task
        except asyncio.CancelledError:
            pass
