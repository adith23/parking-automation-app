from sqlalchemy import Column, Integer, String, Float, Time, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from geoalchemy2 import Geography
from .parking_slot_model import ParkingSlot


class ParkingLot(Base):
    __tablename__ = "parking_lots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    address = Column(String, nullable=False)
    # Storing as Geography type for efficient location queries.
    # SRID=4326 is the standard for GPS coordinates (latitude/longitude).
    gps_coordinates = Column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    total_slots = Column(Integer, nullable=False)
    is_open = Column(Boolean, nullable=False, server_default="true")


    # For simplicity, using a single price. Could be expanded to JSON for complex rates.
    price_per_hour = Column(Float, nullable=False)

    open_time = Column(Time, nullable=False)
    close_time = Column(Time, nullable=False)

    # Using JSON to store structured additional information
    additional_info = Column(JSON, nullable=True)
    # Example:
    # {
    #   "suitable_vehicle_types": ["Car", "Motorcycle"],
    #   "rules_and_regulations": "...",
    #   "security_and_safety": "CCTV available"
    # }

    # Using JSON to store a list of URLs for photos and videos
    media_urls = Column(JSON, nullable=True)
    # Example:
    # {
    #   "photos": ["url1.jpg", "url2.jpg"],
    #   "videos": ["url1.mp4"]
    # }

    owner_id = Column(Integer, ForeignKey("parking_lot_owners.id"), nullable=False)
    owner = relationship("ParkingLotOwner", back_populates="parking_lots")
    slots = relationship(
        "ParkingSlot", back_populates="parking_lot", cascade="all, delete-orphan"
    )
    bookings = relationship("Booking", back_populates="parking_lot")
    subscription_plans = relationship(
        "SubscriptionPlan",
        back_populates="parking_lot",
        overlaps="applicable_subscription_plans",
    )  # Deprecated: for backward compatibility
    applicable_subscription_plans = relationship(
        "SubscriptionPlan",
        secondary="subscription_plan_lots",
        back_populates="applicable_lots",
        overlaps="subscription_plans",

    )  # Many-to-many relationship
