from fastapi import APIRouter
from app.api.v1.endpoints.driver.auth_routes import router as driver_auth_router
from app.api.v1.endpoints.driver.search_routes import router as driver_search_router
from app.api.v1.endpoints.driver.booking_routes import router as driver_booking_router
from app.api.v1.endpoints.driver.parking_session_routes import router as driver_session_router
from app.api.v1.endpoints.owner.auth_routes import router as owner_router
from app.api.v1.endpoints.owner.parking_lot_routes import router as parking_lot_router
from app.api.v1.endpoints.owner.parking_slot_routes import router as slot_definition_router
from app.api.v1.endpoints.owner.view_lot_routes import router as lot_view_router

api_router = APIRouter()   

# Driver routes
api_router.include_router(driver_auth_router, prefix="/driver", tags=["Driver Auth"])
api_router.include_router(driver_search_router, prefix="/driver", tags=["Driver Search"])
api_router.include_router(driver_booking_router, prefix="/driver", tags=["Driver Bookings"])
api_router.include_router(driver_session_router, prefix="/driver", tags=["Driver Parking Sessions"])


# Owner routes
api_router.include_router(owner_router, prefix="/owner", tags=["Owner"])
api_router.include_router(parking_lot_router, prefix="/owner/parking-lots", tags=["Owner Parking Lots"])

# Slot Definition routes
api_router.include_router(slot_definition_router, prefix="/owner/slot-definitions", tags=["Owner Slot Definitions"])

# Live View routes
api_router.include_router(lot_view_router, prefix="/owner/parking-lots-view", tags=["Parking Lot Live View"],)