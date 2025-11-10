"""Service for calculating analytics and revenue data for parking lot owners."""

from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract
from datetime import datetime, timedelta, time
from decimal import Decimal

from app.models.owner_models.owner_model import ParkingLotOwner
from app.models.owner_models.parking_lot_model import ParkingLot
from app.models.driver_models.booking_model import Booking, BookingStatus
from app.models.driver_models.parking_session_model import (
    ParkingSession,
    ParkingSessionStatus,
)
from app.models.owner_models.subscription_model import (
    DriverSubscription,
    SubscriptionPlan,
    BillingCycle,
)


class AnalyticsService:
    def __init__(self):
        pass

    def get_owner_parking_lot_ids(self, owner_id: int, db: Session) -> List[int]:
        """Get all parking lot IDs owned by the owner."""
        parking_lots = (
            db.query(ParkingLot.id).filter(ParkingLot.owner_id == owner_id).all()
        )
        return [lot.id for lot in parking_lots]

    def calculate_booking_revenue(
        self,
        owner_id: int,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> float:
        """Calculate total booking revenue from completed parking sessions."""
        parking_lot_ids = self.get_owner_parking_lot_ids(owner_id, db)

        if not parking_lot_ids:
            return 0.0

        query = db.query(func.sum(ParkingSession.parking_cost)).filter(
            and_(
                ParkingSession.parking_lot_id.in_(parking_lot_ids),
                ParkingSession.status == ParkingSessionStatus.COMPLETED,
                ParkingSession.parking_cost.isnot(None),
            )
        )

        if start_date:
            query = query.filter(ParkingSession.end_time >= start_date)
        if end_date:
            query = query.filter(ParkingSession.end_time <= end_date)

        result = query.scalar()
        return float(result) if result else 0.0

    def calculate_subscription_revenue(
        self,
        owner_id: int,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> float:
        """Calculate total subscription revenue from active subscriptions."""
        # Get all subscription plans owned by the owner
        plans = (
            db.query(SubscriptionPlan.id)
            .filter(SubscriptionPlan.owner_id == owner_id)
            .all()
        )
        plan_ids = [plan.id for plan in plans]

        if not plan_ids:
            return 0.0

        # Get active subscriptions
        query = db.query(DriverSubscription).filter(
            and_(
                DriverSubscription.plan_id.in_(plan_ids),
                DriverSubscription.status == "active",
            )
        )

        if start_date:
            query = query.filter(DriverSubscription.start_date >= start_date)
        if end_date:
            query = query.filter(
                or_(
                    DriverSubscription.start_date <= end_date,
                    DriverSubscription.end_date.is_(None),
                    DriverSubscription.end_date <= end_date,
                )
            )

        subscriptions = query.all()

        total_revenue = 0.0
        for subscription in subscriptions:
            # Calculate revenue based on billing cycles within the date range
            billing_cycle = (
                subscription.current_billing_cycle.value
                if hasattr(subscription.current_billing_cycle, "value")
                else str(subscription.current_billing_cycle)
            )
            if billing_cycle == "monthly":
                # Calculate months covered
                sub_start = subscription.start_date
                sub_end = (
                    subscription.end_date
                    if subscription.end_date
                    else datetime.utcnow()
                )

                if start_date:
                    sub_start = max(sub_start, start_date)
                if end_date:
                    sub_end = min(sub_end, end_date)

                if sub_start < sub_end:
                    months = (sub_end.year - sub_start.year) * 12 + (
                        sub_end.month - sub_start.month
                    )
                    if sub_end.day >= sub_start.day:
                        months += 1
                    total_revenue += subscription.current_price * max(1, months)
            else:  # annual
                # For annual, count full years only
                sub_start = subscription.start_date
                sub_end = (
                    subscription.end_date
                    if subscription.end_date
                    else datetime.utcnow()
                )

                if start_date:
                    sub_start = max(sub_start, start_date)
                if end_date:
                    sub_end = min(sub_end, end_date)

                if sub_start < sub_end:
                    years = sub_end.year - sub_start.year
                    if (sub_end.month, sub_end.day) >= (sub_start.month, sub_start.day):
                        years += 1
                    total_revenue += subscription.current_price * max(1, years)

        return total_revenue

    def get_booking_count(
        self,
        owner_id: int,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> int:
        """Get total count of completed bookings."""
        parking_lot_ids = self.get_owner_parking_lot_ids(owner_id, db)

        if not parking_lot_ids:
            return 0

        query = db.query(func.count(ParkingSession.id)).filter(
            and_(
                ParkingSession.parking_lot_id.in_(parking_lot_ids),
                ParkingSession.status == ParkingSessionStatus.COMPLETED,
            )
        )

        if start_date:
            query = query.filter(ParkingSession.end_time >= start_date)
        if end_date:
            query = query.filter(ParkingSession.end_time <= end_date)

        return query.scalar() or 0

    def get_subscription_count(
        self,
        owner_id: int,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> int:
        """Get total count of active subscriptions."""
        plans = (
            db.query(SubscriptionPlan.id)
            .filter(SubscriptionPlan.owner_id == owner_id)
            .all()
        )
        plan_ids = [plan.id for plan in plans]

        if not plan_ids:
            return 0

        query = db.query(func.count(DriverSubscription.id)).filter(
            and_(
                DriverSubscription.plan_id.in_(plan_ids),
                DriverSubscription.status == "active",
            )
        )

        if start_date:
            query = query.filter(DriverSubscription.start_date >= start_date)
        if end_date:
            query = query.filter(
                or_(
                    DriverSubscription.end_date.is_(None),
                    DriverSubscription.end_date >= end_date,
                )
            )

        return query.scalar() or 0

    def get_summary(self, owner_id: int, db: Session, period: str) -> Dict[str, Any]:
        """Calculate summary analytics for a given period."""
        if period == "today":
            today = datetime.utcnow().date()
            start_date = datetime.combine(today, time.min)
            end_date = datetime.combine(today, time.max)
        else:  # all-time
            start_date = None
            end_date = None

        booking_revenue = self.calculate_booking_revenue(
            owner_id, db, start_date=start_date, end_date=end_date
        )

        subscription_revenue = self.calculate_subscription_revenue(
            owner_id, db, start_date=start_date, end_date=end_date
        )

        estimated_earnings = booking_revenue + subscription_revenue

        booking_count = self.get_booking_count(
            owner_id, db, start_date=start_date, end_date=end_date
        )

        subscription_count = self.get_subscription_count(
            owner_id, db, start_date=start_date, end_date=end_date
        )

        return {
            "estimated_earnings": estimated_earnings,
            "booking_count": booking_count,
            "subscription_count": subscription_count,
        }

    def get_weekly_booking_revenue(
        self, owner_id: int, db: Session
    ) -> List[Dict[str, Any]]:
        """Get booking revenue grouped by day of week for the current week."""
        parking_lot_ids = self.get_owner_parking_lot_ids(owner_id, db)

        if not parking_lot_ids:
            return self._get_empty_weekly_data()

        # Get start of current week (Monday)
        today = datetime.utcnow()
        days_since_monday = today.weekday()
        week_start = today - timedelta(days=days_since_monday)
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

        # Get revenue for each day of the week
        revenue_data = []
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

        for i, day_name in enumerate(days):
            day_start = week_start + timedelta(days=i)
            day_end = day_start + timedelta(days=1)

            revenue = (
                db.query(func.sum(ParkingSession.parking_cost))
                .filter(
                    and_(
                        ParkingSession.parking_lot_id.in_(parking_lot_ids),
                        ParkingSession.status == ParkingSessionStatus.COMPLETED,
                        ParkingSession.end_time >= day_start,
                        ParkingSession.end_time < day_end,
                        ParkingSession.parking_cost.isnot(None),
                    )
                )
                .scalar()
            )

            revenue_data.append(
                {"label": day_name, "value": float(revenue) if revenue else 0.0}
            )

        return self._format_chart_data(revenue_data)

    def get_monthly_booking_revenue(
        self, owner_id: int, db: Session
    ) -> List[Dict[str, Any]]:
        """Get booking revenue grouped by month for the last 7 months."""
        parking_lot_ids = self.get_owner_parking_lot_ids(owner_id, db)

        if not parking_lot_ids:
            return self._get_empty_monthly_data(7)

        # Get revenue for last 7 months
        revenue_data = []
        today = datetime.utcnow()
        month_names = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ]

        for i in range(6, -1, -1):  # Last 7 months
            month_start = (today.replace(day=1) - timedelta(days=32 * i)).replace(day=1)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)

            revenue = (
                db.query(func.sum(ParkingSession.parking_cost))
                .filter(
                    and_(
                        ParkingSession.parking_lot_id.in_(parking_lot_ids),
                        ParkingSession.status == ParkingSessionStatus.COMPLETED,
                        ParkingSession.end_time >= month_start,
                        ParkingSession.end_time < month_end,
                        ParkingSession.parking_cost.isnot(None),
                    )
                )
                .scalar()
            )

            revenue_data.append(
                {
                    "label": month_names[month_start.month - 1],
                    "value": float(revenue) if revenue else 0.0,
                }
            )

        return self._format_chart_data(revenue_data)

    def get_annual_booking_revenue(
        self, owner_id: int, db: Session
    ) -> List[Dict[str, Any]]:
        """Get booking revenue grouped by year for the last 7 years."""
        parking_lot_ids = self.get_owner_parking_lot_ids(owner_id, db)

        if not parking_lot_ids:
            return self._get_empty_annual_data(7)

        # Get revenue for last 7 years
        revenue_data = []
        today = datetime.utcnow()
        current_year = today.year

        for i in range(6, -1, -1):  # Last 7 years
            year = current_year - i
            year_start = datetime(year, 1, 1)
            year_end = datetime(year + 1, 1, 1)

            revenue = (
                db.query(func.sum(ParkingSession.parking_cost))
                .filter(
                    and_(
                        ParkingSession.parking_lot_id.in_(parking_lot_ids),
                        ParkingSession.status == ParkingSessionStatus.COMPLETED,
                        ParkingSession.end_time >= year_start,
                        ParkingSession.end_time < year_end,
                        ParkingSession.parking_cost.isnot(None),
                    )
                )
                .scalar()
            )

            revenue_data.append(
                {"label": str(year), "value": float(revenue) if revenue else 0.0}
            )

        return self._format_chart_data(revenue_data)

    def get_weekly_subscription_revenue(
        self, owner_id: int, db: Session
    ) -> List[Dict[str, Any]]:
        """Get subscription revenue for the current week."""
        # For weekly, we calculate based on active subscriptions
        # This is a simplified calculation - in production, you'd track actual payments
        plans = (
            db.query(SubscriptionPlan.id)
            .filter(SubscriptionPlan.owner_id == owner_id)
            .all()
        )
        plan_ids = [plan.id for plan in plans]

        if not plan_ids:
            return self._get_empty_weekly_data()

        # Get active subscriptions
        subscriptions = (
            db.query(DriverSubscription)
            .filter(
                and_(
                    DriverSubscription.plan_id.in_(plan_ids),
                    DriverSubscription.status == "active",
                )
            )
            .all()
        )

        # Calculate weekly revenue (monthly price / 4.33, annual price / 52)
        weekly_revenue = 0.0
        for sub in subscriptions:
            billing_cycle = (
                sub.current_billing_cycle.value
                if hasattr(sub.current_billing_cycle, "value")
                else str(sub.current_billing_cycle)
            )
            if billing_cycle == "monthly":
                weekly_revenue += sub.current_price / 4.33
            else:  # annual
                weekly_revenue += sub.current_price / 52

        # Distribute evenly across days (simplified)
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        daily_revenue = weekly_revenue / 7

        revenue_data = [{"label": day, "value": daily_revenue} for day in days]

        return self._format_chart_data(revenue_data)

    def get_monthly_subscription_revenue(
        self, owner_id: int, db: Session
    ) -> List[Dict[str, Any]]:
        """Get subscription revenue grouped by month for the last 7 months."""
        plans = (
            db.query(SubscriptionPlan.id)
            .filter(SubscriptionPlan.owner_id == owner_id)
            .all()
        )
        plan_ids = [plan.id for plan in plans]

        if not plan_ids:
            return self._get_empty_monthly_data(7)

        # Get active subscriptions
        subscriptions = (
            db.query(DriverSubscription)
            .filter(
                and_(
                    DriverSubscription.plan_id.in_(plan_ids),
                    DriverSubscription.status == "active",
                )
            )
            .all()
        )

        # Calculate monthly revenue
        today = datetime.utcnow()
        month_names = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ]
        revenue_data = []

        for i in range(6, -1, -1):
            month_start = (today.replace(day=1) - timedelta(days=32 * i)).replace(day=1)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)

            month_revenue = 0.0
            for sub in subscriptions:
                # Check if subscription was active during this month
                sub_start = sub.start_date
                sub_end = sub.end_date if sub.end_date else datetime.utcnow()

                if sub_start < month_end and sub_end > month_start:
                    billing_cycle = (
                        sub.current_billing_cycle.value
                        if hasattr(sub.current_billing_cycle, "value")
                        else str(sub.current_billing_cycle)
                    )
                    if billing_cycle == "monthly":
                        month_revenue += sub.current_price
                    else:  # annual
                        month_revenue += sub.current_price / 12

            revenue_data.append(
                {"label": month_names[month_start.month - 1], "value": month_revenue}
            )

        return self._format_chart_data(revenue_data)

    def get_annual_subscription_revenue(
        self, owner_id: int, db: Session
    ) -> List[Dict[str, Any]]:
        """Get subscription revenue grouped by year for the last 7 years."""
        plans = (
            db.query(SubscriptionPlan.id)
            .filter(SubscriptionPlan.owner_id == owner_id)
            .all()
        )
        plan_ids = [plan.id for plan in plans]

        if not plan_ids:
            return self._get_empty_annual_data(7)

        # Get active subscriptions
        subscriptions = (
            db.query(DriverSubscription)
            .filter(
                and_(
                    DriverSubscription.plan_id.in_(plan_ids),
                    DriverSubscription.status == "active",
                )
            )
            .all()
        )

        # Calculate annual revenue
        today = datetime.utcnow()
        current_year = today.year
        revenue_data = []

        for i in range(6, -1, -1):
            year = current_year - i
            year_start = datetime(year, 1, 1)
            year_end = datetime(year + 1, 1, 1)

            year_revenue = 0.0
            for sub in subscriptions:
                # Check if subscription was active during this year
                sub_start = sub.start_date
                sub_end = sub.end_date if sub.end_date else datetime.utcnow()

                if sub_start < year_end and sub_end > year_start:
                    billing_cycle = (
                        sub.current_billing_cycle.value
                        if hasattr(sub.current_billing_cycle, "value")
                        else str(sub.current_billing_cycle)
                    )
                    if billing_cycle == "monthly":
                        # Calculate months active in this year
                        active_start = max(sub_start, year_start)
                        active_end = min(sub_end, year_end)
                        months = (active_end.year - active_start.year) * 12 + (
                            active_end.month - active_start.month
                        )
                        if active_end.day >= active_start.day:
                            months += 1
                        year_revenue += sub.current_price * max(1, months)
                    else:  # annual
                        year_revenue += sub.current_price

            revenue_data.append({"label": str(year), "value": year_revenue})

        return self._format_chart_data(revenue_data)

    def _format_chart_data(
        self, revenue_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Format revenue data for chart display with percentage heights."""
        if not revenue_data:
            return []

        max_value = max(item["value"] for item in revenue_data) if revenue_data else 1

        formatted_data = []
        for item in revenue_data:
            # Calculate percentage height (0-100%)
            percentage = (item["value"] / max_value * 100) if max_value > 0 else 0
            formatted_data.append(
                {
                    "label": item["label"],
                    "value": f"{percentage:.0f}%",
                    "amount": item["value"],
                    "color": "#333" if item["value"] > 0 else "#FFD700",
                }
            )

        return formatted_data

    def _get_empty_weekly_data(self) -> List[Dict[str, Any]]:
        """Get empty weekly data structure."""
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        return [
            {"label": day, "value": "0%", "amount": 0.0, "color": "#FFD700"}
            for day in days
        ]

    def _get_empty_monthly_data(self, count: int) -> List[Dict[str, Any]]:
        """Get empty monthly data structure."""
        month_names = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ]
        today = datetime.utcnow()
        data = []

        for i in range(count - 1, -1, -1):
            month_start = (today.replace(day=1) - timedelta(days=32 * i)).replace(day=1)
            data.append(
                {
                    "label": month_names[month_start.month - 1],
                    "value": "0%",
                    "amount": 0.0,
                    "color": "#FFD700",
                }
            )

        return data

    def _get_empty_annual_data(self, count: int) -> List[Dict[str, Any]]:
        """Get empty annual data structure."""
        today = datetime.utcnow()
        current_year = today.year
        data = []

        for i in range(count - 1, -1, -1):
            year = current_year - i
            data.append(
                {"label": str(year), "value": "0%", "amount": 0.0, "color": "#FFD700"}
            )

        return data


# Singleton instance
analytics_service = AnalyticsService()
