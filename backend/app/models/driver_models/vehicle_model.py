from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from ...core.database import Base

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    license_plate = Column(String(20), nullable=False, index=True)
    make = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    vehicle_type = Column(String(50), nullable=True)  # e.g., "Car", "Motorcycle"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    driver = relationship("Driver", back_populates="vehicles")
    bookings = relationship("Booking", back_populates="vehicle")
    parking_sessions = relationship("ParkingSession", back_populates="vehicle")