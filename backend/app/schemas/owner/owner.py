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
    created_at: datetime

    class Config:
        orm_mode = True


# For login
class OwnerLogin(BaseModel):
    email: EmailStr
    password: str
