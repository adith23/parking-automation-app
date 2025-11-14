from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import time
from geoalchemy2.elements import WKBElement
from shapely import wkb
from shapely.geometry import Point
from geoalchemy2.shape import to_shape
from .parking_slot_schema import ParkingSlot


class GpsCoordinates(BaseModel):
    latitude: float
    longitude: float

    @validator("latitude")
    def validate_latitude(cls, v):
        if not -90 <= v <= 90:
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @validator("longitude")
    def validate_longitude(cls, v):
        if not -180 <= v <= 180:
            raise ValueError("Longitude must be between -180 and 180")
        return v


# Nested model for additional information
class AdditionalInfo(BaseModel):
    suitable_vehicle_types: Optional[List[str]] = None
    rules_and_regulations: Optional[str] = None
    security_and_safety: Optional[str] = None


# Nested model for media URLs
class MediaURLs(BaseModel):
    photos: Optional[List[str]] = None
    videos: Optional[List[str]] = None


# Base model for common parking lot attributes
class ParkingLotBase(BaseModel):
    name: str
    address: str
    gps_coordinates: Optional[GpsCoordinates] = None
    total_slots: int
    price_per_hour: float
    open_time: time
    close_time: time
    is_open: bool
    additional_info: Optional[AdditionalInfo] = None
    media_urls: Optional[MediaURLs] = None


# Schema for creating a new parking lot
class ParkingLotCreate(ParkingLotBase):
    pass


# Schema for updating a parking lot (all fields are optional)
class ParkingLotUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    gps_coordinates: Optional[GpsCoordinates] = None
    total_slots: Optional[int] = None
    price_per_hour: Optional[float] = None
    open_time: Optional[time] = None
    close_time: Optional[time] = None
    is_open: Optional[bool] = None
    additional_info: Optional[AdditionalInfo] = None
    media_urls: Optional[MediaURLs] = None


# Schema for updating just the status
class ParkingLotStatusUpdate(BaseModel):
    is_open: bool


# Schema for reading/responding with parking lot data
class ParkingLotResponse(ParkingLotBase):
    id: int
    owner_id: int
    # Calculated fields (optional, only present when requested)
    distance_meters: Optional[float] = None
    walking_time_minutes: Optional[int] = None
    status: Optional[str] = None  # "open", "closed", "opening_soon"
    status_message: Optional[str] = None
    status_color: Optional[str] = None
    available_slots: Optional[int] = None
    occupied_slots: Optional[int] = None
    reserved_slots: Optional[int] = None
    slots: List[ParkingSlot] = []

    class Config:
        from_attributes = True

    @validator("gps_coordinates", pre=True, allow_reuse=True)
    def transform_wkb_to_dict(cls, v):
        """Transform a WKBElement into a serializable dictionary."""
        if v is None or isinstance(v, dict):
            return v
        try:
            point: Point = to_shape(v)  # type: ignore
            return {"latitude": point.y, "longitude": point.x}
        except Exception as e:
            raise ValueError(f"Invalid geometry: {e}")
