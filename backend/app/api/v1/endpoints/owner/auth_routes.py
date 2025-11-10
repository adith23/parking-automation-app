"""API endpoints for owner authentication (register and login)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .....models.owner_models.owner_model import ParkingLotOwner as ParkingLotOwner
from .....schemas.owner_schemas.owner_schema import (
    OwnerCreate,
    OwnerLogin,
    OwnerResponse,
    OwnerProfileUpdate,
    OTPRequest,
    OTPVerify,
)
from .....core.database import get_db
from .....core.auth import hash_password, verify_password
from .....core.jwt import create_access_token
from .....core.deps import get_current_owner
from .....services.auth_service import (
    send_otp,
    verify_otp,
    update_owner_profile,
    update_owner_email,
    update_owner_phone,
)

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


@router.put("/profile/", response_model=OwnerResponse)
def update_profile(
    profile_update: OwnerProfileUpdate,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    """Update owner's name and/or address."""
    updated_owner = update_owner_profile(
        db=db,
        owner=current_owner,
        name=profile_update.name,
        address=profile_update.address,
    )
    return updated_owner


@router.post("/send-otp/")
def send_otp_for_update(
    otp_request: OTPRequest,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
):
    """Send OTP to email or phone for verification before updating."""
    if not otp_request.new_email and not otp_request.new_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either new_email or new_phone must be provided",
        )

    # Check if email is different from current
    if otp_request.new_email and otp_request.new_email == current_owner.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New email must be different from current email",
        )

    # Check if phone is different from current
    if otp_request.new_phone and otp_request.new_phone == current_owner.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New phone number must be different from current phone number",
        )

    success, otp, error = send_otp(
        email=otp_request.new_email, phone=otp_request.new_phone
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error or "Failed to send OTP"
        )

    return {
        "message": "OTP sent successfully",
        "sent_to": otp_request.new_email or otp_request.new_phone,
    }


@router.post("/verify-otp/")
def verify_otp_and_update(
    otp_verify: OTPVerify,
    current_owner: ParkingLotOwner = Depends(get_current_owner),
    db: Session = Depends(get_db),
):
    """Verify OTP and update email or phone number."""
    if not otp_verify.new_email and not otp_verify.new_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either new_email or new_phone must be provided",
        )

    # Verify OTP
    is_valid = verify_otp(
        email=otp_verify.new_email, phone=otp_verify.new_phone, otp=otp_verify.otp
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP"
        )

    # Update email or phone
    if otp_verify.new_email:
        success, error = update_owner_email(db, current_owner, otp_verify.new_email)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=error or "Failed to update email"
            )
        return {"message": "Email updated successfully"}

    if otp_verify.new_phone:
        success, error = update_owner_phone(db, current_owner, otp_verify.new_phone)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error or "Failed to update phone number",
            )
        return {"message": "Phone number updated successfully"}
