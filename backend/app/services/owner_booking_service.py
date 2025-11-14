from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timezone
import logging

from app.models.driver_models.booking_model import Booking, BookingStatus
from app.models.driver_models.parking_session_model import ParkingSession, ParkingSessionStatus
from app.models.owner_models.parking_lot_model import ParkingLot
from app.models.owner_models.parking_slot_model import ParkingSlot
from app.schemas.owner_schemas.booking_schema import OwnerBookingResponse

logger = logging.getLogger(__name__)


class OwnerBookingService:
    def __init__(self):
        pass

    def _format_booking_response(
        self, 
        booking: Booking, 
        parking_lot: ParkingLot,
        parking_slot: Optional[ParkingSlot] = None
    ) -> Dict[str, Any]:
        """Format booking data for owner response"""
        # Format date and time
        dt = booking.booked_at
        date_str = dt.strftime('%Y-%m-%d') if dt else ""
        time_str = dt.strftime('%H:%M:%S') if dt else ""
        
        data = {
            "id": booking.id,
            "bookingId": booking.id,  # Frontend alias
            "license_plate": booking.license_plate,
            "license": booking.license_plate,  # Frontend alias
            "parking_lot_id": booking.parking_lot_id,
            "parking_lot_name": parking_lot.name,
            "lot": parking_lot.name,  # Frontend alias
            "parking_slot_id": booking.parking_slot_id,
            "status": booking.status.value,
            "booked_at": booking.booked_at,
            "date": date_str,
            "time": time_str,
            "confirmed_at": booking.confirmed_at,
            "canceled_at": booking.canceled_at,
            "expires_at": booking.expires_at,
            "cancellation_reason": None,  # Bookings don't have cancellation reason field yet
            "cancellationReason": None,  # Frontend alias
            "parking_cost": None,
            "price": None,  # Frontend alias
            "total_duration_minutes": None,
            "duration": None,
        }
        
        if parking_slot:
            data["slot_number"] = parking_slot.slot_number
        
        return data

    def _format_session_response(
        self,
        session: ParkingSession,
        parking_lot: ParkingLot,
        parking_slot: Optional[ParkingSlot] = None,
        booking: Optional[Booking] = None
    ) -> Dict[str, Any]:
        """Format parking session data for owner response"""
        # Use booking data if available, otherwise use session
        booking_id = booking.id if booking else session.id
        booked_at = booking.booked_at if booking else session.start_time
        
        # Format date and time
        dt = booked_at
        date_str = dt.strftime('%Y-%m-%d') if dt else ""
        time_str = dt.strftime('%H:%M:%S') if dt else ""
        
        # Format duration
        duration_str = None
        if session.total_duration_minutes:
            minutes = session.total_duration_minutes
            hours = int(minutes // 60)
            mins = int(minutes % 60)
            if hours > 0:
                duration_str = f"{hours}h {mins}m"
            else:
                duration_str = f"{mins}m"
        
        data = {
            "id": booking_id,
            "bookingId": booking_id,  # Frontend alias
            "license_plate": session.license_plate,
            "license": session.license_plate,  # Frontend alias
            "parking_lot_id": session.parking_lot_id,
            "parking_lot_name": parking_lot.name,
            "lot": parking_lot.name,  # Frontend alias
            "parking_slot_id": session.parking_slot_id,
            "status": "completed",  # Sessions are always completed when shown
            "start_time": session.start_time,
            "end_time": session.end_time,
            "total_duration_minutes": session.total_duration_minutes,
            "duration": duration_str,
            "parking_cost": session.parking_cost,
            "price": session.parking_cost,  # Frontend alias
            "booked_at": booked_at,
            "date": date_str,
            "time": time_str,
            "confirmed_at": None,
            "canceled_at": None,
            "expires_at": None,
            "cancellation_reason": None,
            "cancellationReason": None,
        }
        
        if parking_slot:
            data["slot_number"] = parking_slot.slot_number
        
        return data

    def get_ongoing_bookings(
        self, owner_id: int, db: Session
    ) -> List[OwnerBookingResponse]:
        """
        Get all ongoing bookings for parking lots owned by the owner.
        This includes:
        1. ACTIVE parking sessions (sessions that are currently in progress)
        2. CONFIRMED bookings that haven't started as sessions yet
        """
        # Get all parking lot IDs owned by this owner
        parking_lots = (
            db.query(ParkingLot)
            .filter(ParkingLot.owner_id == owner_id)
            .all()
        )
        
        if not parking_lots:
            return []
        
        parking_lot_ids = [lot.id for lot in parking_lots]
        
        responses = []
        
        # Get ACTIVE parking sessions (these are the primary "ongoing" bookings)
        active_sessions = (
            db.query(ParkingSession)
            .filter(
                and_(
                    ParkingSession.parking_lot_id.in_(parking_lot_ids),
                    ParkingSession.status == ParkingSessionStatus.ACTIVE
                )
            )
            .order_by(ParkingSession.start_time.desc())
            .all()
        )
        
        # Format active sessions
        for session in active_sessions:
            parking_lot = next((lot for lot in parking_lots if lot.id == session.parking_lot_id), None)
            if not parking_lot:
                continue
            
            parking_slot = (
                db.query(ParkingSlot)
                .filter(ParkingSlot.id == session.parking_slot_id)
                .first()
            )
            
            # Get associated booking if exists
            booking = None
            if session.booking_id:
                booking = (
                    db.query(Booking)
                    .filter(Booking.id == session.booking_id)
                    .first()
                )
            
            # Use booking data if available, otherwise use session data
            if booking:
                booking_data = self._format_booking_response(booking, parking_lot, parking_slot)
                # Add session-specific data
                booking_data["start_time"] = session.start_time
                duration_minutes = (datetime.now(timezone.utc) - session.start_time).total_seconds() / 60.0
                booking_data["total_duration_minutes"] = duration_minutes
                
                # Format duration string
                hours = int(duration_minutes // 60)
                mins = int(duration_minutes % 60)
                if hours > 0:
                    booking_data["duration"] = f"{hours}h {mins}m"
                else:
                    booking_data["duration"] = f"{mins}m"
                
                # Calculate current cost
                if parking_lot.price_per_hour:
                    hours_decimal = duration_minutes / 60.0
                    booking_data["parking_cost"] = parking_lot.price_per_hour * hours_decimal
                    booking_data["price"] = booking_data["parking_cost"]
            else:
                session_data = self._format_session_response(session, parking_lot, parking_slot, None)
                booking_data = session_data
                # Calculate current cost and duration for active session
                duration_minutes = (datetime.now(timezone.utc) - session.start_time).total_seconds() / 60.0
                booking_data["total_duration_minutes"] = duration_minutes
                
                # Format duration string
                hours = int(duration_minutes // 60)
                mins = int(duration_minutes % 60)
                if hours > 0:
                    booking_data["duration"] = f"{hours}h {mins}m"
                else:
                    booking_data["duration"] = f"{mins}m"
                
                if parking_lot.price_per_hour:
                    hours_decimal = duration_minutes / 60.0
                    booking_data["parking_cost"] = parking_lot.price_per_hour * hours_decimal
                    booking_data["price"] = booking_data["parking_cost"]
            
            booking_data["status"] = "ongoing"
            booking_data["booking_type"] = "active_session"
            booking_data["session_status"] = "Active"  # For frontend display
            booking_data["parking_status"] = "Parked"  # For frontend live indicator
            responses.append(OwnerBookingResponse(**booking_data))
        
        # Also get CONFIRMED bookings that don't have active sessions yet
        confirmed_bookings = (
            db.query(Booking)
            .filter(
                and_(
                    Booking.parking_lot_id.in_(parking_lot_ids),
                    Booking.status == BookingStatus.CONFIRMED
                )
            )
            .all()
        )
        
        # Filter out bookings that already have active sessions
        booking_ids_with_sessions = {session.booking_id for session in active_sessions if session.booking_id}
        
        for booking in confirmed_bookings:
            if booking.id in booking_ids_with_sessions:
                continue  # Skip if already has active session
            
            parking_lot = next((lot for lot in parking_lots if lot.id == booking.parking_lot_id), None)
            if not parking_lot:
                continue
            
            parking_slot = (
                db.query(ParkingSlot)
                .filter(ParkingSlot.id == booking.parking_slot_id)
                .first()
            )
            
            booking_data = self._format_booking_response(booking, parking_lot, parking_slot)
            booking_data["status"] = "ongoing"
            booking_data["booking_type"] = "confirmed"
            booking_data["session_status"] = "Confirmed"  # For frontend display
            booking_data["parking_status"] = "Arriving..."  # For frontend live indicator
            responses.append(OwnerBookingResponse(**booking_data))
        
        return responses

    def get_completed_bookings(
        self, owner_id: int, db: Session
    ) -> List[OwnerBookingResponse]:
        """
        Get all COMPLETED parking sessions for parking lots owned by the owner.
        These are sessions that have ended.
        """
        # Get all parking lot IDs owned by this owner
        parking_lots = (
            db.query(ParkingLot)
            .filter(ParkingLot.owner_id == owner_id)
            .all()
        )
        
        if not parking_lots:
            return []
        
        parking_lot_ids = [lot.id for lot in parking_lots]
        
        # Get COMPLETED sessions for these parking lots
        sessions = (
            db.query(ParkingSession)
            .filter(
                and_(
                    ParkingSession.parking_lot_id.in_(parking_lot_ids),
                    ParkingSession.status == ParkingSessionStatus.COMPLETED
                )
            )
            .order_by(ParkingSession.end_time.desc())
            .all()
        )
        
        # Format response
        responses = []
        for session in sessions:
            parking_lot = next((lot for lot in parking_lots if lot.id == session.parking_lot_id), None)
            if not parking_lot:
                continue
            
            parking_slot = (
                db.query(ParkingSlot)
                .filter(ParkingSlot.id == session.parking_slot_id)
                .first()
            )
            
            # Get associated booking if exists
            booking = None
            if session.booking_id:
                booking = (
                    db.query(Booking)
                    .filter(Booking.id == session.booking_id)
                    .first()
                )
            
            session_data = self._format_session_response(session, parking_lot, parking_slot, booking)
            responses.append(OwnerBookingResponse(**session_data))
        
        return responses

    def get_cancelled_bookings(
        self, owner_id: int, db: Session
    ) -> List[OwnerBookingResponse]:
        """
        Get all CANCELED bookings for parking lots owned by the owner.
        """
        # Get all parking lot IDs owned by this owner
        parking_lots = (
            db.query(ParkingLot)
            .filter(ParkingLot.owner_id == owner_id)
            .all()
        )
        
        if not parking_lots:
            return []
        
        parking_lot_ids = [lot.id for lot in parking_lots]
        
        # Get CANCELED bookings for these parking lots
        bookings = (
            db.query(Booking)
            .filter(
                and_(
                    Booking.parking_lot_id.in_(parking_lot_ids),
                    Booking.status == BookingStatus.CANCELED
                )
            )
            .order_by(Booking.canceled_at.desc())
            .all()
        )
        
        # Format response
        responses = []
        for booking in bookings:
            parking_lot = next((lot for lot in parking_lots if lot.id == booking.parking_lot_id), None)
            if not parking_lot:
                continue
            
            parking_slot = (
                db.query(ParkingSlot)
                .filter(ParkingSlot.id == booking.parking_slot_id)
                .first()
            )
            
            booking_data = self._format_booking_response(booking, parking_lot, parking_slot)
            booking_data["cancellation_reason"] = "Booking was cancelled"  # Default reason
            responses.append(OwnerBookingResponse(**booking_data))
        
        return responses

    def get_bookings_by_status(
        self, owner_id: int, status: str, db: Session
    ) -> List[OwnerBookingResponse]:
        """
        Get bookings by status for all parking lots owned by the owner.
        
        Args:
            owner_id: Owner ID
            status: 'ongoing', 'completed', or 'cancelled'
            db: Database session
        """
        status_lower = status.lower()
        
        if status_lower == "ongoing":
            return self.get_ongoing_bookings(owner_id, db)
        elif status_lower == "completed":
            return self.get_completed_bookings(owner_id, db)
        elif status_lower == "cancelled" or status_lower == "canceled":
            return self.get_cancelled_bookings(owner_id, db)
        else:
            return []


# Singleton instance
owner_booking_service = OwnerBookingService()
