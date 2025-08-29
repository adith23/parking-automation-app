from fastapi import Depends, HTTPException, status  
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from ..database import get_db
from ..core.jwt import verify_token
from ..models.owner.owner import ParkingLotOwner
from ..models.driver.driver import Driver

owner_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/owner/login/")
driver_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/driver/login/")


def get_current_owner(
    token: str = Depends(owner_oauth2_scheme),
    db: Session = Depends(get_db),
) -> ParkingLotOwner:
    payload = verify_token(token)
    if not payload or payload.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )
    owner = (
        db.query(ParkingLotOwner)
        .filter(ParkingLotOwner.email == payload["email"])
        .first()
    )
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return owner


def get_current_driver(
    token: str = Depends(driver_oauth2_scheme),
    db: Session = Depends(get_db),
) -> Driver:
    payload = verify_token(token)
    if not payload or payload.get("role") != "driver":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )
    driver = db.query(Driver).filter(Driver.email == payload["email"]).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return driver
