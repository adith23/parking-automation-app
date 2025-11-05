from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Float, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from ...core.database import Base
import enum

class ParkingSessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELED = "canceled"

class ParkingSession(Base):
    __tablename__ = "parking_sessions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)  # Nullable for walk-in sessions
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    parking_slot_id = Column(Integer, ForeignKey("parking_slots.id"), nullable=False)
    parking_lot_id = Column(Integer, ForeignKey("parking_lots.id"), nullable=False)
    
    # License plate (denormalized for quick lookup)
    license_plate = Column(String(20), nullable=False, index=True)
    
    # Timestamps
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    end_time = Column(DateTime, nullable=True)
    
    # Status and duration
    status = Column(Enum(ParkingSessionStatus), default=ParkingSessionStatus.ACTIVE, nullable=False, index=True)
    total_duration_minutes = Column(Float, nullable=True)  # Calculated when session ends
    
    # Cost information (optional, can be calculated on-the-fly)
    parking_cost = Column(Float, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    booking = relationship("Booking", back_populates="parking_sessions")
    vehicle = relationship("Vehicle", back_populates="parking_sessions")
    parking_slot = relationship("ParkingSlot", back_populates="parking_sessions")

    # Indexes for performance
    __table_args__ = (
        Index('idx_session_slot_status', 'parking_slot_id', 'status'),
        Index('idx_session_license_status', 'license_plate', 'status'),
        Index('idx_session_start_time', 'start_time'),
    )
