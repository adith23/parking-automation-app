from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.owner.manageparking import (
    ParkingLotCreate,
    ParkingLotResponse,
    ParkingLotUpdate,
)
from app.models.owner.owner import ParkingLotOwner
from app.core.deps import get_db, get_current_owner
from app.services.parking_service import parking_service

router = APIRouter()


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
    return parking_service.create_parking_lot(
        owner_id=current_owner.id,
        parking_lot_data=parking_lot_in.dict(),
        db=db
    )


@router.get(
    "/", 
    response_model=List[ParkingLotResponse], 
    summary="List owner's parking lots"
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
    return parking_service.get_owner_parking_lots(
        owner_id=current_owner.id,
        db=db,
        skip=skip,
        limit=limit
    )


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
    return parking_service.get_parking_lot(
        parking_lot_id=parking_lot_id,
        owner_id=current_owner.id,
        db=db
    )


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
    return parking_service.update_parking_lot(
        parking_lot_id=parking_lot_id,
        owner_id=current_owner.id,
        updates=parking_lot_in.dict(exclude_unset=True),
        db=db
    )

'''
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
    parking_service.delete_parking_lot(
        parking_lot_id=parking_lot_id,
        owner_id=current_owner.id,
        db=db
    )


@router.get(
    "/{parking_lot_id}/stats",
    summary="Get parking lot statistics",
)
def get_parking_lot_stats(
    *,
    db: Session = Depends(get_db),
    parking_lot_id: int,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """
    Get statistics for a parking lot.
    """
    return parking_service.get_lot_stats(
        lot_id=parking_lot_id,
        owner_id=current_owner.id,
        db=db
    )
'''