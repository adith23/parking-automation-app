from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from ...core.database import Base
import enum

class BookingStatus(str, enum.Enum):
    INITIATED = "initiated"
    LOCKED = "locked"
    CONFIRMED = "confirmed"
    EXPIRED = "expired"
    CANCELED = "canceled"

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    parking_slot_id = Column(Integer, ForeignKey("parking_slots.id"), nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.INITIATED, nullable=False)
    booked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)  # For lock expiration
    confirmed_at = Column(DateTime, nullable=True)
    canceled_at = Column(DateTime, nullable=True)

    # Relationships
    driver = relationship("Driver", back_populates="bookings")
    vehicle = relationship("Vehicle", back_populates="bookings")
    parking_slot = relationship("ParkingSlot", back_populates="bookings")
    parking_sessions = relationship("ParkingSession", back_populates="booking")

    # Indexes for performance
    __table_args__ = (
        Index('idx_parking_slot_status', 'parking_slot_id', 'status'),
        Index('idx_driver_status', 'driver_id', 'status'),
    )