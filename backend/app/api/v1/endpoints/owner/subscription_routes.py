from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.schemas.owner_schemas.subscription_schema import (
    SubscriptionPlanCreate,
    SubscriptionPlanResponse,
    SubscriptionPlanUpdate,
    SubscriptionPlanListResponse,
    PlanStatisticsResponse,
    OwnerSubscriptionDashboardResponse,
)
from app.models.owner_models.owner_model import ParkingLotOwner
from app.core.deps import get_db, get_current_owner
from app.services.subscription_service import subscription_service
from app.models.owner_models.subscription_model import PlanStatus
from app.models.owner_models.subscription_model import (
    PlanStatus,
    DriverSubscription,
    PlanType,
)

router = APIRouter()


def build_plan_response(plan, total_subscribers: int = 0) -> SubscriptionPlanResponse:
    """Helper function to build SubscriptionPlanResponse with lot_ids"""
    # Get lot_ids from the many-to-many relationship
    lot_ids = [lot.id for lot in plan.applicable_lots] if plan.applicable_lots else None

    return SubscriptionPlanResponse(
        id=plan.id,
        owner_id=plan.owner_id,
        name=plan.name,
        description=plan.description,
        plan_type=plan.plan_type,
        monthly_price=plan.monthly_price,
        annual_price=plan.annual_price,
        billing_cycle=plan.billing_cycle,
        billing_interval=plan.billing_interval,
        max_vehicles=plan.max_vehicles,
        reserved_slots=plan.reserved_slots,
        features=plan.features,
        is_featured=plan.is_featured,
        max_subscribers=plan.max_subscribers,
        lot_id=plan.lot_id,  # Keep for backward compatibility
        lot_ids=lot_ids,
        applicable_lots=plan.applicable_lots,
        status=plan.status,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        effective_from=plan.effective_from,
        effective_until=plan.effective_until,
        total_subscribers=total_subscribers,
        is_available=plan.status == PlanStatus.ACTIVE,
    )


@router.post(
    "/",
    response_model=SubscriptionPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new subscription plan",
    description="Create a new subscription plan for parking services",
)
def create_subscription_plan(
    *,
    db: Session = Depends(get_db),
    plan_data: SubscriptionPlanCreate,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Create a new subscription plan owned by the current user.

    - **name**: Plan name (e.g., "Premium Monthly", "Basic Annual")
    - **description**: Detailed description of the plan
    - **plan_type**: BASIC
    - **monthly_price**: Base monthly price in USD
    - **annual_price**: Optional discounted annual price
    - **billing_cycle**: MONTHLY or ANNUAL
    - **features**: Custom features like priority booking, reserved slots
    """
    plan = subscription_service.create_subscription_plan(
        owner_id=current_owner.id, plan_data=plan_data.dict(), db=db
    )

    # Calculate total subscribers (0 for new plan)
    total_subscribers = 0

    return build_plan_response(plan, total_subscribers)


@router.get(
    "/",
    response_model=SubscriptionPlanListResponse,
    summary="List owner's subscription plans",
    description="Retrieve all subscription plans owned by the current user",
)
def get_owner_subscription_plans(
    *,
    db: Session = Depends(get_db),
    current_owner: ParkingLotOwner = Depends(get_current_owner),
    skip: int = Query(0, ge=0, description="Number of plans to skip"),
    limit: int = Query(
        100, ge=1, le=1000, description="Maximum number of plans to return"
    ),
    status: Optional[str] = Query(None, description="Filter by plan status"),
    lot_id: Optional[int] = Query(None, description="Filter by specific parking lot"),
):
    """
    Retrieve all subscription plans owned by the current user.

    - **skip**: Pagination offset
    - **limit**: Maximum number of plans to return
    - **status**: Filter by plan status (active, inactive, draft, archived)
    - **lot_id**: Filter by specific parking lot ID
    """
    # Convert status string to enum if provided
    plan_status = None
    if status:
        try:
            plan_status = PlanStatus(status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}. Must be one of: active, inactive, draft, archived",
            )

    plans = subscription_service.get_owner_subscription_plans(
        owner_id=current_owner.id,
        db=db,
        skip=skip,
        limit=limit,
        status=plan_status,
        lot_id=lot_id,
    )

    # Convert to response format
    plan_responses = []
    for plan in plans:
        # Calculate total subscribers
        total_subscribers = (
            db.query(DriverSubscription)
            .filter(DriverSubscription.plan_id == plan.id)
            .count()
        )

        plan_response = build_plan_response(plan, total_subscribers)
        plan_responses.append(plan_response)

    return SubscriptionPlanListResponse(
        plans=plan_responses,
        total=len(plan_responses),
        page=skip // limit + 1 if limit > 0 else 1,
        size=limit,
        has_more=len(plan_responses) == limit,
    )


@router.get(
    "/{plan_id}",
    response_model=SubscriptionPlanResponse,
    summary="Get a specific subscription plan",
    description="Retrieve details of a specific subscription plan",
)
def get_subscription_plan(
    *,
    db: Session = Depends(get_db),
    plan_id: int,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Retrieve a specific subscription plan by its ID.
    """
    plan = subscription_service.get_subscription_plan(plan_id, current_owner.id, db)

    # Calculate total subscribers
    total_subscribers = (
        db.query(DriverSubscription)
        .filter(DriverSubscription.plan_id == plan.id)
        .count()
    )

    return build_plan_response(plan, total_subscribers)


@router.put(
    "/{plan_id}",
    response_model=SubscriptionPlanResponse,
    summary="Update a subscription plan",
    description="Update an existing subscription plan's details",
)
def update_subscription_plan(
    *,
    db: Session = Depends(get_db),
    plan_id: int,
    plan_updates: SubscriptionPlanUpdate,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Update a subscription plan's details.

    Only the fields provided in the update request will be modified.
    """
    return subscription_service.update_subscription_plan(
        plan_id=plan_id,
        owner_id=current_owner.id,
        updates=plan_updates.dict(exclude_unset=True),
        db=db,
    )


@router.delete(
    "/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a subscription plan",
    description="Soft delete a subscription plan (archives instead of permanent deletion)",
)
def delete_subscription_plan(
    *,
    db: Session = Depends(get_db),
    plan_id: int,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Delete a subscription plan.

    This performs a soft delete - the plan is archived and hidden from listings
    but can be restored if needed. Plans with active subscriptions cannot be deleted.
    """
    subscription_service.delete_subscription_plan(plan_id, current_owner.id, db)


@router.post(
    "/{plan_id}/activate",
    response_model=SubscriptionPlanResponse,
    summary="Activate a subscription plan",
    description="Activate an inactive or draft subscription plan",
)
def activate_subscription_plan(
    *,
    db: Session = Depends(get_db),
    plan_id: int,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Activate a subscription plan to make it available for new subscriptions.
    """
    return subscription_service.activate_subscription_plan(
        plan_id, current_owner.id, db
    )


@router.post(
    "/{plan_id}/deactivate",
    response_model=SubscriptionPlanResponse,
    summary="Deactivate a subscription plan",
    description="Deactivate an active subscription plan",
)
def deactivate_subscription_plan(
    *,
    db: Session = Depends(get_db),
    plan_id: int,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Deactivate a subscription plan to stop new subscriptions.

    Existing subscribers will continue to be billed until they cancel.
    """
    return subscription_service.deactivate_subscription_plan(
        plan_id, current_owner.id, db
    )


@router.get(
    "/{plan_id}/statistics",
    response_model=PlanStatisticsResponse,
    summary="Get plan statistics",
    description="Get comprehensive statistics for a subscription plan",
)
def get_plan_statistics(
    *,
    db: Session = Depends(get_db),
    plan_id: int,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Get detailed statistics for a subscription plan including:

    - Total and active subscribers
    - Revenue metrics
    - Conversion and churn rates
    - Average subscription duration
    """
    return subscription_service.get_plan_statistics(plan_id, current_owner.id, db)


@router.get(
    "/{plan_id}/subscribers",
    summary="List plan subscribers",
    description="Get list of all subscribers for a specific plan",
)
def get_plan_subscribers(
    *,
    db: Session = Depends(get_db),
    plan_id: int,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
    skip: int = Query(0, ge=0, description="Number of subscribers to skip"),
    limit: int = Query(
        100, ge=1, le=1000, description="Maximum number of subscribers to return"
    ),
    status: Optional[str] = Query(None, description="Filter by subscription status"),
):
    """
    Get list of all subscribers for a specific subscription plan.

    - **skip**: Pagination offset
    - **limit**: Maximum number of subscribers to return
    - **status**: Filter by subscription status (active, cancelled, suspended, expired)
    """
    # Verify plan ownership
    plan = subscription_service.get_subscription_plan(plan_id, current_owner.id, db)

    # Build query for subscribers
    query = db.query(subscription_service.DriverSubscription).filter(
        subscription_service.DriverSubscription.plan_id == plan_id
    )

    if status:
        query = query.filter(subscription_service.DriverSubscription.status == status)

    subscribers = query.offset(skip).limit(limit).all()

    # Convert to response format
    subscriber_list = []
    for sub in subscribers:
        subscriber_data = {
            "id": sub.id,
            "driver_id": sub.driver_id,
            "status": sub.status,
            "start_date": sub.start_date,
            "next_billing_date": sub.next_billing_date,
            "current_price": sub.current_price,
            "total_parking_hours_used": sub.total_parking_hours_used,
            "created_at": sub.created_at,
        }
        subscriber_list.append(subscriber_data)

    return {
        "plan_id": plan_id,
        "plan_name": plan.name,
        "subscribers": subscriber_list,
        "total": len(subscriber_list),
        "page": skip // limit + 1 if limit > 0 else 1,
        "size": limit,
    }


@router.get(
    "/dashboard/overview",
    response_model=OwnerSubscriptionDashboardResponse,
    summary="Get subscription dashboard overview",
    description="Get comprehensive overview of owner's subscription business",
)
def get_subscription_dashboard(
    *,
    db: Session = Depends(get_db),
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Get comprehensive subscription dashboard including:

    - Plan counts and subscriber metrics
    - Revenue data
    - Top performing plans
    - Recent activity and trends
    """
    dashboard_data = subscription_service.get_owner_subscription_dashboard(
        owner_id=current_owner.id, db=db
    )

    return OwnerSubscriptionDashboardResponse(**dashboard_data)


@router.get(
    "/search/available",
    summary="Search available plans",
    description="Search for available subscription plans (for drivers)",
)
def search_available_plans(
    *,
    db: Session = Depends(get_db),
    lat: Optional[float] = Query(
        None, description="Latitude for location-based search"
    ),
    lon: Optional[float] = Query(
        None, description="Longitude for location-based search"
    ),
    radius_m: float = Query(
        5000, ge=100, le=50000, description="Search radius in meters"
    ),
    plan_type: Optional[str] = Query(None, description="Filter by plan type"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum monthly price"),
    skip: int = Query(0, ge=0, description="Number of plans to skip"),
    limit: int = Query(
        100, ge=1, le=1000, description="Maximum number of plans to return"
    ),
):
    """
    Search for available subscription plans.

    This endpoint is designed for drivers to discover available plans.
    It can be called without authentication for public plan discovery.

    - **lat/lon**: Location coordinates for proximity search
    - **radius_m**: Search radius in meters
    - **plan_type**: Filter by plan type (basic, premium, enterprise, custom)
    - **max_price**: Maximum monthly price filter
    - **skip/limit**: Pagination parameters
    """
    # Convert plan_type string to enum if provided
    plan_type_enum = None
    if plan_type:
        try:
            plan_type_enum = subscription_service.PlanType(plan_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan type: {plan_type}. Must be one of: basic, premium, enterprise, custom",
            )

    plans = subscription_service.search_available_plans(
        lat=lat,
        lon=lon,
        radius_m=radius_m,
        plan_type=plan_type_enum,
        max_price=max_price,
        db=db,
    )

    # Apply pagination
    total = len(plans)
    paginated_plans = plans[skip : skip + limit]

    return {
        "plans": paginated_plans,
        "total": total,
        "page": skip // limit + 1 if limit > 0 else 1,
        "size": limit,
        "has_more": skip + limit < total,
    }
