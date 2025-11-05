from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# For creating a new driver (registration)
class DriverCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone_number: Optional[str] = None


# For reading driver info (response)
class DriverResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone_number: Optional[str] = None
    created_at: datetime

    class Config:
      from_attributes = True


# For login
class DriverLogin(BaseModel):
    email: EmailStr
    password: str
