from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from ...core.database import Base

# ===============================================
#  Enums
# ===============================================


class BillingCycle(str, PyEnum):
    """Billing cycle options for subscription plans."""

    MONTHLY = "monthly"
    ANNUAL = "annual"


class PlanStatus(str, PyEnum):
    """Status of subscription plans."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
    DRAFT = "draft"


class PlanType(str, PyEnum):
    """Type of subscription plan."""

    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


# ===============================================
#  Association Table
# ===============================================

# Association table for the many-to-many relationship
# between SubscriptionPlan and ParkingLot.
subscription_plan_lots = Table(
    "subscription_plan_lots",
    Base.metadata,
    Column(
        "plan_id",
        Integer,
        ForeignKey("subscription_plans.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "lot_id",
        Integer,
        ForeignKey("parking_lots.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# ===============================================
#  SQLAlchemy Models
# ===============================================


class SubscriptionPlan(Base):
    """Model for subscription plans created by parking lot owners."""

    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # --- Core Plan Details ---
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    plan_type = Column(Enum(PlanType), default=PlanType.BASIC, nullable=False)

    # --- Pricing ---
    monthly_price = Column(Float, nullable=False)
    annual_price = Column(Float, nullable=True)

    # --- Billing ---
    billing_cycle = Column(
        Enum(BillingCycle), default=BillingCycle.MONTHLY, nullable=False
    )
    billing_interval = Column(Integer, default=1, nullable=False)

    # --- Features & Limits ---
    max_vehicles = Column(Integer, default=1, nullable=False)
    reserved_slots = Column(Boolean, default=False, nullable=False)
    features = Column(JSON, nullable=True)  # For custom features

    # --- Status & Visibility ---
    status = Column(Enum(PlanStatus), default=PlanStatus.DRAFT, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    max_subscribers = Column(Integer, nullable=True)
    is_available = Column(Boolean, nullable=False, server_default="true")

    # --- Foreign Keys ---
    owner_id = Column(Integer, ForeignKey("parking_lot_owners.id"), nullable=False)
    lot_id = Column(
        Integer, ForeignKey("parking_lots.id"), nullable=True
    )  # Deprecated

    # --- Timestamps ---
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    effective_from = Column(DateTime, nullable=True)
    effective_until = Column(DateTime, nullable=True)

    # --- Soft Delete ---
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    # --- Relationships ---
    owner = relationship("ParkingLotOwner", back_populates="subscription_plans")
    # Deprecated relationship for backward compatibility
    parking_lot = relationship(
        "ParkingLot",
        foreign_keys=[lot_id],
        back_populates="subscription_plans",
        overlaps="applicable_lots",
    )
    # Many-to-many relationship for applicable lots
    applicable_lots = relationship(
        "ParkingLot",
        secondary="subscription_plan_lots",
        back_populates="applicable_subscription_plans",
        overlaps="parking_lot",
    )
    driver_subscriptions = relationship(
        "DriverSubscription", back_populates="plan", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<SubscriptionPlan(id={self.id}, name='{self.name}')>"


class DriverSubscription(Base):
    """Model for driver subscriptions to plans."""

    __tablename__ = "driver_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # --- Foreign Keys ---
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)

    # --- Status & Period ---
    status = Column(String(50), default="active", nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    next_billing_date = Column(DateTime, nullable=False)

    # --- Billing ---
    current_billing_cycle = Column(Enum(BillingCycle), nullable=False)
    current_price = Column(Float, nullable=False)

    # --- Cancellation Info ---
    cancelled_at = Column(DateTime, nullable=True)
    cancellation_reason = Column(String(255), nullable=True)
    refund_amount = Column(Float, default=0.0, nullable=False)

    # --- Timestamps ---
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # --- Relationships ---
    driver = relationship("Driver", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="driver_subscriptions")
    # payments = relationship("SubscriptionPayment", back_populates="subscription") # Future implementation

    def __repr__(self):
        return f"<DriverSubscription(id={self.id}, driver_id={self.driver_id})>"


class SubscriptionUsage(Base):
    """Model for tracking subscription usage."""

    __tablename__ = "subscription_usage"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # --- Foreign Keys ---
    subscription_id = Column(Integer, ForeignKey("driver_subscriptions.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("parking_sessions.id"), nullable=True)

    # --- Usage Metrics ---
    parking_hours = Column(Float, nullable=False)
    parking_cost = Column(Float, nullable=False)
    subscription_discount = Column(Float, default=0.0, nullable=False)
    final_cost = Column(Float, nullable=False)

    # --- Usage Period ---
    usage_date = Column(DateTime, nullable=False)
    billing_period_start = Column(DateTime, nullable=False)
    billing_period_end = Column(DateTime, nullable=False)

    # --- Timestamps ---
    created_at = Column(DateTime, default=func.now(), nullable=False)

    # --- Relationships ---
    subscription = relationship("DriverSubscription")
    parking_session = relationship("ParkingSession")

    def __repr__(self):
        return f"<SubscriptionUsage(id={self.id}, subscription_id={self.subscription_id})>"

'''
class SubscriptionPayment(Base):
    """Model for subscription payment records"""
    __tablename__ = "subscription_payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Payment Details
    subscription_id = Column(Integer, ForeignKey("driver_subscriptions.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    
    # Payment Status
    status = Column(String(50), default="pending", nullable=False)  # pending, completed, failed, refunded
    
    # Billing Period
    billing_period_start = Column(DateTime, nullable=False)
    billing_period_end = Column(DateTime, nullable=False)
    
    # Payment Provider Information
    payment_method = Column(String(100), nullable=True)  # stripe, paypal, etc.
    provider_payment_id = Column(String(255), nullable=True)  # External payment ID
    provider_fee = Column(Float, default=0.0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    paid_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    
    # Relationships
    subscription = relationship("DriverSubscription", back_populates="payments")
    
    def __repr__(self):
        return f"<SubscriptionPayment(id={self.id}, subscription_id={self.subscription_id}, amount={self.amount})>"
'''