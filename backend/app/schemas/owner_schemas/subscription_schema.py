from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
from app.models.owner_models.subscription_model import (
    BillingCycle,
    PlanStatus,
    PlanType,
)

class BillingCycleEnum(str, Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"


class PlanStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
    DRAFT = "draft"


class PlanTypeEnum(str, Enum):
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class ParkingLotInfo(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# Base Plan Schema
class SubscriptionPlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Plan name")
    description: Optional[str] = Field(
        None, max_length=1000, description="Plan description"
    )
    plan_type: PlanType = Field(PlanType.BASIC, description="Type of plan")

    # Pricing
    monthly_price: float = Field(..., gt=0, description="Monthly price in USD")
    annual_price: Optional[float] = Field(
        None, gt=0, description="Annual price in USD (if different)"
    )

    # Billing Configuration
    billing_cycle: BillingCycleEnum = Field(
        BillingCycleEnum.MONTHLY, description="Default billing cycle"
    )
    billing_interval: int = Field(
        1, ge=1, le=12, description="Billing interval (every X months/weeks)"
    )

    # Features and Limits
    max_vehicles: int = Field(1, ge=1, le=10, description="Maximum vehicles allowed")
    reserved_slots: bool = Field(False, description="Access to reserved slots")

    # Additional Features
    features: Optional[Dict[str, Any]] = Field(
        None, description="Custom features as JSON"
    )

    # Plan Settings
    is_featured: bool = Field(False, description="Highlight plan in listings")
    max_subscribers: Optional[int] = Field(
        None, ge=1, description="Maximum subscribers (null = unlimited)"
    )

    # Geographic Scope
    lot_id: Optional[int] = Field(
        None, description="Specific parking lot ID (deprecated: use lot_ids instead)"
    )
    lot_ids: Optional[List[int]] = Field(
        None,
        description="List of parking lot IDs this plan applies to (empty/null = general plan for all lots)",
    )

    # Effective Dates
    effective_from: Optional[datetime] = Field(
        None, description="When plan becomes active"
    )
    effective_until: Optional[datetime] = Field(None, description="When plan expires")

    class Config:
        use_enum_values = True
        from_attributes = True


# Create Plan Schema
class SubscriptionPlanCreate(SubscriptionPlanBase):
    @validator("annual_price")
    def validate_pricing_consistency(cls, v, values):
        if v is not None:
            monthly = values.get("monthly_price")
            if monthly and v >= monthly * 12:
                raise ValueError("Annual price should be less than monthly price × 12")
        return v

    @validator("effective_until")
    def validate_effective_dates(cls, v, values):
        if v and values.get("effective_from"):
            if v <= values["effective_from"]:
                raise ValueError("Effective until must be after effective from")
        return v


# Update Plan Schema
class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    plan_type: Optional[PlanType] = None

    # Pricing updates
    monthly_price: Optional[float] = Field(None, gt=0)
    annual_price: Optional[float] = Field(None, gt=0)

    # Billing updates
    billing_cycle: Optional[BillingCycleEnum] = None
    billing_interval: Optional[int] = Field(None, ge=1, le=12)

    # Feature updates
    max_vehicles: Optional[int] = Field(None, ge=1, le=10)
    reserved_slots: Optional[bool] = None

    # Additional features
    features: Optional[Dict[str, Any]] = None

    # Plan settings
    is_featured: Optional[bool] = None
    max_subscribers: Optional[int] = Field(None, ge=1)

    # Status updates
    status: Optional[PlanStatus] = None

    # Geographic scope updates
    lot_id: Optional[int] = Field(None, description="Deprecated: use lot_ids instead")
    lot_ids: Optional[List[int]] = Field(
        None, description="List of parking lot IDs this plan applies to"
    )

    # Effective dates
    effective_from: Optional[datetime] = None
    effective_until: Optional[datetime] = None


# Response Schemas
class SubscriptionPlanResponse(SubscriptionPlanBase):
    id: int
    owner_id: int
    status: PlanStatus
    created_at: datetime
    updated_at: datetime
    effective_from: Optional[datetime]
    effective_until: Optional[datetime]
    lot_ids: Optional[List[int]] = Field(
        None, description="List of parking lot IDs this plan applies to"
    )

    # Computed fields
    total_subscribers: int = Field(0, description="Current number of subscribers")
    is_available: bool = Field(
        True, description="Whether plan is available for new subscriptions"
    )

    applicable_lots: Optional[List[ParkingLotInfo]] = Field(
        None, description="List of parking lots this plan applies to"
    )

    class Config:
        from_attributes = True


class SubscriptionPlanListResponse(BaseModel):
    plans: List[SubscriptionPlanResponse]
    total: int
    page: int
    size: int
    has_more: bool


# Plan Statistics Schema
class PlanStatisticsResponse(BaseModel):
    plan_id: int
    plan_name: str
    total_subscribers: int
    active_subscribers: int
    monthly_revenue: float
    total_revenue: float
    conversion_rate: float  # Percentage of visitors who subscribe
    churn_rate: float  # Monthly churn rate
    average_subscription_duration: int  # Days


# Owner Dashboard Schema
class OwnerSubscriptionDashboardResponse(BaseModel):
    total_plans: int
    active_plans: int
    total_subscribers: int
    monthly_revenue: float
    annual_revenue: float
    top_performing_plans: List[PlanStatisticsResponse]
    recent_subscriptions: List[Dict[str, Any]]
    revenue_trend: List[Dict[str, Any]]  # Monthly revenue data
