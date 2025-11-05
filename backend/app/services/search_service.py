import math
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import case, func, cast
from sqlalchemy.orm import Session
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape

from app.core.redis import availability_hash_key, get_redis, search_room_key
from app.models.owner_models.parking_lot_model import ParkingLot
from app.models.owner_models.parking_slot_model import ParkingSlot

class SearchService:
    def __init__(self) -> None:
        pass

    def search_parking(
        self,
        *,
        latitude: float,
        longitude: float,
        radius_m: float,
        limit: int,
        db: Session,
        query_text: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        # Create search point as Geometry (cast later for Geography compatibility)
        search_point = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)

        # Cast Geography to Geometry for ST_DistanceSphere calculation
        # Geography type needs to be cast to Geometry for ST_DistanceSphere
        lot_coords_geom = cast(ParkingLot.gps_coordinates, Geometry)
        distance_expr = func.ST_DistanceSphere(lot_coords_geom, search_point)

        available_count = func.sum(
            case((ParkingSlot.status == "available", 1), else_=0)
        ).label("available_slots")
        total_count = func.count(ParkingSlot.id).label("total_slots")

        query = (
            db.query(
                ParkingLot,
                distance_expr.label("distance_meters"),
                available_count,
                total_count,
            )
            .outerjoin(ParkingSlot, ParkingSlot.parking_lot_id == ParkingLot.id)
            .filter(func.ST_DWithin(ParkingLot.gps_coordinates, search_point, radius_m))
            .group_by(ParkingLot.id)
            .order_by(distance_expr)
            .limit(limit)
        )

        if query_text:
            pattern = f"%{query_text}%"
            query = query.filter(
                func.or_(
                    ParkingLot.name.ilike(pattern),
                    ParkingLot.address.ilike(pattern),
                )
            )

        rows = query.all()
        redis_client = get_redis()

        results: List[Dict[str, Any]] = []
        for lot, distance_meters, available_slots, total_slots in rows:
            lot_coords = self._extract_gps_coordinates(lot.gps_coordinates)

            if lot_coords:
                distance_haversine = self._calculate_distance(
                    latitude,
                    longitude,
                    lot_coords["latitude"],
                    lot_coords["longitude"],
                )
            else:
                distance_haversine = distance_meters or 0.0

            redis_state = (
                redis_client.hgetall(availability_hash_key(lot.id))
                if redis_client is not None
                else {}
            )

            redis_available = int(redis_state.get(b"available", available_slots or 0))
            redis_reserved = int(redis_state.get(b"reserved", 0))
            redis_occupied = int(
                redis_state.get(b"occupied", (total_slots or 0) - redis_available)
            )

            walking_minutes = self._calculate_walking_time(distance_haversine)
            status_info = self._get_parking_status(lot)

            # Parse additional_info and media_urls if they're JSON strings
            additional_info = lot.additional_info
            if isinstance(additional_info, str):
                try:
                    import json

                    additional_info = json.loads(additional_info)
                except (json.JSONDecodeError, TypeError):
                    additional_info = None

            media_urls = lot.media_urls
            if isinstance(media_urls, str):
                try:
                    import json

                    media_urls = json.loads(media_urls)
                except (json.JSONDecodeError, TypeError):
                    media_urls = None

            result = {
                "id": lot.id,
                "name": lot.name,
                "address": lot.address,
                "gps_coordinates": lot_coords,
                "total_slots": total_slots or lot.total_slots,
                "available_slots": redis_available,
                "occupied_slots": redis_occupied,
                "reserved_slots": redis_reserved,
                "price_per_hour": lot.price_per_hour,
                "open_time": lot.open_time,
                "close_time": lot.close_time,
                "additional_info": lot.additional_info,
                "media_urls": lot.media_urls,
                "owner_id": lot.owner_id,
                "distance_meters": round(distance_haversine, 2),
                "walking_time_minutes": walking_minutes,
                "status": status_info["status"],
                "status_message": status_info["message"],
                "status_color": status_info["color"],
            }
            results.append(result)

        return results

    def build_room_key(self, latitude: float, longitude: float, radius_m: float) -> str:
        return search_room_key(latitude, longitude, radius_m)

    def _calculate_distance(
        self, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.asin(math.sqrt(a))
        r = 6371000
        return c * r

    def _calculate_walking_time(self, distance_meters: float) -> int:
        walking_speed_ms = 1.4
        time_seconds = distance_meters / walking_speed_ms if walking_speed_ms else 0
        return int(time_seconds / 60)

    def _get_parking_status(self, parking_lot: ParkingLot) -> Dict[str, str]:
        now = datetime.now().time()
        current_minutes = now.hour * 60 + now.minute
        open_minutes = parking_lot.open_time.hour * 60 + parking_lot.open_time.minute
        close_minutes = parking_lot.close_time.hour * 60 + parking_lot.close_time.minute

        if open_minutes <= current_minutes <= close_minutes:
            return {"status": "open", "message": "Open now", "color": "#4CAF50"}
        if current_minutes < open_minutes:
            minutes_until_open = open_minutes - current_minutes
            return {
                "status": "closed",
                "message": f"Opens in {self._format_time_minutes(minutes_until_open)}",
                "color": "#FF9800",
            }
        return {"status": "closed", "message": "Closed", "color": "#F44336"}

    def _format_time_minutes(self, minutes: int) -> str:
        if minutes < 1:
            return "< 1 min"
        if minutes == 1:
            return "1 min"
        return f"{minutes} mins"

    def _extract_gps_coordinates(self, gps_coordinates) -> Optional[Dict[str, float]]:
        if gps_coordinates is None:
            return None
        try:
            point = to_shape(gps_coordinates)
            return {"latitude": point.y, "longitude": point.x}
        except Exception:
            return None


search_service = SearchService()
