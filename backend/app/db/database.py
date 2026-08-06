"""
MongoDB database layer using Motor (async driver) + Beanie (ODM).
Replaces the previous SQLAlchemy engine/session setup.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, List, Type

import motor.motor_asyncio
from beanie import Document, init_beanie
from loguru import logger

from app.core.config import settings

if TYPE_CHECKING:
    pass

# ---------------------------------------------------------------------------
# Motor async client
# ---------------------------------------------------------------------------
_mongo_client: motor.motor_asyncio.AsyncIOMotorClient | None = None
_mongo_db: motor.motor_asyncio.AsyncIOMotorDatabase | None = None


def get_mongo_client() -> motor.motor_asyncio.AsyncIOMotorClient:
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000,
        )
    return _mongo_client


def get_mongo_db() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    global _mongo_db
    if _mongo_db is None:
        _mongo_db = get_mongo_client()[settings.MONGODB_DB_NAME]
    return _mongo_db


# ---------------------------------------------------------------------------
# Beanie initialisation — called once at startup in main.py
# ---------------------------------------------------------------------------
async def init_db() -> None:
    """Initialise Beanie with all document models."""
    # Import here to avoid circular imports at module load time
    from app.models import (
        User, Customer, Worker, Admin,
        Category, Service,
        Booking, BookingStatusHistory,
        Coupon, Wallet, WalletTransaction,
        Review, Complaint, Notification,
        Broadcast, Conversation, Message,
        PortfolioImage, Certificate,
        WorkerAvailability, WorkerLocation,
        WorkerSkill, WorkerLanguage,
        RefreshToken, OTP,
        ChatSession, ChatMessage,
        WorkerFraudData, FraudReport, SuspiciousActivity,
        ImageAnalysis,
        WorkerVerification, SkillTestSession, PracticalAssessment,
        VoiceInterview, VerificationCertificate,
        CustomJob, JobBid, NegotiationMessage,
    )

    document_models: List[Type[Document]] = [
        User, Customer, Worker, Admin,
        Category, Service,
        Booking, BookingStatusHistory,
        Coupon, Wallet, WalletTransaction,
        Review, Complaint, Notification,
        Broadcast, Conversation, Message,
        PortfolioImage, Certificate,
        WorkerAvailability, WorkerLocation,
        WorkerSkill, WorkerLanguage,
        RefreshToken, OTP,
        ChatSession, ChatMessage,
        WorkerFraudData, FraudReport, SuspiciousActivity,
        ImageAnalysis,
        WorkerVerification, SkillTestSession, PracticalAssessment,
        VoiceInterview, VerificationCertificate,
        CustomJob, JobBid, NegotiationMessage,
    ]

    await init_beanie(
        database=get_mongo_db(),
        document_models=document_models,
    )
    logger.info(f"Beanie initialised with {len(document_models)} document models")


async def check_database_connection() -> bool:
    """Verify the MongoDB server accepts connections."""
    try:
        client = get_mongo_client()
        await client.admin.command("ping")
        return True
    except Exception as exc:
        logger.warning(f"MongoDB connection check failed: {exc}")
        return False


def close_db() -> None:
    """Close the Motor client — called on application shutdown."""
    global _mongo_client, _mongo_db
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
        _mongo_db = None
        logger.info("MongoDB connection closed")
