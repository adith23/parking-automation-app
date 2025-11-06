from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException, status
from datetime import datetime, timedelta
import uuid
import logging

from app.models.driver_models.booking_model import Booking, BookingStatus
from app.models.driver_models.vehicle_model import Vehicle
from app.models.owner_models.parking_slot_model import ParkingSlot
from app.models.owner_models.parking_lot_model import ParkingLot
from app.core.redis import get_redis
from app.schemas.driver_schemas.booking_schema import BookingCreate, BookingConfirm
import re

logger = logging.getLogger(__name__)


class BookingService:
    def __init__(self):
        self.lock_ttl = 60  # 60 seconds lock TTL
        self.redis = get_redis()

    def _get_lock_key(self, slot_id: int) -> str:
        """Generate Redis lock key for a slot."""
        return f"slot:{slot_id}:lock"

    def _acquire_lock(self, slot_id: int, driver_id: int) -> bool:
        """
        Attempt to acquire a lock on a parking slot using Redis SETNX.
        Returns True if lock was acquired, False otherwise.
        """
        if not self.redis:
            logger.warning("Redis not available, proceeding without lock")
            return True  # Fallback: allow booking without lock if Redis unavailable

        lock_key = self._get_lock_key(slot_id)
        lock_value = f"{driver_id}:{uuid.uuid4().hex[:8]}"  # driver_id:random_token for idempotency

        try:
            # SETNX with expiration
            result = self.redis.set(
                lock_key,
                lock_value.encode("utf-8"),
                nx=True,  # Only set if key doesn't exist
                ex=self.lock_ttl,  # Expire after TTL seconds
            )
            return result is True
        except Exception as e:
            logger.error(f"Error acquiring lock for slot {slot_id}: {e}")
            # Fallback: allow booking if Redis fails
            return True

    def _release_lock(self, slot_id: int) -> None:
        """Release the lock on a parking slot."""
        if not self.redis:
            return

        lock_key = self._get_lock_key(slot_id)
        try:
            self.redis.delete(lock_key)
        except Exception as e:
            logger.error(f"Error releasing lock for slot {slot_id}: {e}")

    def _normalize_license_plate(self, plate: str) -> str:
        """Normalize license plate: uppercase, remove spaces and special characters."""
        if not plate:
            return ""
        normalized = re.sub(r"[^A-Z0-9]", "", plate.upper())
        return normalized

    def _validate_booking_request(
        self, driver_id: int, license_plate: str, parking_slot_id: int, db: Session
    ) -> tuple[ParkingSlot, Vehicle, ParkingLot]:
        """
        Validate booking request transactionally.
        Returns (parking_slot, vehicle, parking_lot) if valid, raises HTTPException otherwise.
        """
        # Normalize license plate
        normalized_plate = self._normalize_license_plate(license_plate)
        
        # Check if vehicle exists and belongs to driver
        vehicle = (
            db.query(Vehicle)
            .filter(
                and_(
                    Vehicle.license_plate == normalized_plate,
                    Vehicle.driver_id == driver_id
                )
            )
            .first()
        )

        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle with license plate '{license_plate}' not found or does not belong to driver",
            )

        # Check if parking slot exists and is available
        parking_slot = (
            db.query(ParkingSlot).filter(ParkingSlot.id == parking_slot_id).first()
        )

        if not parking_slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Parking slot not found"
            )

        # Check slot status
        if parking_slot.status not in ["available", "reserved"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parking slot is not available (status: {parking_slot.status})",
            )

        # Get parking lot to check open hours
        parking_lot = (
            db.query(ParkingLot)
            .filter(ParkingLot.id == parking_slot.parking_lot_id)
            .first()
        )

        if not parking_lot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Parking lot not found"
            )

        # Check if parking lot is currently open
        current_time = datetime.now().time()
        if not (parking_lot.open_time <= current_time <= parking_lot.close_time):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parking lot is closed. Open hours: {parking_lot.open_time} - {parking_lot.close_time}",
            )

        # Check for existing active bookings for this slot
        existing_booking = (
            db.query(Booking)
            .filter(
                and_(
                    Booking.parking_slot_id == parking_slot_id,
                    Booking.status.in_(
                        [
                            BookingStatus.INITIATED,
                            BookingStatus.LOCKED,
                            BookingStatus.CONFIRMED,
                        ]
                    ),
                )
            )
            .first()
        )

        if existing_booking:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Slot is already booked or locked by another driver",
            )

        return parking_slot, vehicle, parking_lot

    def initiate_booking(
        self, driver_id: int, booking_data: BookingCreate, db: Session
    ) -> Booking:
        """
        Initiate a booking by acquiring a lock and creating a booking record.
        """
        parking_slot_id = booking_data.parking_slot_id
        license_plate = booking_data.license_plate

        # Step 1: Attempt to acquire lock
        if not self._acquire_lock(parking_slot_id, driver_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Slot is temporarily locked by another driver. Please try again.",
            )

        try:
            # Step 2: Validate availability and constraints transactionally
            parking_slot, vehicle, parking_lot = self._validate_booking_request(
                driver_id, license_plate, parking_slot_id, db
            )

            # Step 3: Create booking record in INITIATED status
            expires_at = datetime.utcnow() + timedelta(seconds=self.lock_ttl)
            normalized_plate = self._normalize_license_plate(license_plate)

            booking = Booking(
                driver_id=driver_id,
                license_plate=normalized_plate,
                parking_slot_id=parking_slot_id,
                parking_lot_id=parking_lot.id,
                status=BookingStatus.INITIATED,
                expires_at=expires_at,
            )

            db.add(booking)
            db.commit()
            db.refresh(booking)

            logger.info(
                f"Booking {booking.id} initiated for slot {parking_slot_id} by driver {driver_id}"
            )
            return booking

        except HTTPException:
            # Release lock if validation fails
            self._release_lock(parking_slot_id)
            raise
        except Exception as e:
            # Release lock on any other error
            self._release_lock(parking_slot_id)
            db.rollback()
            logger.error(f"Error initiating booking: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initiate booking",
            )

    def confirm_booking(self, driver_id: int, booking_id: int, db: Session) -> Booking:
        """
        Confirm a booking, updating slot status to reserved.
        """
        # Get booking and verify ownership
        booking = (
            db.query(Booking)
            .filter(and_(Booking.id == booking_id, Booking.driver_id == driver_id))
            .first()
        )

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found or does not belong to driver",
            )

        # Check if booking is in a valid state for confirmation
        if booking.status not in [BookingStatus.INITIATED, BookingStatus.LOCKED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot confirm booking in status: {booking.status}",
            )

        # Check if lock has expired
        if booking.expires_at and booking.expires_at < datetime.utcnow():
            booking.status = BookingStatus.EXPIRED
            db.commit()
            self._release_lock(booking.parking_slot_id)
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Booking lock has expired. Please initiate a new booking.",
            )

        try:
            # Re-validate slot availability
            parking_slot = (
                db.query(ParkingSlot)
                .filter(ParkingSlot.id == booking.parking_slot_id)
                .first()
            )

            if not parking_slot:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parking slot not found",
                )

            if parking_slot.status not in ["available", "reserved"]:
                booking.status = BookingStatus.CANCELED
                db.commit()
                self._release_lock(booking.parking_slot_id)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Slot is no longer available (status: {parking_slot.status})",
                )

            # Update booking to CONFIRMED
            booking.status = BookingStatus.CONFIRMED
            booking.confirmed_at = datetime.utcnow()

            # Update slot status to reserved
            parking_slot.status = "reserved"
            parking_slot.last_updated_at = datetime.utcnow()

            db.commit()
            db.refresh(booking)

            # Release the lock (booking is now confirmed)
            self._release_lock(booking.parking_slot_id)

            logger.info(
                f"Booking {booking_id} confirmed for slot {booking.parking_slot_id}"
            )
            return booking

        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error confirming booking {booking_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to confirm booking",
            )

    def cancel_booking(
        self,
        driver_id: int,
        booking_id: int,
        reason: Optional[str] = None,
        db: Session = None,
    ) -> Booking:
        """
        Cancel a booking and release the slot.
        """
        booking = (
            db.query(Booking)
            .filter(and_(Booking.id == booking_id, Booking.driver_id == driver_id))
            .first()
        )

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found or does not belong to driver",
            )

        if booking.status in [BookingStatus.EXPIRED, BookingStatus.CANCELED]:
            return booking

        try:
            booking.status = BookingStatus.CANCELED
            booking.canceled_at = datetime.utcnow()

            # Release slot if it was reserved
            parking_slot = (
                db.query(ParkingSlot)
                .filter(ParkingSlot.id == booking.parking_slot_id)
                .first()
            )

            if parking_slot and parking_slot.status == "reserved":
                parking_slot.status = "available"
                parking_slot.last_updated_at = datetime.utcnow()

            db.commit()
            db.refresh(booking)

            # Release lock
            self._release_lock(booking.parking_slot_id)

            logger.info(f"Booking {booking_id} canceled by driver {driver_id}")
            return booking

        except Exception as e:
            db.rollback()
            logger.error(f"Error canceling booking {booking_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel booking",
            )

    def get_driver_bookings(
        self,
        driver_id: int,
        status_filter: Optional[BookingStatus] = None,
        db: Session = None,
    ) -> list[Booking]:
        """Get all bookings for a driver, optionally filtered by status."""
        query = db.query(Booking).filter(Booking.driver_id == driver_id)

        if status_filter:
            query = query.filter(Booking.status == status_filter)

        return query.order_by(Booking.booked_at.desc()).all()

    def get_booking_by_id(
        self, booking_id: int, driver_id: int, db: Session
    ) -> Booking:
        """Get a specific booking by ID."""
        booking = (
            db.query(Booking)
            .filter(and_(Booking.id == booking_id, Booking.driver_id == driver_id))
            .first()
        )

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
            )

        return booking

    def cleanup_expired_bookings(self, db: Session) -> int:
        """
        Background job to clean up expired bookings and revert slot status.
        Returns count of cleaned bookings.
        """
        now = datetime.utcnow()
        expired_bookings = (
            db.query(Booking)
            .filter(
                and_(
                    Booking.status.in_([BookingStatus.INITIATED, BookingStatus.LOCKED]),
                    Booking.expires_at < now,
                )
            )
            .all()
        )

        count = 0
        for booking in expired_bookings:
            try:
                booking.status = BookingStatus.EXPIRED

                # Release slot if it was reserved
                parking_slot = (
                    db.query(ParkingSlot)
                    .filter(ParkingSlot.id == booking.parking_slot_id)
                    .first()
                )

                if parking_slot and parking_slot.status == "reserved":
                    parking_slot.status = "available"
                    parking_slot.last_updated_at = now

                # Release lock
                self._release_lock(booking.parking_slot_id)

                count += 1
            except Exception as e:
                logger.error(f"Error cleaning up booking {booking.id}: {e}")

        db.commit()
        return count


# Singleton instance
booking_service = BookingService()
