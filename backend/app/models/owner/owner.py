from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from ...database import Base

class ParkingLotOwner(Base):
    __tablename__ = "parking_lot_owners"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    parking_lots = relationship("ParkingLot", back_populates="owner")
    # subscription_plans = relationship("SubscriptionPlan", back_populates="owner")
