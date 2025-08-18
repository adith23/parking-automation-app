from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import time
from geoalchemy2.elements import WKTElement

from app.schemas.owner.manageparking import (
    ParkingLotCreate,
    ParkingLotResponse,
    ParkingLotUpdate,
)
from app.models.owner import manageparking as parking_model
from app.models.owner.owner import ParkingLotOwner
from app.core.deps import get_db, get_current_owner

router = APIRouter()


def validate_parking_lot(parking_lot_data: dict):
    """Validate parking lot data"""
    if parking_lot_data.get("total_slots", 0) <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total slots must be greater than 0",
        )

    if parking_lot_data.get("price_per_hour", 0) <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Price per hour must be greater than 0",
        )

    # Validate time format
    try:
        if "open_time" in parking_lot_data:
            time.fromisoformat(str(parking_lot_data["open_time"]))
        if "close_time" in parking_lot_data:
            time.fromisoformat(str(parking_lot_data["close_time"]))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid time format"
        )


@router.post(
    "/",
    response_model=ParkingLotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new parking lot",
)
def create_parking_lot(
    *,
    db: Session = Depends(get_db),
    parking_lot_in: ParkingLotCreate,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Create a new parking lot owned by the current user.
    """
    parking_lot_data = parking_lot_in.dict()

    coords = parking_lot_data.pop("gps_coordinates", None)
    if coords:
        # Convert to WKT format for GeoAlchemy2
        wkt_point = f"POINT({coords['longitude']} {coords['latitude']})"
        parking_lot_data["gps_coordinates"] = WKTElement(wkt_point, srid=4326)

    db_parking_lot = parking_model.ParkingLot(
        **parking_lot_data, owner_id=current_owner.id
    )
    
    db.add(db_parking_lot)
    db.commit()
    db.refresh(db_parking_lot)
    return db_parking_lot


@router.get(
    "/", response_model=List[ParkingLotResponse], summary="List owner's parking lots"
)
def get_owner_parking_lots(
    *,
    db: Session = Depends(get_db),
    current_owner: ParkingLotOwner = Depends(get_current_owner),
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve all parking lots owned by the current user.
    """
    parking_lots = (
        db.query(parking_model.ParkingLot)
        .filter(parking_model.ParkingLot.owner_id == current_owner.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return parking_lots


@router.get(
    "/{parking_lot_id}",
    response_model=ParkingLotResponse,
    summary="Get a specific parking lot",
)
def get_parking_lot(
    *,
    db: Session = Depends(get_db),
    parking_lot_id: int,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Retrieve a specific parking lot by its ID.
    """
    parking_lot = (
        db.query(parking_model.ParkingLot)
        .filter(parking_model.ParkingLot.id == parking_lot_id)
        .first()
    )
    if not parking_lot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Parking lot not found"
        )
    if getattr(parking_lot, "owner_id") != getattr(current_owner, "id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this parking lot",
        )
    return parking_lot


@router.put(
    "/{parking_lot_id}",
    response_model=ParkingLotResponse,
    summary="Update a parking lot",
)
def update_parking_lot(
    *,
    db: Session = Depends(get_db),
    parking_lot_id: int,
    parking_lot_in: ParkingLotUpdate,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Update a parking lot's details.
    """
    db_parking_lot = get_parking_lot(
        db=db, parking_lot_id=parking_lot_id, current_owner=current_owner
    )

    update_data = parking_lot_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_parking_lot, key, value)

    db.add(db_parking_lot)
    db.commit()
    db.refresh(db_parking_lot)
    return db_parking_lot


@router.delete(
    "/{parking_lot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a parking lot",
)
def delete_parking_lot(
    *,
    db: Session = Depends(get_db),
    parking_lot_id: int,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Delete a parking lot.
    """
    db_parking_lot = get_parking_lot(
        db=db, parking_lot_id=parking_lot_id, current_owner=current_owner
    )
    db.delete(db_parking_lot)
    db.commit()
    return
