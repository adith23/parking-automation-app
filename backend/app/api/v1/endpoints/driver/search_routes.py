import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.deps import get_current_driver, get_db
from app.core.socket_manager import subscribe_driver_to_search
from app.models.driver_models.driver_model import Driver
from app.schemas.owner_schemas.parking_lot_schema import ParkingLotResponse
from app.services.search_service import search_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/parking", response_model=List[ParkingLotResponse])
async def search_nearby_parking(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
    latitude: float = Query(..., description="Latitude for search center"),
    longitude: float = Query(..., description="Longitude for search center"),
    radius: float = Query(500, ge=100, le=5000, description="Search radius in meters"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    socket_id: Optional[str] = Query(
        None, description="Socket.IO session id for live updates"
    ),
):
    """
    Search for nearby parking lots within a specified radius.
    Returns parking lots within 5-minute walking distance (500m radius).
    """
    try:
        raw_results = search_service.search_parking(
            latitude=latitude,
            longitude=longitude,
            radius_m=radius,
            limit=limit,
            db=db,
        )

        results = []

        for result in raw_results:
            try:
                # Try to create ParkingLotResponse from each result
                parking_lot_response = ParkingLotResponse(**result)
                results.append(parking_lot_response)
            except Exception as validation_error:
                # Log the specific validation error for debugging
                logger.error(
                    f"Validation error for parking lot {result.get('id', 'unknown')}: {validation_error}"
                )
                logger.error(f"Problematic data: {result}")
                # Skip this result and continue with others
                continue

        if socket_id:
            room = search_service.build_room_key(latitude, longitude, radius)
            payload = {
                "search": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "radius": radius,
                },
                "results": raw_results,
            }
            try:
                await subscribe_driver_to_search(socket_id, room, payload)
            except Exception:
                # Socket subscription errors should not block HTTP response
                pass

        return results

    except Exception as e:
        # Log the full error for debugging
        logger.exception("Error searching parking lots")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching parking lots: {str(e)}",
        )


@router.get("/parking/text", response_model=List[ParkingLotResponse])
async def search_parking_by_text(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
    query: str = Query(..., description="Search query (name, address, etc.)"),
    latitude: Optional[float] = Query(
        None, description="Current latitude for distance calculation"
    ),
    longitude: Optional[float] = Query(
        None, description="Current longitude for distance calculation"
    ),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
):
    """
    Search for parking lots by text query (name, address, etc.).
    """
    try:
        ref_lat = latitude if latitude is not None else 0.0
        ref_lon = longitude if longitude is not None else 0.0
        raw_results = search_service.search_parking(
            latitude=ref_lat,
            longitude=ref_lon,
            radius_m=5000,
            limit=limit,
            db=db,
            query_text=query,
        )

        results = [ParkingLotResponse(**result) for result in raw_results]

        if latitude is not None and longitude is not None:
            results.sort(key=lambda x: x.distance_meters or float("inf"))
        else:
            results.sort(key=lambda x: x.name)

        return results

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching parking lots: {str(e)}",
        )


@router.get("/parking/{parking_lot_id}", response_model=ParkingLotResponse)
def get_parking_details(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
    parking_lot_id: int,
):
    """
    Get detailed information about a specific parking lot.
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

    return parking_lot


@router.get("/parking/{parking_lot_id}/availability")
def get_parking_availability(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
    parking_lot_id: int,
):
    """
    Get current availability status of a parking lot.
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

    # TODO: Implement actual availability calculation based on active bookings
    # For now, return mock data
    return {
        "parking_lot_id": parking_lot_id,
        "total_slots": parking_lot.total_slots,
        "available_slots": parking_lot.total_slots,  # Mock: assume all slots available
        "occupied_slots": 0,  # Mock: assume no occupied slots
        "last_updated": "2024-01-01T00:00:00Z",  # Mock timestamp
    }


@router.get("/parking/{parking_lot_id}/reviews")
def get_parking_reviews(
    *,
    db: Session = Depends(get_db),
    current_driver: Driver = Depends(get_current_driver),
    parking_lot_id: int,
    skip: int = Query(0, ge=0, description="Number of reviews to skip"),
    limit: int = Query(
        10, ge=1, le=50, description="Maximum number of reviews to return"
    ),
):
    """
    Get reviews and ratings for a parking lot.
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

    # TODO: Implement actual reviews system
    # For now, return mock data
    return {
        "parking_lot_id": parking_lot_id,
        "average_rating": 4.2,  # Mock rating
        "total_reviews": 15,  # Mock review count
        "reviews": [],  # Mock empty reviews list
    }
