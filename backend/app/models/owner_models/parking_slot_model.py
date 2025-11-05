from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from geoalchemy2 import Geometry

class ParkingSlot(Base):
    __tablename__ = "parking_slots"

    id = Column(Integer, primary_key=True, index=True)
    slot_number = Column(String, nullable=False) #
    
    # Foreign key to link to the ParkingLot table
    parking_lot_id = Column(Integer, ForeignKey("parking_lots.id"), nullable=False)
    
    # Store the polygon using PostGIS Geometry type
    location = Column(Geometry(geometry_type='POLYGON', srid=4326), nullable=False)
    
    status = Column(Enum('available', 'occupied', 'reserved', 'unavailable', name='slot_status_enum'), 
                    default='available', nullable=False)
    last_updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Establish the back-reference for the relationship
    parking_lot = relationship("ParkingLot", back_populates="slots")
    bookings = relationship("Booking", back_populates="parking_slot")
    parking_sessions = relationship("ParkingSession", back_populates="parking_slot")
