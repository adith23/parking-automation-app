    # Import all models here so that Base has them registered
    from app.models.driver_models.booking_model import Booking
    from app.models.driver_models.driver_model import Driver
    from app.models.driver_models.parking_session_model import ParkingSession
    from app.models.driver_models.vehicle_model import Vehicle
    from app.models.owner_models.owner_model import ParkingLotOwner
    from app.models.owner_models.parking_lot_model import ParkingLot
    from app.models.owner_models.parking_slot_model import ParkingSlot, SlotDefinition
    from app.models.owner_models.subscription_model import SubscriptionPlan, OwnerSubscription