from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from decimal import Decimal

from app.models.owner_models.subscription_model import (
    SubscriptionPlan,
    DriverSubscription,
    SubscriptionUsage,
    BillingCycle,
    PlanStatus,
    PlanType,
)
from app.models.owner_models.owner_model import ParkingLotOwner
from app.models.owner_models import parking_lot_model as parking_model
from app.schemas.owner_schemas.subscription_schema import (
    SubscriptionPlanCreate,
    SubscriptionPlanUpdate,
    PlanStatisticsResponse,
)

class SubscriptionService:
    def __init__(self):
        pass

    def validate_plan_data(self, plan_data: dict) -> None:
        """Validate subscription plan data according to business rules"""
        # Validate pricing
        if plan_data.get("monthly_price", 0) <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Monthly price must be greater than 0",
            )

        # Validate annual pricing if provided
        if "annual_price" in plan_data and plan_data["annual_price"]:
            if plan_data["annual_price"] <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Annual price must be greater than 0",
                )
            # Annual price should be less than monthly * 12 (discount)
            if plan_data["annual_price"] >= plan_data["monthly_price"] * 12:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Annual price should be less than monthly price × 12",
                )

        # Validate billing interval
        if (
            plan_data.get("billing_interval", 1) < 1
            or plan_data.get("billing_interval", 1) > 12
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Billing interval must be between 1 and 12",
            )

        # Validate max vehicles
        if (
            plan_data.get("max_vehicles", 1) < 1
            or plan_data.get("max_vehicles", 1) > 10
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum vehicles must be between 1 and 10",
            )

    def create_subscription_plan(
        self, owner_id: int, plan_data: dict, db: Session
    ) -> SubscriptionPlan:
        """Create a new subscription plan for an owner"""
        # Validate business rules
        self.validate_plan_data(plan_data)

        # Check if owner exists and has permission
        owner = db.query(ParkingLotOwner).filter(ParkingLotOwner.id == owner_id).first()
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found"
            )

        # Extract lot_ids (new way) or lot_id (old way for backward compatibility)
        lot_ids = plan_data.pop("lot_ids", None)
        lot_id = plan_data.get("lot_id")

        # Handle backward compatibility: if lot_id is provided but lot_ids is not, convert it
        if lot_id and not lot_ids:
            lot_ids = [lot_id]
            plan_data.pop("lot_id")  # Remove lot_id since we'll use lot_ids

        # Validate that all lot_ids belong to the owner
        if lot_ids:
            lots = (
                db.query(parking_model.ParkingLot)
                .filter(
                    and_(
                        parking_model.ParkingLot.id.in_(lot_ids),
                        parking_model.ParkingLot.owner_id == owner_id,
                    )
                )
                .all()
            )

            if len(lots) != len(lot_ids):
                found_ids = {lot.id for lot in lots}
                missing_ids = set(lot_ids) - found_ids
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Not authorized to create plan for parking lot(s): {missing_ids}",
                )

        # Explicitly convert enums to their string values before creating the model
        if "plan_type" in plan_data and isinstance(plan_data["plan_type"], PlanType):
            plan_data["plan_type"] = plan_data["plan_type"].value
        if "billing_cycle" in plan_data and isinstance(
            plan_data["billing_cycle"], BillingCycle
        ):
            plan_data["billing_cycle"] = plan_data["billing_cycle"].value

        # Create the subscription plan (without lot_ids, as it's not a column)
        db_plan = SubscriptionPlan(
            **plan_data,
            owner_id=owner_id,
            status=PlanStatus.DRAFT,  # Start as draft
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        db.add(db_plan)
        db.flush()  # Flush to get the plan ID

        # Associate lots with the plan if lot_ids were provided
        if lot_ids:
            lots = (
                db.query(parking_model.ParkingLot)
                .filter(parking_model.ParkingLot.id.in_(lot_ids))
                .all()
            )
            db_plan.applicable_lots = lots

        db.commit()
        db.refresh(db_plan)

        return db_plan

    def get_owner_subscription_plans(
        self,
        owner_id: int,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        status: Optional[PlanStatus] = None,
        lot_id: Optional[int] = None,
    ) -> List[SubscriptionPlan]:
        """Get all subscription plans for an owner with optional filtering"""
        query = (
            db.query(SubscriptionPlan)
            .options(joinedload(SubscriptionPlan.applicable_lots))
            .filter(
                and_(
                    SubscriptionPlan.owner_id == owner_id,
                    SubscriptionPlan.is_deleted == False,
                )
            )
        )

        if status:
            query = query.filter(SubscriptionPlan.status == status)

        if lot_id:
            query = query.filter(SubscriptionPlan.lot_id == lot_id)

        plans = query.offset(skip).limit(limit).all()
        return plans

    def get_subscription_plan(
        self, plan_id: int, owner_id: int, db: Session
    ) -> SubscriptionPlan:
        """Get a specific subscription plan with owner authorization"""
        plan = (
            db.query(SubscriptionPlan)
            .options(joinedload(SubscriptionPlan.applicable_lots))
            .filter(
                and_(
                    SubscriptionPlan.id == plan_id, SubscriptionPlan.is_deleted == False
                )
            )
            .first()
        )

        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription plan not found",
            )

        if plan.owner_id != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this subscription plan",
            )

        return plan

    def update_subscription_plan(
        self, plan_id: int, owner_id: int, updates: dict, db: Session
    ) -> SubscriptionPlan:
        """Update a subscription plan with owner authorization"""
        # Get existing plan with authorization check
        db_plan = self.get_subscription_plan(plan_id, owner_id, db)

        # Extract lot_ids if provided
        lot_ids = updates.pop("lot_ids", None)
        lot_id = updates.get("lot_id")

        # Handle backward compatibility: if lot_id is provided but lot_ids is not, convert it
        if lot_id is not None and lot_ids is None:
            lot_ids = [lot_id] if lot_id else []
            updates.pop("lot_id")

        # Validate updates if they contain pricing information
        if any(
            key in updates
            for key in [
                "monthly_price",
                "annual_price",
            ]
        ):
            # Create a copy for validation
            validation_data = {**db_plan.__dict__}
            validation_data.update(updates)
            self.validate_plan_data(validation_data)

        # Validate lot_ids if provided
        if lot_ids is not None:
            if lot_ids:  # If not empty list
                lots = (
                    db.query(parking_model.ParkingLot)
                    .filter(
                        and_(
                            parking_model.ParkingLot.id.in_(lot_ids),
                            parking_model.ParkingLot.owner_id == owner_id,
                        )
                    )
                    .all()
                )

                if len(lots) != len(lot_ids):
                    found_ids = {lot.id for lot in lots}
                    missing_ids = set(lot_ids) - found_ids
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Not authorized to update plan for parking lot(s): {missing_ids}",
                    )
                db_plan.applicable_lots = lots
            else:
                # Empty list means general plan (no specific lots)
                db_plan.applicable_lots = []

        # Apply updates
        update_data = {k: v for k, v in updates.items() if v is not None}
        for key, value in update_data.items():
            setattr(db_plan, key, value)

        db_plan.updated_at = datetime.utcnow()

        db.add(db_plan)
        db.commit()
        db.refresh(db_plan)

        return db_plan

    def delete_subscription_plan(
        self, plan_id: int, owner_id: int, db: Session
    ) -> None:
        """Soft delete a subscription plan"""
        db_plan = self.get_subscription_plan(plan_id, owner_id, db)

        # Check if plan has active subscriptions
        active_subscriptions = (
            db.query(DriverSubscription)
            .filter(
                and_(
                    DriverSubscription.plan_id == plan_id,
                    DriverSubscription.status == "active",
                )
            )
            .count()
        )

        if active_subscriptions > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete plan with {active_subscriptions} active subscriptions",
            )

        # Soft delete
        db_plan.is_deleted = True
        db_plan.deleted_at = datetime.utcnow()
        db_plan.status = PlanStatus.ARCHIVED

        db.add(db_plan)
        db.commit()

    def activate_subscription_plan(
        self, plan_id: int, owner_id: int, db: Session
    ) -> SubscriptionPlan:
        """Activate a subscription plan"""
        db_plan = self.get_subscription_plan(plan_id, owner_id, db)

        if db_plan.status == PlanStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Plan is already active"
            )

        db_plan.status = PlanStatus.ACTIVE
        db_plan.updated_at = datetime.utcnow()

        db.add(db_plan)
        db.commit()
        db.refresh(db_plan)

        return db_plan

    def deactivate_subscription_plan(
        self, plan_id: int, owner_id: int, db: Session
    ) -> SubscriptionPlan:
        """Deactivate a subscription plan"""
        db_plan = self.get_subscription_plan(plan_id, owner_id, db)

        if db_plan.status != PlanStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Plan is not active"
            )

        db_plan.status = PlanStatus.INACTIVE
        db_plan.updated_at = datetime.utcnow()

        db.add(db_plan)
        db.commit()
        db.refresh(db_plan)

        return db_plan

    def get_plan_statistics(
        self, plan_id: int, owner_id: int, db: Session
    ) -> PlanStatisticsResponse:
        """Get comprehensive statistics for a subscription plan"""
        # Verify plan ownership
        plan = self.get_subscription_plan(plan_id, owner_id, db)

        # Get subscription counts
        total_subscribers = (
            db.query(DriverSubscription)
            .filter(DriverSubscription.plan_id == plan_id)
            .count()
        )

        active_subscribers = (
            db.query(DriverSubscription)
            .filter(
                and_(
                    DriverSubscription.plan_id == plan_id,
                    DriverSubscription.status == "active",
                )
            )
            .count()
        )

        # Calculate revenue (this would integrate with your payment system)
        monthly_revenue = 0.0  # TODO: Calculate from actual payments
        total_revenue = 0.0  # TODO: Calculate from actual payments

        # Calculate conversion rate (placeholder)
        conversion_rate = 0.0  # TODO: Calculate from visitor data

        # Calculate churn rate (placeholder)
        churn_rate = 0.0  # TODO: Calculate from subscription data

        # Calculate average subscription duration
        avg_duration = 0  # TODO: Calculate from subscription data

        return PlanStatisticsResponse(
            plan_id=plan.id,
            plan_name=plan.name,
            total_subscribers=total_subscribers,
            active_subscribers=active_subscribers,
            monthly_revenue=monthly_revenue,
            total_revenue=total_revenue,
            conversion_rate=conversion_rate,
            churn_rate=churn_rate,
            average_subscription_duration=avg_duration,
        )

    def get_owner_subscription_dashboard(
        self, owner_id: int, db: Session
    ) -> Dict[str, Any]:
        """Get comprehensive subscription dashboard for an owner"""
        # Get plan counts
        total_plans = (
            db.query(SubscriptionPlan)
            .filter(
                and_(
                    SubscriptionPlan.owner_id == owner_id,
                    SubscriptionPlan.is_deleted == False,
                )
            )
            .count()
        )

        active_plans = (
            db.query(SubscriptionPlan)
            .filter(
                and_(
                    SubscriptionPlan.owner_id == owner_id,
                    SubscriptionPlan.status == PlanStatus.ACTIVE,
                    SubscriptionPlan.is_deleted == False,
                )
            )
            .count()
        )

        # Get subscriber counts
        total_subscribers = (
            db.query(DriverSubscription)
            .join(SubscriptionPlan)
            .filter(
                and_(
                    SubscriptionPlan.owner_id == owner_id,
                    SubscriptionPlan.is_deleted == False,
                )
            )
            .count()
        )

        # Calculate revenue (placeholders for now)
        monthly_revenue = 0.0  # TODO: Calculate from actual payments
        annual_revenue = 0.0  # TODO: Calculate from actual payments

        # Get top performing plans
        top_plans = (
            db.query(
                SubscriptionPlan.id,
                SubscriptionPlan.name,
                func.count(DriverSubscription.id).label("subscriber_count"),
            )
            .outerjoin(DriverSubscription)
            .filter(
                and_(
                    SubscriptionPlan.owner_id == owner_id,
                    SubscriptionPlan.is_deleted == False,
                )
            )
            .group_by(SubscriptionPlan.id)
            .order_by(desc("subscriber_count"))
            .limit(5)
            .all()
        )

        top_performing_plans = [
            PlanStatisticsResponse(
                plan_id=plan.id,
                plan_name=plan.name,
                total_subscribers=plan.subscriber_count,
                active_subscribers=0,  # TODO: Calculate active
                monthly_revenue=0.0,  # TODO: Calculate revenue
                total_revenue=0.0,  # TODO: Calculate revenue
                conversion_rate=0.0,  # TODO: Calculate conversion
                churn_rate=0.0,  # TODO: Calculate churn
                average_subscription_duration=0,  # TODO: Calculate duration
            )
            for plan in top_plans
        ]

        # Get recent subscriptions (placeholder)
        recent_subscriptions = []  # TODO: Implement recent subscriptions query

        # Get revenue trend (placeholder)
        revenue_trend = []  # TODO: Implement revenue trend calculation

        return {
            "total_plans": total_plans,
            "active_plans": active_plans,
            "total_subscribers": total_subscribers,
            "monthly_revenue": monthly_revenue,
            "annual_revenue": annual_revenue,
            "top_performing_plans": top_performing_plans,
            "recent_subscriptions": recent_subscriptions,
            "revenue_trend": revenue_trend,
        }

    def search_available_plans(
        self,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        radius_m: float = 5000,
        plan_type: Optional[PlanType] = None,
        max_price: Optional[float] = None,
        db: Session = None,
    ) -> List[Dict[str, Any]]:
        """Search for available subscription plans"""
        query = db.query(SubscriptionPlan).filter(
            and_(
                SubscriptionPlan.status == PlanStatus.ACTIVE,
                SubscriptionPlan.is_deleted == False,
            )
        )

        if plan_type:
            query = query.filter(SubscriptionPlan.plan_type == plan_type)

        if max_price:
            query = query.filter(SubscriptionPlan.monthly_price <= max_price)

        plans = query.all()

        # TODO: Implement geospatial search when you add PostGIS
        # For now, return all plans with basic information

        result = []
        for plan in plans:
            plan_data = {
                "id": plan.id,
                "name": plan.name,
                "description": plan.description,
                "plan_type": plan.plan_type.value,
                "monthly_price": plan.monthly_price,
                "annual_price": plan.annual_price,
                "billing_cycle": plan.billing_cycle.value,
                "billing_interval": plan.billing_interval,
                "max_vehicles": plan.max_vehicles,
                "reserved_slots": plan.reserved_slots,
                "features": plan.features,
                "is_featured": plan.is_featured,
                "lot_name": None,
                "lot_address": None,
                "distance": None,
                "popularity_score": 0.0,
            }

            # Add lot information if lot-specific
            if plan.lot_id:
                lot = (
                    db.query(parking_model.ParkingLot)
                    .filter(parking_model.ParkingLot.id == plan.lot_id)
                    .first()
                )
                if lot:
                    plan_data["lot_name"] = lot.name
                    plan_data["lot_address"] = lot.address

                    # TODO: Calculate distance when PostGIS is implemented
                    if lat and lon:
                        plan_data["distance"] = 0.0  # Placeholder

            # Calculate popularity score (placeholder)
            subscriber_count = (
                db.query(DriverSubscription)
                .filter(DriverSubscription.plan_id == plan.id)
                .count()
            )
            plan_data["popularity_score"] = min(
                subscriber_count / 10.0, 1.0
            )  # Normalize to 0-1

            result.append(plan_data)

        return result


# Create singleton instance
subscription_service = SubscriptionService()
