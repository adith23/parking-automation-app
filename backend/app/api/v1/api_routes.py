from fastapi import APIRouter
from app.api.v1.endpoints.driver.auth import router as driver_router
from app.api.v1.endpoints.owner.auth import router as owner_router
from app.api.v1.endpoints.owner.manageparking import router as parking_lot_router

api_router = APIRouter()

api_router.include_router(driver_router, prefix="/driver", tags=["Driver"])
api_router.include_router(owner_router, prefix="/owner", tags=["Owner"])
api_router.include_router(parking_lot_router, prefix="/owner/parking-lots", tags=["Owner Parking Lots"]
)