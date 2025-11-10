from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OwnerBookingResponse(BaseModel):
    """Response model for owner booking view - matches frontend BookingCard format"""
    id: int
    bookingId: int  # Alias for frontend
    license_plate: str
    license: str  # Alias for frontend
    parking_lot_id: int
    parking_lot_name: str
    lot: str  # Alias for frontend
    parking_slot_id: int
    slot_number: Optional[str] = None
    status: str
    booked_at: Optional[datetime] = None
    date: str  # Formatted date string
    time: str  # Formatted time string
    confirmed_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    cancellationReason: Optional[str] = None  # Alias for frontend
    
    # For ongoing bookings
    expires_at: Optional[datetime] = None
    
    # For completed sessions
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_duration_minutes: Optional[float] = None
    duration: Optional[str] = None  # Formatted duration string
    parking_cost: Optional[float] = None
    price: Optional[float] = None  # Alias for frontend
    
    # Field to distinguish between confirmed booking and active session
    booking_type: Optional[str] = None  # "confirmed" or "active_session"
    session_status: Optional[str] = None  # "Active" or "Confirmed" for frontend display
    parking_status: Optional[str] = None  # "Parked" or "Arriving..." for frontend display
    
    class Config:
        from_attributes = True
