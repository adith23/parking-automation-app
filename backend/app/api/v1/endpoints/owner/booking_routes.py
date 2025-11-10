from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.deps import get_current_owner, get_db
from app.models.owner_models.owner_model import ParkingLotOwner
from app.schemas.owner_schemas.booking_schema import OwnerBookingResponse
from app.services.owner_booking_service import owner_booking_service

router = APIRouter()

# Get all bookings for owner's parking lots
@router.get(
    "/bookings",
    response_model=List[OwnerBookingResponse],
    summary="Get all bookings for owner's parking lots"
)
def get_owner_bookings(
    *,
    db: Session = Depends(get_db),
    current_owner: ParkingLotOwner = Depends(get_current_owner),
    status: Optional[str] = Query(
        "ongoing",
        description="Filter by booking status: ongoing, completed, or cancelled"
    ),
):
    """
    Get all bookings for parking lots owned by the current owner.
    
    - **ongoing**: Returns CONFIRMED bookings (bookings that are confirmed but not yet started as sessions)
    - **completed**: Returns COMPLETED parking sessions (sessions that have ended)
    - **cancelled**: Returns CANCELED bookings
    
    The response format matches the frontend BookingCard component requirements.
    """
    valid_statuses = ["ongoing", "completed", "cancelled", "canceled"]
    status_lower = status.lower() if status else "ongoing"
    
    if status_lower not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {status}. Valid values: {', '.join(valid_statuses)}"
        )
    
    bookings = owner_booking_service.get_bookings_by_status(
        owner_id=current_owner.id,
        status=status_lower,
        db=db
    )
    
    return bookings
