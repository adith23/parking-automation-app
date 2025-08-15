from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ...database import Base


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Example relationships (uncomment and adjust as you add related models)
    # vehicles = relationship("Vehicle", back_populates="driver")
    # bookings = relationship("Booking", back_populates="driver")
    # subscriptions = relationship("DriverSubscription", back_populates="driver")
