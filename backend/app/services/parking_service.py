from typing import List, Optional, Dict, Any, cast
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status
from datetime import time, datetime
from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape
from shapely.geometry import Point
import math

from app.models.owner_models import parking_lot_model as parking_model
from app.models.owner_models.owner_model import ParkingLotOwner
from app.schemas.owner_schemas.parking_lot_schema import (
    ParkingLotCreate,
    ParkingLotResponse,
    ParkingLotUpdate,
    GpsCoordinates,
)

class ParkingService:
    def __init__(self):
        pass

    def validate_parking_lot(self, parking_lot_data: dict) -> None:
        """Validate parking lot data according to business rules"""
        if parking_lot_data.get("total_slots", 0) <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Total slots must be greater than 0",
            )

        if parking_lot_data.get("price_per_hour", 0) <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Price per hour must be greater than 0",
            )

        # Validate time format
        try:
            if "open_time" in parking_lot_data:
                time.fromisoformat(str(parking_lot_data["open_time"]))
            if "close_time" in parking_lot_data:
                time.fromisoformat(str(parking_lot_data["close_time"]))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid time format"
            )

    def process_gps_coordinates(
        self, coords: Optional[Dict[str, float]]
    ) -> Optional[WKTElement]:
        """Process GPS coordinates and convert to WKT format for GeoAlchemy2"""
        if not coords:
            return None

        # Convert to WKT format for GeoAlchemy2
        wkt_point = f"POINT({coords['longitude']} {coords['latitude']})"
        return WKTElement(wkt_point, srid=4326)

    def _extract_gps_coordinates(self, gps_coordinates) -> Optional[Dict[str, float]]:
        """Extract GPS coordinates from WKBElement or return None."""
        if gps_coordinates is None:
            return None
        try:
            point: Point = to_shape(gps_coordinates)
            return {"latitude": point.y, "longitude": point.x}
        except Exception:
            return None

    def format_time_minutes(self, minutes: int) -> str:
        """Format minutes into a human-readable time string."""
        if minutes < 1:
            return "< 1 min"
        elif minutes == 1:
            return "1 min"
        else:
            return f"{minutes} mins"

    def create_parking_lot(
        self, owner_id: int, parking_lot_data: dict, db: Session
    ) -> parking_model.ParkingLot:
        """
        Create a new parking lot owned by the specified owner.
        """
        # Validate business rules
        self.validate_parking_lot(parking_lot_data)

        # Process GPS coordinates if provided
        coords = parking_lot_data.pop("gps_coordinates", None)
        if coords:
            parking_lot_data["gps_coordinates"] = self.process_gps_coordinates(coords)

        # Create the parking lot
        db_parking_lot = parking_model.ParkingLot(**parking_lot_data, owner_id=owner_id)

        db.add(db_parking_lot)
        db.commit()
        db.refresh(db_parking_lot)

        return db_parking_lot

    def get_owner_parking_lots(
        self, owner_id: int, db: Session, skip: int = 0, limit: int = 100
    ) -> List[parking_model.ParkingLot]:
        """
        Retrieve all parking lots owned by the specified owner.
        """
        parking_lots = (
            db.query(parking_model.ParkingLot)
            .filter(parking_model.ParkingLot.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
            .all()
        )
        return parking_lots

    def get_parking_lot(
        self, parking_lot_id: int, owner_id: int, db: Session
    ) -> parking_model.ParkingLot:
        """
        Retrieve a specific parking lot by its ID, ensuring owner authorization.
        """
        parking_lot = (
            db.query(parking_model.ParkingLot)
            .filter(parking_model.ParkingLot.id == parking_lot_id)
            .first()
        )

        if not parking_lot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Parking lot not found"
            )

        if cast(int, parking_lot.owner_id != owner_id) != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this parking lot",
            )

        return parking_lot

    def update_parking_lot(
        self, parking_lot_id: int, owner_id: int, updates: dict, db: Session
    ) -> parking_model.ParkingLot:
        """
        Update a parking lot's details, ensuring owner authorization.
        """
        # Get the existing parking lot with authorization check
        db_parking_lot = self.get_parking_lot(parking_lot_id, owner_id, db)

        # Process GPS coordinates if provided
        if "gps_coordinates" in updates:
            updates["gps_coordinates"] = self.process_gps_coordinates(
                updates["gps_coordinates"]
            )

        # Validate if updating with new data
        if updates:
            self.validate_parking_lot(updates)

        # Apply updates
        update_data = {k: v for k, v in updates.items() if v is not None}
        for key, value in update_data.items():
            setattr(db_parking_lot, key, value)

        db.add(db_parking_lot)
        db.commit()
        db.refresh(db_parking_lot)

        return db_parking_lot


'''
    def delete_parking_lot(
        self,
        parking_lot_id: int,
        owner_id: int,
        db: Session
    ) -> None:
        """
        Delete a parking lot, ensuring owner authorization.
        """
        # Get the existing parking lot with authorization check
        db_parking_lot = self.get_parking_lot(parking_lot_id, owner_id, db)
        
        db.delete(db_parking_lot)
        db.commit()

    def get_lot_stats(
        self,
        lot_id: int,
        owner_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Get statistics for a parking lot (occupancy, revenue, etc.)
        """
        # Ensure owner has access to this lot
        lot = self.get_parking_lot(lot_id, owner_id, db)
        
        # TODO: Implement actual statistics calculation
        # This would include:
        # - Current occupancy
        # - Revenue for date ranges
        # - Open/close status based on current time
        
        return {
            "lot_id": lot_id,
            "total_slots": lot.total_slots,
            "current_occupancy": 0,  # TODO: calculate from active sessions
            "is_open": True,  # TODO: check current time vs open/close hours
            "daily_revenue": 0.0,  # TODO: calculate from payments
        }

    def bulk_create_slots(
        self,
        lot_id: int,
        owner_id: int,
        slots_spec: List[Dict[str, Any]],
        db: Session
    ) -> List[parking_model.ParkingSlot]:
        """
        Bulk create parking slots for a lot.
        This is a placeholder for when you implement the ParkingSlot model.
        """
        # Ensure owner has access to this lot
        self.get_parking_lot(lot_id, owner_id, db)
        
        # TODO: Implement when you add ParkingSlot model
        # This would create multiple slots based on the specification
        raise NotImplementedError("ParkingSlot model not yet implemented")

    def get_slots(
        self,
        lot_id: int,
        owner_id: int,
        status: Optional[str] = None,
        db: Session = None
    ) -> List[Any]:
        """
        Get parking slots for a lot.
        This is a placeholder for when you implement the ParkingSlot model.
        """
        # Ensure owner has access to this lot
        self.get_parking_lot(lot_id, owner_id, db)
        
        # TODO: Implement when you add ParkingSlot model
        return []

    def add_camera(
        self,
        lot_id: int,
        owner_id: int,
        camera_data: Dict[str, Any],
        db: Session
    ) -> Any:
        """
        Add a camera to a parking lot.
        This is a placeholder for when you implement the Camera model.
        """
        # Ensure owner has access to this lot
        self.get_parking_lot(lot_id, owner_id, db)
        
        # TODO: Implement when you add Camera model
        raise NotImplementedError("Camera model not yet implemented")

    def validate_open_hours(
        self,
        lot_id: int,
        timestamp: time,
        db: Session
    ) -> bool:
        """
        Check if a parking lot is open at the specified time.
        """
        # TODO: Implement when you have the lot data
        # This would check current time against open_time and close_time
        return True
'''
parking_service = ParkingService()
