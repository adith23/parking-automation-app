from pydantic_settings import BaseSettings
from typing import List, Optional
import boto3
import os
import json
import sys

# AWS Secrets Manager Integration
secrets_arn = os.getenv("SECRETS_ARN")
aws_region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")

if secrets_arn:
    print("Found SECRETS_ARN, attempting to fetch secrets from AWS Secrets Manager...")

    if not aws_region:
        print("ERROR: SECRETS_ARN is set but AWS_REGION is missing.")
        print("Solution: Add AWS_REGION to ECS task or .env during local tests.")
        sys.exit(1)

    try:
        session = boto3.session.Session(region_name=aws_region)
        client = session.client(service_name="secretsmanager")

        secret_response = client.get_secret_value(SecretId=secrets_arn)
        secret = secret_response["SecretString"]

        aws_secrets = json.loads(secret)
        os.environ.update(aws_secrets)

        print("Successfully loaded secrets into environment.")

    except Exception as e:
        print(f"FATAL: Could not fetch secrets from AWS Secrets Manager: {e}")
        sys.exit(1)


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Google Cloud Vision
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None

    # Redis / Socket.IO
    REDIS_URL: str
    REDIS_GEO_KEY: str = "parking:lots:geo"
    REDIS_AVAILABILITY_CHANNEL: str = "slot_updates"
    SOCKET_IO_CORS_ORIGINS: List[str] = ["*"]

    # Background task intervals (seconds)
    GEO_CACHE_REFRESH_SECONDS: int = 60

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000", "*"]

    # API
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Parking Automation API"

    # Logging
    LOG_LEVEL: str = "INFO"

    # JWT Configuration
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 300  # 5 hours
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # Optional: for future refresh tokens

    S3_BUCKET_NAME: str
    VIDEO_S3_PATH: str 
    S3_VEHICLE_MODEL_KEY: str    
    S3_LPR_MODEL_KEY: str

    # Twilio Configuration (for OTP)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
