from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
from enum import Enum

class BookingStatus(str, Enum):
    INITIATED = "initiated"
    LOCKED = "locked"
    CONFIRMED = "confirmed"
    EXPIRED = "expired"
    CANCELED = "canceled"

class BookingCreate(BaseModel):
    vehicle_id: int
    parking_slot_id: int

    @validator("vehicle_id")
    def validate_vehicle_id(cls, v):
        if v <= 0:
            raise ValueError("Vehicle ID must be greater than 0")
        return v

    @validator("parking_slot_id")
    def validate_parking_slot_id(cls, v):
        if v <= 0:
            raise ValueError("Parking slot ID must be greater than 0")
        return v

class BookingResponse(BaseModel):
    id: int
    driver_id: int
    vehicle_id: int
    parking_slot_id: int
    status: BookingStatus
    booked_at: datetime
    expires_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BookingConfirm(BaseModel):
    booking_id: int

class BookingCancel(BaseModel):
    booking_id: int
    reason: Optional[str] = None