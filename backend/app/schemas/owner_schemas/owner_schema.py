from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# For creating a new owner (registration)
class OwnerCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone_number: Optional[str] = None


# For reading owner info (response)
class OwnerResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone_number: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# For updating profile (name and address)
class OwnerProfileUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None


# For requesting OTP to change email/phone
class OTPRequest(BaseModel):
    new_email: Optional[EmailStr] = None
    new_phone: Optional[str] = None


# For verifying OTP
class OTPVerify(BaseModel):
    otp: str
    new_email: Optional[EmailStr] = None
    new_phone: Optional[str] = None


# For login
class OwnerLogin(BaseModel):
    email: EmailStr
    password: str
