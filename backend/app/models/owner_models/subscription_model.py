from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from datetime import datetime
from enum import Enum as PyEnum
from ...database import Base


class BillingCycle(PyEnum):
    """Billing cycle options for subscription plans"""
    MONTHLY = "monthly"
    ANNUAL = "annual"

class PlanStatus(PyEnum):
    """Status of subscription plans"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
    DRAFT = "draft"

class PlanType(PyEnum):
    """Type of subscription plan"""
    BASIC = "basic"

class SubscriptionPlan(Base):
    """Model for subscription plans created by parking lot owners"""
    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Basic Plan Information
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    plan_type = Column(Enum(PlanType), default=PlanType.BASIC, nullable=False)
    
    # Pricing Configuration
    monthly_price = Column(Float, nullable=False)  # Base monthly price
    annual_price = Column(Float, nullable=True)   # Annual price (if different from monthly)
    
    # Billing Configuration
    billing_cycle = Column(Enum(BillingCycle), default=BillingCycle.MONTHLY, nullable=False)
    billing_interval = Column(Integer, default=1, nullable=False)  
    
    # Plan Features and Limits
    max_vehicles = Column(Integer, default=1, nullable=False)
    reserved_slots = Column(Boolean, default=False, nullable=False)
    
    # Additional Features (stored as JSON for flexibility)
    features = Column(JSON, nullable=True)  # Custom features like "free_charging", "car_wash_discount"
    
    # Plan Status and Visibility
    status = Column(Enum(PlanStatus), default=PlanStatus.DRAFT, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)  # Highlight in listings
    max_subscribers = Column(Integer, nullable=True)  # Limit total subscribers (null = unlimited)
    
    # Relationships
    owner_id = Column(Integer, ForeignKey("parking_lot_owners.id"), nullable=False)
    lot_id = Column(Integer, ForeignKey("parking_lots.id"), nullable=True)  # null = general plan
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    effective_from = Column(DateTime, nullable=True)  # When plan becomes active
    effective_until = Column(DateTime, nullable=True)  # When plan expires
    
    # Soft delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    owner = relationship("ParkingLotOwner", back_populates="subscription_plans")
    parking_lot = relationship("ParkingLot", back_populates="subscription_plans")
    driver_subscriptions = relationship("DriverSubscription", back_populates="plan", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<SubscriptionPlan(id={self.id}, name='{self.name}', type={self.plan_type.value})>"


class DriverSubscription(Base):
    """Model for driver subscriptions to plans"""
    __tablename__ = "driver_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Subscription Details
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    
    # Subscription Status
    status = Column(String(50), default="active", nullable=False)  # active, cancelled, suspended, expired
    
    # Billing Information
    current_billing_cycle = Column(Enum(BillingCycle), nullable=False)
    current_price = Column(Float, nullable=False)  # Price for current billing cycle
    
    # Subscription Period
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)  # null for ongoing subscriptions
    next_billing_date = Column(DateTime, nullable=False)
    
    # Cancellation Information
    cancelled_at = Column(DateTime, nullable=True)
    cancellation_reason = Column(String(255), nullable=True)
    refund_amount = Column(Float, default=0.0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    driver = relationship("Driver", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="driver_subscriptions")
    payments = relationship("SubscriptionPayment", back_populates="subscription", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<DriverSubscription(id={self.id}, driver_id={self.driver_id}, plan_id={self.plan_id})>"

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

class SubscriptionUsage(Base):
    """Model for tracking subscription usage"""
    __tablename__ = "subscription_usage"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Usage Details
    subscription_id = Column(Integer, ForeignKey("driver_subscriptions.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("parking_sessions.id"), nullable=True)  # Link to parking session
    
    # Usage Metrics
    parking_hours = Column(Float, nullable=False)
    parking_cost = Column(Float, nullable=False)  # Cost without subscription
    subscription_discount = Column(Float, default=0.0, nullable=False)  # Discount applied
    final_cost = Column(Float, nullable=False)  # Cost after subscription
    
    # Usage Period
    usage_date = Column(DateTime, nullable=False)
    billing_period_start = Column(DateTime, nullable=False)
    billing_period_end = Column(DateTime, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    subscription = relationship("DriverSubscription")
    parking_session = relationship("ParkingSession")
    
    def __repr__(self):
        return f"<SubscriptionUsage(id={self.id}, subscription_id={self.subscription_id}, hours={self.parking_hours})>"