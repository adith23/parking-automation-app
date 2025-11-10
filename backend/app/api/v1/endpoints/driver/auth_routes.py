from fastapi import APIRouter, Depends, HTTPException, status  # type: ignore
from sqlalchemy.orm import Session  # type: ignore
from .....core.auth import hash_password, verify_password
from .....core.jwt import create_access_token
from .....models.driver_models.driver_model import Driver
from .....schemas.driver_schemas.driver_schema import DriverCreate, DriverLogin, DriverResponse
from .....core.database import get_db
from .....core.deps import get_current_driver

router = APIRouter()

@router.post("/register/", response_model=DriverResponse)
def register(driver: DriverCreate, db: Session = Depends(get_db)):
    db_driver = db.query(Driver).filter(Driver.email == driver.email).first()
    if db_driver:
        raise HTTPException(status_code=400, detail="Email is already registered")
    new_driver = Driver(
        name=driver.name,
        email=driver.email,
        password_hash=hash_password(driver.password),
        phone_number=driver.phone_number,
    )
    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)
    return new_driver


@router.post("/login/")
def login(credentials: DriverLogin, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.email == credentials.email).first()
    if not driver or not verify_password(credentials.password, driver.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    access_token = create_access_token(data={"sub": driver.email, "role": "driver"})
    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": driver.id,
            "name": driver.name,
            "email": driver.email,
            "phone_number": driver.phone_number,
            "created_at": driver.created_at,
        },
    }


@router.get("/me/", response_model=DriverResponse)
def read_me(current_driver: Driver = Depends(get_current_driver)):
    return current_driver
