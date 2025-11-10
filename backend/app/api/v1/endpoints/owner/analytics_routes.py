"""API routes for analytics and revenue insights."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.deps import get_current_owner, get_db
from app.models.owner_models.owner_model import ParkingLotOwner
from app.schemas.owner_schemas.analytics_schema import (
    AnalyticsResponse,
    AnalyticsSummary,
    BookingRevenueData,
    SubscriptionRevenueData,
    ChartDataPoint,
)
from app.services.analytics_service import analytics_service

router = APIRouter()


@router.get(
    "/analytics",
    response_model=AnalyticsResponse,
    summary="Get analytics and revenue insights",
)
def get_analytics(
    *,
    db: Session = Depends(get_db),
    current_owner: ParkingLotOwner = Depends(get_current_owner),
    booking_period: str = Query(
        "monthly", description="Period for booking revenue: weekly, monthly, or annual"
    ),
    subscription_period: str = Query(
        "monthly",
        description="Period for subscription revenue: weekly, monthly, or annual",
    ),
):
    """
    Get comprehensive analytics data for the owner's parking lots.

    Returns:
    - Summary: Total earnings, booking count, subscription count
    - Booking Revenue: Revenue data for the specified period
    - Subscription Revenue: Revenue data for the specified period
    """
    owner_id = current_owner.id

    # Validate periods
    valid_periods = ["weekly", "monthly", "annual"]
    if booking_period.lower() not in valid_periods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid booking_period: {booking_period}. Valid values: {', '.join(valid_periods)}",
        )
    if subscription_period.lower() not in valid_periods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid subscription_period: {subscription_period}. Valid values: {', '.join(valid_periods)}",
        )

    # Calculate summary
    booking_revenue = analytics_service.calculate_booking_revenue(owner_id, db)
    subscription_revenue = analytics_service.calculate_subscription_revenue(
        owner_id, db
    )
    estimated_earnings = booking_revenue + subscription_revenue

    booking_count = analytics_service.get_booking_count(owner_id, db)
    subscription_count = analytics_service.get_subscription_count(owner_id, db)

    summary = AnalyticsSummary(
        estimated_earnings=estimated_earnings,
        booking_count=booking_count,
        subscription_count=subscription_count,
    )

    # Get booking revenue data
    booking_period_lower = booking_period.lower()
    if booking_period_lower == "weekly":
        booking_data = analytics_service.get_weekly_booking_revenue(owner_id, db)
    elif booking_period_lower == "monthly":
        booking_data = analytics_service.get_monthly_booking_revenue(owner_id, db)
    else:  # annual
        booking_data = analytics_service.get_annual_booking_revenue(owner_id, db)

    booking_revenue_data = BookingRevenueData(
        period=booking_period_lower,
        data=[ChartDataPoint(**item) for item in booking_data],
    )

    # Get subscription revenue data
    subscription_period_lower = subscription_period.lower()
    if subscription_period_lower == "weekly":
        subscription_data = analytics_service.get_weekly_subscription_revenue(
            owner_id, db
        )
    elif subscription_period_lower == "monthly":
        subscription_data = analytics_service.get_monthly_subscription_revenue(
            owner_id, db
        )
    else:  # annual
        subscription_data = analytics_service.get_annual_subscription_revenue(
            owner_id, db
        )

    subscription_revenue_data = SubscriptionRevenueData(
        period=subscription_period_lower,
        data=[ChartDataPoint(**item) for item in subscription_data],
    )

    return AnalyticsResponse(
        summary=summary,
        booking_revenue=booking_revenue_data,
        subscription_revenue=subscription_revenue_data,
    )


@router.get(
    "/analytics/summary",
    response_model=AnalyticsSummary,
    summary="Get summary analytics for a specified period",
)
def get_analytics_summary(
    *,
    db: Session = Depends(get_db),
    current_owner: ParkingLotOwner = Depends(get_current_owner),
    period: str = Query(
        "today",
        description="Period for summary. Currently supports 'today' or 'all'",
    ),
):
    """
    Get a summary of analytics data for the owner for a specified period.
    - **today**: Calculates totals for the current day (bookings completed, subscriptions started).
    - **all**: Calculates all-time totals.
    """
    if period.lower() not in ["today", "all"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid period specified. Use 'today' or 'all'.",
        )

    summary_data = analytics_service.get_summary(
        owner_id=current_owner.id, db=db, period=period.lower()
    )
    return AnalyticsSummary(**summary_data)
