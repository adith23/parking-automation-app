"""Business logic for authentication and profile management."""

import random
import logging
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from ..models.owner_models.owner_model import ParkingLotOwner
from ..core.redis import get_redis
from ..core.config import settings

logger = logging.getLogger(__name__)


def generate_otp(length: int = 6) -> str:
    """Generate a random OTP of specified length."""
    return "".join([str(random.randint(0, 9)) for _ in range(length)])


def store_otp_in_redis(
    redis_key: str, otp: str, expiration_seconds: int = 300
) -> bool:
    """Store OTP in Redis with expiration."""
    try:
        redis_client = get_redis()
        if redis_client is None:
            logger.error("Redis client not available")
            return False
        redis_client.setex(redis_key, expiration_seconds, otp)
        logger.info(f"OTP stored in Redis with key: {redis_key}")
        return True
    except Exception as e:
        logger.error(f"Failed to store OTP in Redis: {e}")
        return False


def verify_otp_from_redis(redis_key: str, provided_otp: str) -> bool:
    """Verify OTP from Redis and delete it if valid."""
    try:
        redis_client = get_redis()
        if redis_client is None:
            logger.error("Redis client not available")
            return False

        stored_otp = redis_client.get(redis_key)
        if stored_otp is None:
            logger.warning(f"OTP not found in Redis for key: {redis_key}")
            return False

        # Decode bytes to string if needed
        if isinstance(stored_otp, bytes):
            stored_otp = stored_otp.decode("utf-8")

        if stored_otp == provided_otp:
            # Delete OTP after successful verification
            redis_client.delete(redis_key)
            logger.info(f"OTP verified and deleted for key: {redis_key}")
            return True
        else:
            logger.warning(f"OTP mismatch for key: {redis_key}")
            return False
    except Exception as e:
        logger.error(f"Failed to verify OTP from Redis: {e}")
        return False


def send_otp_via_sms(phone_number: str, otp: str) -> Tuple[bool, Optional[str]]:
    """Send OTP via Twilio SMS."""
    twilio_sid = getattr(settings, "TWILIO_ACCOUNT_SID", None)
    twilio_token = getattr(settings, "TWILIO_AUTH_TOKEN", None)
    twilio_phone = getattr(settings, "TWILIO_PHONE_NUMBER", None)
    
    if not all([twilio_sid, twilio_token, twilio_phone]):
        logger.warning(
            "Twilio credentials not configured. OTP will not be sent via SMS."
        )
        return False, "Twilio not configured"

    try:
        client = Client(twilio_sid, twilio_token)
        message = client.messages.create(
            body=f"Your OTP for profile update is: {otp}. Valid for 5 minutes.",
            from_=twilio_phone,
            to=phone_number,
        )
        logger.info(f"OTP SMS sent successfully. SID: {message.sid}")
        return True, None
    except TwilioRestException as e:
        logger.error(f"Twilio error: {e}")
        return False, str(e)
    except Exception as e:
        logger.error(f"Failed to send OTP via SMS: {e}")
        return False, str(e)


def send_otp_via_email(email: str, otp: str) -> Tuple[bool, Optional[str]]:
    """Send OTP via email (placeholder - implement with your email service)."""
    # TODO: Implement email sending using your preferred email service
    # For now, just log it
    logger.info(f"OTP for email {email}: {otp}")
    # In production, use services like SendGrid, AWS SES, etc.
    return True, None


def send_otp(
    email: Optional[str] = None, phone: Optional[str] = None
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Generate and send OTP via email or SMS.
    Returns: (success, otp, error_message)
    """
    otp = generate_otp()
    redis_key = None

    if email:
        redis_key = f"otp:email:{email}"
        success, error = send_otp_via_email(email, otp)
        if not success:
            return False, None, error
    elif phone:
        redis_key = f"otp:phone:{phone}"
        success, error = send_otp_via_sms(phone, otp)
        if not success:
            return False, None, error
    else:
        return False, None, "Either email or phone must be provided"

    # Store OTP in Redis (5 minutes expiration)
    if redis_key:
        store_success = store_otp_in_redis(redis_key, otp, expiration_seconds=300)
        if not store_success:
            return False, None, "Failed to store OTP"

    return True, otp, None


def verify_otp(
    email: Optional[str] = None, phone: Optional[str] = None, otp: str = ""
) -> bool:
    """Verify OTP from Redis."""
    if not otp:
        return False

    if email:
        redis_key = f"otp:email:{email}"
    elif phone:
        redis_key = f"otp:phone:{phone}"
    else:
        return False

    return verify_otp_from_redis(redis_key, otp)


def update_owner_profile(
    db: Session, owner: ParkingLotOwner, name: Optional[str] = None, address: Optional[str] = None
) -> ParkingLotOwner:
    """Update owner's name and/or address."""
    if name is not None:
        owner.name = name
    if address is not None:
        owner.address = address

    db.commit()
    db.refresh(owner)
    logger.info(f"Profile updated for owner ID: {owner.id}")
    return owner


def update_owner_email(
    db: Session, owner: ParkingLotOwner, new_email: str
) -> Tuple[bool, Optional[str]]:
    """Update owner's email after OTP verification."""
    # Check if email already exists
    existing_owner = (
        db.query(ParkingLotOwner).filter(ParkingLotOwner.email == new_email).first()
    )
    if existing_owner and existing_owner.id != owner.id:
        return False, "Email is already registered"

    owner.email = new_email
    db.commit()
    db.refresh(owner)
    logger.info(f"Email updated for owner ID: {owner.id}")
    return True, None


def update_owner_phone(
    db: Session, owner: ParkingLotOwner, new_phone: str
) -> Tuple[bool, Optional[str]]:
    """Update owner's phone number after OTP verification."""
    owner.phone_number = new_phone
    db.commit()
    db.refresh(owner)
    logger.info(f"Phone number updated for owner ID: {owner.id}")
    return True, None

