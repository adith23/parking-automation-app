"""API endpoints for owner authentication (register and login)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .....models.owner_models.owner_model import ParkingLotOwner as ParkingLotOwner
from .....schemas.owner_schemas.owner_schema import OwnerCreate, OwnerLogin, OwnerResponse
from .....core.database import get_db
from .....core.auth import hash_password, verify_password
from .....core.jwt import create_access_token
from .....core.deps import get_current_owner

router = APIRouter()

@router.post("/register/", response_model=OwnerResponse)
def register_owner(owner: OwnerCreate, db: Session = Depends(get_db)):
    existing_owner = (
        db.query(ParkingLotOwner).filter(ParkingLotOwner.email == owner.email).first()
    )
    if existing_owner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered",
        )
    new_owner = ParkingLotOwner(
        name=owner.name,
        email=owner.email,
        password_hash=hash_password(owner.password),
        phone_number=owner.phone_number,
    )
    db.add(new_owner)
    db.commit()
    db.refresh(new_owner)
    return new_owner


@router.post("/login/")
def login_owner(credentials: OwnerLogin, db: Session = Depends(get_db)):
    owner = (
        db.query(ParkingLotOwner)
        .filter(ParkingLotOwner.email == credentials.email)
        .first()
    )
    if not owner or not verify_password(credentials.password, owner.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    access_token = create_access_token(data={"sub": owner.email, "role": "owner"})
    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": owner.id,
            "name": owner.name,
            "email": owner.email,
            "phone_number": owner.phone_number,
            "created_at": owner.created_at,
        },
    }


@router.get("/me/", response_model=OwnerResponse)
def read_me(current_owner: ParkingLotOwner = Depends(get_current_owner)):
    return current_owner
