from pydantic import BaseModel, validator
from typing import List, Dict, Any, Tuple
from geoalchemy2.shape import to_shape  # Add this import
from shapely.geometry import mapping  # Add this import


# --- Base Schema ---
# Contains the common fields shared across creation and reading.
class ParkingSlotBase(BaseModel):
    slot_number: str
    status: str = "available"

    # For GeoJSON, the API will handle a dictionary representing the polygon
    # Example: {"type": "Polygon", "coordinates": [[ [x1, y1], [x2, y2], ... ]]}
    location: Dict[str, Any]


# --- Create Schema ---
# Used when creating a new parking slot via an API endpoint.
# It requires the parking_lot_id but doesn't have a database-generated id yet.
class ParkingSlotCreate(ParkingSlotBase):
    parking_lot_id: int


# --- Bulk Create Schema ---
# Used by the web UI to send a list of drawn polygons
class ParkingSlotBulkCreate(BaseModel):
    slots: List[Dict[str, List[Tuple[int, int]]]]


# --- Update Schema ---
# Optional fields for updating a slot (e.g., changing its status).
class ParkingSlotUpdate(BaseModel):
    status: str | None = None


# --- Read Schema ---
# This is the full schema that will be returned by the API.
# It includes the database-generated id.
class ParkingSlot(ParkingSlotBase):
    id: int

    class Config:
        from_attributes = True

    @validator("location", pre=True, allow_reuse=True)
    def transform_wkb_to_dict(cls, v):
        """Transform a WKBElement into a serializable GeoJSON dictionary."""
        if v is None or isinstance(v, dict):
            return v
        try:
            # Convert WKBElement to a Shapely geometry object
            shape = to_shape(v)
            # Convert the Shapely object to a GeoJSON-like dictionary
            return mapping(shape)
        except Exception as e:
            raise ValueError(f"Invalid geometry data: {e}")
