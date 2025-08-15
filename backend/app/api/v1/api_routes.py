from fastapi import APIRouter
from app.api.v1.endpoints.driver.auth import router as driver_router
from app.api.v1.endpoints.owner.auth import router as owner_router

api_router = APIRouter()

api_router.include_router(driver_router, prefix="/driver", tags=["Driver"])
api_router.include_router(owner_router, prefix="/owner", tags=["Owner"])
