import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
from .config import settings


# JWT configuration (env-configurable)
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()

    # Validate required fields
    if "sub" not in to_encode or "role" not in to_encode:
        raise ValueError("Token data must include 'sub' (email) and 'role' fields")

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")

        if email is None or role is None:
            return None

        # Additional validation
        if role not in ["owner", "driver"]:
            return None

        return {"email": email, "role": role}
    except JWTError:
        return None
