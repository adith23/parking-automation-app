from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.deps import get_current_driver, get_db
from app.models.driver_models.driver_model import Driver
from app.models.driver_models.parking_session_model import ParkingSessionStatus
from app.schemas.driver_schemas.parking_session_schema import (
    ParkingSessionResponse,
)
from app.services.session_service import session_service

router = APIRouter()


@router.get(
    "/sessions",
    response_model=List[ParkingSessionResponse],
    summary="Get driver's parking sessions"
)
def get_driver_sessions(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
    status: Optional[str] = Query(None, description="Filter by session status (active, completed, canceled)"),
):
    """
    Get all parking sessions for the current driver.
    Optionally filter by status (active, completed, canceled).
    """
    status_filter = None
    if status:
        try:
            status_filter = ParkingSessionStatus(status.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}. Valid values: active, completed, canceled"
            )

    sessions = session_service.get_driver_sessions(
        driver_id=current_driver.id,
        status_filter=status_filter,
        db=db
    )

    # Convert to response models with calculated fields
    response_sessions = []
    for session in sessions:
        session_dict = {
            "id": session.id,
            "booking_id": session.booking_id,
            "vehicle_id": session.vehicle_id,
            "parking_slot_id": session.parking_slot_id,
            "parking_lot_id": session.parking_lot_id,
            "license_plate": session.license_plate,
            "status": session.status,
            "start_time": session.start_time,
            "end_time": session.end_time,
            "total_duration_minutes": session.total_duration_minutes,
            "parking_cost": session.parking_cost,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
        }

        # Calculate duration if not already calculated
        if session.end_time and session.start_time:
            duration = (session.end_time - session.start_time).total_seconds() / 60.0
            session_dict["duration_minutes"] = duration
        elif not session.end_time:
            # Active session - calculate up to now
            duration = (datetime.utcnow() - session.start_time).total_seconds() / 60.0
            session_dict["duration_minutes"] = duration
        else:
            session_dict["duration_minutes"] = None

        session_dict["estimated_cost"] = session.parking_cost

        response_sessions.append(ParkingSessionResponse(**session_dict))

    return response_sessions


@router.get(
    "/sessions/active",
    response_model=List[ParkingSessionResponse],
    summary="Get driver's active parking sessions"
)
def get_active_sessions(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
):
    """
    Get all active (ongoing) parking sessions for the current driver.
    """
    sessions = session_service.get_driver_sessions(
        driver_id=current_driver.id,
        status_filter=ParkingSessionStatus.ACTIVE,
        db=db
    )

    # Convert to response models with calculated fields
    response_sessions = []
    for session in sessions:
        # Calculate duration for active sessions
        duration = (datetime.utcnow() - session.start_time).total_seconds() / 60.0
        
        # Calculate estimated cost
        estimated_cost = session_service.calculate_session_cost(session.id, db)

        session_dict = {
            "id": session.id,
            "booking_id": session.booking_id,
            "vehicle_id": session.vehicle_id,
            "parking_slot_id": session.parking_slot_id,
            "parking_lot_id": session.parking_lot_id,
            "license_plate": session.license_plate,
            "status": session.status,
            "start_time": session.start_time,
            "end_time": session.end_time,
            "total_duration_minutes": duration,
            "parking_cost": estimated_cost,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "duration_minutes": duration,
            "estimated_cost": estimated_cost,
        }

        response_sessions.append(ParkingSessionResponse(**session_dict))

    return response_sessions


@router.get(
    "/sessions/{session_id}",
    response_model=ParkingSessionResponse,
    summary="Get a specific parking session"
)
def get_session(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
    session_id: int,
):
    """
    Get details of a specific parking session.
    """
    session = session_service.get_session_by_id(
        session_id=session_id,
        driver_id=current_driver.id,
        db=db
    )

    # Calculate duration
    if session.end_time and session.start_time:
        duration = (session.end_time - session.start_time).total_seconds() / 60.0
    elif not session.end_time:
        # Active session
        duration = (datetime.utcnow() - session.start_time).total_seconds() / 60.0
    else:
        duration = None

    # Get cost (use stored or calculate)
    cost = session.parking_cost
    if not cost and session.status == ParkingSessionStatus.ACTIVE:
        cost = session_service.calculate_session_cost(session.id, db)

    session_dict = {
        "id": session.id,
        "booking_id": session.booking_id,
        "vehicle_id": session.vehicle_id,
        "parking_slot_id": session.parking_slot_id,
        "parking_lot_id": session.parking_lot_id,
        "license_plate": session.license_plate,
        "status": session.status,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "total_duration_minutes": session.total_duration_minutes or duration,
        "parking_cost": cost,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "duration_minutes": duration,
        "estimated_cost": cost,
    }

    return ParkingSessionResponse(**session_dict)
