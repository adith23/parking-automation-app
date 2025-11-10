"""Pydantic schemas for analytics data."""

from typing import List, Optional
from pydantic import BaseModel


class ChartDataPoint(BaseModel):
    """Single data point for chart visualization."""
    label: str
    value: str  # Percentage as string (e.g., "30%")
    amount: float  # Actual revenue amount
    color: str  # Color code for the bar


class BookingRevenueData(BaseModel):
    """Booking revenue data for a specific period."""
    period: str  # "weekly", "monthly", or "annual"
    data: List[ChartDataPoint]


class SubscriptionRevenueData(BaseModel):
    """Subscription revenue data for a specific period."""
    period: str  # "weekly", "monthly", or "annual"
    data: List[ChartDataPoint]


class AnalyticsSummary(BaseModel):
    """Summary of analytics data."""
    estimated_earnings: float
    booking_count: int
    subscription_count: int


class AnalyticsResponse(BaseModel):
    """Complete analytics response."""
    summary: AnalyticsSummary
    booking_revenue: BookingRevenueData
    subscription_revenue: SubscriptionRevenueData

