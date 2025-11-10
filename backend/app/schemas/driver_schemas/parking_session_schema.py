from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
from enum import Enum

class ParkingSessionStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELED = "canceled"

class ParkingSessionBase(BaseModel):
    license_plate: str
    parking_slot_id: int

class ParkingSessionCreate(ParkingSessionBase):
    booking_id: Optional[int] = None
    vehicle_id: int
    parking_lot_id: int

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

    @validator("parking_lot_id")
    def validate_parking_lot_id(cls, v):
        if v <= 0:
            raise ValueError("Parking lot ID must be greater than 0")
        return v

class ParkingSessionUpdate(BaseModel):
    end_time: Optional[datetime] = None
    status: Optional[ParkingSessionStatus] = None
    total_duration_minutes: Optional[float] = None
    parking_cost: Optional[float] = None

class ParkingSessionResponse(ParkingSessionBase):
    id: int
    booking_id: Optional[int] = None
    vehicle_id: int
    parking_lot_id: int
    status: ParkingSessionStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    total_duration_minutes: Optional[float] = None
    parking_cost: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    # Calculated fields
    duration_minutes: Optional[float] = None
    estimated_cost: Optional[float] = None

    class Config:
        from_attributes = True

    @validator("duration_minutes", pre=True, always=True)
    def calculate_duration(cls, v, values):
        """Calculate duration if end_time is available."""
        if "end_time" in values and values["end_time"] and "start_time" in values:
            delta = values["end_time"] - values["start_time"]
            return delta.total_seconds() / 60.0
        return v

    @validator("estimated_cost", pre=True, always=True)
    def calculate_cost(cls, v, values):
        """Return parking_cost if available, otherwise None."""
        return values.get("parking_cost")
