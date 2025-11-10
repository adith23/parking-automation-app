from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:pass1234@localhost:5432/ParkingSystem"

    # Redis / Socket.IO
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_GEO_KEY: str = "parking:lots:geo"
    REDIS_AVAILABILITY_CHANNEL: str = "slot_updates"
    SOCKET_IO_CORS_ORIGINS: List[str] = ["*"]

    # Background task intervals (seconds)
    GEO_CACHE_REFRESH_SECONDS: int = 60

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    # API
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Parking Automation API"

    # Logging
    LOG_LEVEL: str = "INFO"

    # JWT Configuration
    JWT_SECRET_KEY: str = "change-me-in-production"  # MUST be set via env in production
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 300  # 5 hours
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # Optional: for future refresh tokens

    # Twilio Configuration (for OTP)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
