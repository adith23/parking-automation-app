from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
import math
import logging
import re

from app.models.driver_models.parking_session_model import (
    ParkingSession,
    ParkingSessionStatus,
)
from app.models.driver_models.vehicle_model import Vehicle
from app.models.driver_models.booking_model import Booking, BookingStatus
from app.models.owner_models.parking_slot_model import ParkingSlot
from app.models.owner_models.parking_lot_model import ParkingLot
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)


def normalize_license_plate(plate: str) -> str:
    """Normalize license plate: uppercase, remove spaces and special characters."""
    if not plate:
        return ""
    # Remove spaces, hyphens, and special characters, then uppercase
    normalized = re.sub(r"[^A-Z0-9]", "", plate.upper())
    return normalized


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def fuzzy_match_license_plate(detected_plate: str, db: Session) -> Optional[Vehicle]:
    """
    Find a vehicle by license plate using fuzzy matching.
    Returns the vehicle if found (exact match or Levenshtein distance < 2).
    """
    normalized_detected = normalize_license_plate(detected_plate)

    # First try exact match
    vehicle = (
        db.query(Vehicle).filter(Vehicle.license_plate == normalized_detected).first()
    )

    if vehicle:
        return vehicle

    # If no exact match, try fuzzy matching
    all_vehicles = db.query(Vehicle).all()
    for v in all_vehicles:
        normalized_db = normalize_license_plate(v.license_plate)
        distance = levenshtein_distance(normalized_detected, normalized_db)
        if distance < 2:  # Levenshtein distance threshold
            logger.info(
                f"Fuzzy match found: '{detected_plate}' matched '{v.license_plate}' "
                f"(distance: {distance})"
            )
            return v

    return None


class SessionService:
    def __init__(self):
        pass

    def detect_license_plate_arrival(
        self, license_plate: str, slot_id: int, detected_at: datetime
    ) -> Optional[ParkingSession]:
        """
        Check if license plate has active booking and create session if confirmed booking exists.
        Also creates walk-in session if vehicle exists but no booking.
        """
        logger.info(
            f"Attempting to detect arrival for license plate: {license_plate} in slot {slot_id}"
        )

        db: Session = SessionLocal()
        try:
            # Normalize and find vehicle
            vehicle = fuzzy_match_license_plate(license_plate, db)

            if not vehicle:
                logger.warning(
                    f"No vehicle found for license plate: {license_plate} (normalized: {normalize_license_plate(license_plate)})"
                )
                return None

            # Get parking slot to get parking_lot_id
            parking_slot = (
                db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).first()
            )
            if not parking_slot:
                logger.error(f"Parking slot {slot_id} not found")
                return None

            # Check if there's already an active session for this slot
            existing_session = (
                db.query(ParkingSession)
                .filter(
                    and_(
                        ParkingSession.parking_slot_id == slot_id,
                        ParkingSession.status == ParkingSessionStatus.ACTIVE,
                    )
                )
                .first()
            )

            if existing_session:
                logger.debug(
                    f"Active session already exists for slot {slot_id}: session {existing_session.id}"
                )
                return existing_session

            # Check for CONFIRMED booking matching license_plate and slot_id
            normalized_plate = normalize_license_plate(license_plate)
            booking = (
                db.query(Booking)
                .filter(
                    and_(
                        Booking.license_plate == normalized_plate,
                        Booking.parking_slot_id == slot_id,
                        Booking.status == BookingStatus.CONFIRMED,
                    )
                )
                .first()
            )

            # Create session
            session = ParkingSession(
                booking_id=booking.id if booking else None,
                vehicle_id=vehicle.id,
                parking_slot_id=slot_id,
                parking_lot_id=parking_slot.parking_lot_id,
                license_plate=normalize_license_plate(license_plate),
                start_time=detected_at,
                status=ParkingSessionStatus.ACTIVE,
            )

            db.add(session)
            db.commit()
            db.refresh(session)

            session_type = "booked" if booking else "walk-in"
            logger.info(
                f"Created {session_type} parking session {session.id} for "
                f"license plate {license_plate} in slot {slot_id}"
            )

            return session

        except Exception as e:
            db.rollback()
            logger.error(f"Error detecting license plate arrival: {e}")
            return None
        finally:
            db.close()

    def handle_slot_status_change(
        self,
        slot_id: int,
        old_status: str,
        new_status: str,
        license_plate: Optional[str] = None,
    ) -> Optional[ParkingSession]:
        """
        Process slot status transitions.
        - available→occupied: Try to detect arrival (if license_plate provided)
        - occupied→available: End active session for that slot
        """
        db: Session = SessionLocal()
        try:
            # Handle arrival: available → occupied
            if old_status == "available" and new_status == "occupied":
                if license_plate:
                    return self.detect_license_plate_arrival(
                        license_plate, slot_id, datetime.now(timezone.utc)
                    )
                return None

            # Handle departure: occupied → available
            if old_status == "occupied" and new_status == "available":
                 end_time = datetime.now(timezone.utc)
                 return self.end_session_by_slot(slot_id, end_time, db)

            return None
        except Exception as e:
            logger.error(f"Error handling slot status change: {e}")
            return None
        finally:
            db.close()

    def get_active_session_by_license_plate(
        self, license_plate: str, db: Session = None
    ) -> Optional[ParkingSession]:
        """Find active session for a license plate."""
        if db is None:
            db = SessionLocal()
            should_close = True
        else:
            should_close = False

        try:
            normalized_plate = normalize_license_plate(license_plate)
            session = (
                db.query(ParkingSession)
                .filter(
                    and_(
                        ParkingSession.license_plate == normalized_plate,
                        ParkingSession.status == ParkingSessionStatus.ACTIVE,
                    )
                )
                .first()
            )
            return session
        finally:
            if should_close:
                db.close()

    def get_active_session_by_slot(
        self, slot_id: int, db: Session = None
    ) -> Optional[ParkingSession]:
        """Find active session for a slot."""
        if db is None:
            db = SessionLocal()
            should_close = True
        else:
            should_close = False

        try:
            session = (
                db.query(ParkingSession)
                .filter(
                    and_(
                        ParkingSession.parking_slot_id == slot_id,
                        ParkingSession.status == ParkingSessionStatus.ACTIVE,
                    )
                )
                .first()
            )
            return session
        finally:
            if should_close:
                db.close()

    def end_session(
        self, session_id: int, end_time: datetime, db: Session = None
    ) -> ParkingSession:
        """Mark session as completed and calculate duration/cost."""
        if db is None:
            db = SessionLocal()
            should_close = True
        else:
            should_close = False

        try:
            session = (
                db.query(ParkingSession).filter(ParkingSession.id == session_id).first()
            )

            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parking session not found",
                )

            if session.status != ParkingSessionStatus.ACTIVE:
                return session

            session.end_time = end_time
            session.status = ParkingSessionStatus.COMPLETED

            # Calculate duration
            duration = (end_time - session.start_time).total_seconds() / 60.0
            session.total_duration_minutes = duration

            # Use the dedicated cost calculation method instead of duplicating logic
            session.parking_cost = self.calculate_session_cost(session_id, db)

            db.commit()
            db.refresh(session)

            logger.info(
                f"Ended parking session {session_id}. Duration: {duration:.2f} minutes, "
                f"Cost: ${session.parking_cost:.2f}"
            )

            return session

        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error ending session {session_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to end parking session",
            )
        finally:
            if should_close:
                db.close()

    def end_session_by_slot(
        self, slot_id: int, end_time: datetime, db: Session = None
    ) -> Optional[ParkingSession]:
        """End active session for a slot."""
        session = self.get_active_session_by_slot(slot_id, db)
        if session:
            return self.end_session(session.id, end_time, db)
        return None

    def calculate_session_cost(self, session_id: int, db: Session = None) -> float:
        """Calculate parking cost based on duration and parking lot pricing."""
        if db is None:
            db = SessionLocal()
            should_close = True
        else:
            should_close = False

        try:
            session = (
                db.query(ParkingSession).filter(ParkingSession.id == session_id).first()
            )

            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parking session not found",
                )

            # Get parking lot pricing
            parking_lot = (
                db.query(ParkingLot)
                .filter(ParkingLot.id == session.parking_lot_id)
                .first()
            )

            if not parking_lot:
                return 0.0

            # Calculate duration
            if session.end_time:
                duration_minutes = (
                    session.end_time - session.start_time
                ).total_seconds() / 60.0
            else:
                # Active session - calculate up to now
                duration_minutes = (
                    datetime.now(timezone.utc) - session.start_time
                ).total_seconds() / 60.0

            # Calculate cost using 30-minute blocks (round up)
            blocks = math.ceil(duration_minutes / 30.0)
            cost = parking_lot.price_per_hour * (blocks * 30 / 60.0)

            return cost

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error calculating session cost: {e}")
            return 0.0
        finally:
            if should_close:
                db.close()

    def get_driver_sessions(
        self,
        driver_id: int,
        status_filter: Optional[ParkingSessionStatus] = None,
        db: Session = None,
    ) -> List[ParkingSession]:
        """Get all parking sessions for a driver."""
        if db is None:
            db = SessionLocal()
            should_close = True
        else:
            should_close = False

        try:
            # Get vehicles owned by driver
            vehicles = db.query(Vehicle).filter(Vehicle.driver_id == driver_id).all()
            vehicle_ids = [v.id for v in vehicles]

            if not vehicle_ids:
                return []

            query = db.query(ParkingSession).filter(
                ParkingSession.vehicle_id.in_(vehicle_ids)
            )

            if status_filter:
                query = query.filter(ParkingSession.status == status_filter)

            return query.order_by(ParkingSession.start_time.desc()).all()

        finally:
            if should_close:
                db.close()

    def get_session_by_id(
        self, session_id: int, driver_id: int, db: Session
    ) -> ParkingSession:
        """Get a specific parking session by ID, verifying driver ownership."""
        session = (
            db.query(ParkingSession).filter(ParkingSession.id == session_id).first()
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parking session not found",
            )

        # Verify driver owns the vehicle
        vehicle = db.query(Vehicle).filter(Vehicle.id == session.vehicle_id).first()
        if not vehicle or vehicle.driver_id != driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Parking session does not belong to driver",
            )

        return session


# Singleton instance
session_service = SessionService()