from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.deps import get_current_driver, get_db
from app.models.driver_models.driver_model import Driver
from app.models.driver_models.booking_model import BookingStatus
from app.schemas.driver_schemas.booking_schema import (
    BookingCreate,
    BookingResponse,
    BookingConfirm,
    BookingCancel
)
from app.services.booking_service import booking_service

router = APIRouter()


@router.post(
    "/bookings",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate a booking for an available parking slot"
)
def initiate_booking(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
    booking_data: BookingCreate,
):
    """
    Initiate a booking by locking a parking slot.
    
    Flow:
    1. Attempts to acquire Redis lock on the slot
    2. Validates slot availability and constraints
    3. Creates booking record in INITIATED status
    4. Lock expires after 60 seconds if not confirmed
    """
    return booking_service.initiate_booking(
        driver_id=current_driver.id,
        booking_data=booking_data,
        db=db
    )


@router.post(
    "/bookings/{booking_id}/confirm",
    response_model=BookingResponse,
    summary="Confirm a booking"
)
def confirm_booking(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
    booking_id: int,
):
    """
    Confirm a booking, updating slot status to reserved.
    
    This updates:
    - Booking status to CONFIRMED
    - Parking slot status to reserved
    - Releases the Redis lock
    """
    return booking_service.confirm_booking(
        driver_id=current_driver.id,
        booking_id=booking_id,
        db=db
    )


@router.post(
    "/bookings/{booking_id}/cancel",
    response_model=BookingResponse,
    summary="Cancel a booking"
)
def cancel_booking(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
    booking_id: int,
    cancel_data: Optional[BookingCancel] = None,
):
    """
    Cancel a booking and release the parking slot.
    
    This updates:
    - Booking status to CANCELED
    - Parking slot status back to available (if reserved)
    - Releases the Redis lock
    """
    reason = cancel_data.reason if cancel_data else None
    return booking_service.cancel_booking(
        driver_id=current_driver.id,
        booking_id=booking_id,
        reason=reason,
        db=db
    )


@router.get(
    "/bookings",
    response_model=List[BookingResponse],
    summary="Get driver's bookings"
)
def get_bookings(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
    status: Optional[str] = Query(None, description="Filter by booking status"),
):
    """
    Get all bookings for the current driver.
    Optionally filter by status (initiated, locked, confirmed, expired, canceled).
    """
    status_filter = None
    if status:
        try:
            status_filter = BookingStatus(status.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}. Valid values: initiated, locked, confirmed, expired, canceled"
            )

    return booking_service.get_driver_bookings(
        driver_id=current_driver.id,
        status_filter=status_filter,
        db=db
    )


@router.get(
    "/bookings/{booking_id}",
    response_model=BookingResponse,
    summary="Get a specific booking"
)
def get_booking(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
    booking_id: int,
):
    """
    Get details of a specific booking.
    """
    return booking_service.get_booking_by_id(
        booking_id=booking_id,
        driver_id=current_driver.id,
        db=db
    )