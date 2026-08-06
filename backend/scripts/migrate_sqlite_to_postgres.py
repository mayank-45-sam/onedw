r"""
Fast SQLite -> PostgreSQL migration script.

Raw SQL reads from SQLite.
SQLAlchemy bulk_insert_mappings writes to PostgreSQL.
No schema reflection. Bulk inserts. One commit per table.
Validates foreign keys and nullifies broken references.
"""

import json
import sys
import os
from datetime import datetime

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.database import init_db

from app.models.user import User
from app.models.worker import Worker
from app.models.customer import Customer
from app.models.admin import Admin
from app.models.category import Category
from app.models.service import Service
from app.models.booking import Booking
from app.models.booking_status_history import BookingStatusHistory
from app.models.review import Review
from app.models.coupon import Coupon
from app.models.fraud import FraudReport, WorkerFraudData, SuspiciousActivity
from app.models.worker_location import WorkerLocation
from app.models.verification import WorkerVerification, SkillTestSession, PracticalAssessment, VoiceInterview, VerificationCertificate
from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction
from app.models.notification import Notification
from app.models.refresh_token import RefreshToken
from app.models.otp import OTP
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.portfolio_image import PortfolioImage
from app.models.certificate import Certificate
from app.models.worker_availability import WorkerAvailability
from app.models.worker_language import WorkerLanguage
from app.models.ai_chat import ChatSession, ChatMessage
from app.models.image_analysis import ImageAnalysis
from app.models.worker_skill import WorkerSkill
from app.models.complaint import Complaint

SQLITE_URL = "sqlite:///C:/Users/mayan/Downloads/frd/backend/onedw.db"
PG_URL = settings.DATABASE_URL

TABLES = [
    ("users", User, "SELECT * FROM users"),
    ("categories", Category, "SELECT * FROM categories"),
    ("services", Service, "SELECT * FROM services"),
    ("workers", Worker, "SELECT * FROM workers"),
    ("customers", Customer, "SELECT * FROM customers"),
    ("admins", Admin, "SELECT * FROM admins"),
    ("wallets", Wallet, "SELECT * FROM wallets"),
    ("worker_skills", WorkerSkill, "SELECT * FROM worker_skills"),
    ("worker_locations", WorkerLocation, "SELECT * FROM worker_locations"),
    ("worker_languages", WorkerLanguage, "SELECT * FROM worker_languages"),
    ("worker_availability", WorkerAvailability, "SELECT * FROM worker_availability"),
    ("worker_fraud_data", WorkerFraudData, "SELECT * FROM worker_fraud_data"),
    ("worker_verifications", WorkerVerification, "SELECT * FROM worker_verifications"),
    ("fraud_reports", FraudReport, "SELECT * FROM fraud_reports"),
    ("suspicious_activities", SuspiciousActivity, "SELECT * FROM suspicious_activities"),
    ("coupons", Coupon, "SELECT * FROM coupons"),
    ("bookings", Booking, "SELECT * FROM bookings"),
    ("booking_status_history", BookingStatusHistory, "SELECT * FROM booking_status_history"),
    ("reviews", Review, "SELECT * FROM reviews"),
    ("conversations", Conversation, "SELECT * FROM conversations"),
    ("messages", Message, "SELECT * FROM messages"),
    ("notifications", Notification, "SELECT * FROM notifications"),
    ("refresh_tokens", RefreshToken, "SELECT * FROM refresh_tokens"),
    ("otps", OTP, "SELECT * FROM otps"),
    ("ai_chat_sessions", ChatSession, "SELECT * FROM ai_chat_sessions"),
    ("ai_chat_messages", ChatMessage, "SELECT * FROM ai_chat_messages"),
    ("image_analyses", ImageAnalysis, "SELECT * FROM image_analyses"),
    ("practical_assessments", PracticalAssessment, "SELECT * FROM practical_assessments"),
    ("skill_test_sessions", SkillTestSession, "SELECT * FROM skill_test_sessions"),
    ("voice_interviews", VoiceInterview, "SELECT * FROM voice_interviews"),
    ("verification_certificates", VerificationCertificate, "SELECT * FROM verification_certificates"),
    ("certificates", Certificate, "SELECT * FROM certificates"),
    ("portfolio_images", PortfolioImage, "SELECT * FROM portfolio_images"),
    ("wallet_transactions", WalletTransaction, "SELECT * FROM wallet_transactions"),
    ("complaints", Complaint, "SELECT * FROM complaints"),
]


def parse_json(val):
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return val
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return None
        try:
            return json.loads(val)
        except json.JSONDecodeError:
            return val
    return val


def parse_datetime(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return None
        for fmt in (
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d",
        ):
            try:
                return datetime.strptime(val, fmt)
            except ValueError:
                continue
    return None


def parse_bool(val):
    if val is None:
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, int):
        return bool(val)
    if isinstance(val, str):
        return val.lower() in ("1", "true", "t", "yes", "y")
    return bool(val)


def col_type(col):
    return type(col.type).__name__


def get_fk_map(model_class):
    fk_map = {}
    for col in model_class.__table__.columns:
        if col.foreign_keys:
            for fk in col.foreign_keys:
                target_table = fk.column.table.name
                fk_map[col.name] = target_table
    return fk_map


def main():
    print("=" * 60)
    print("FAST SQLite -> PostgreSQL Migration")
    print("=" * 60)

    pg_engine = create_engine(
        PG_URL,
        pool_pre_ping=True,
        echo=False,
        connect_args={"connect_timeout": 10},
    )
    sqlite_engine = create_engine(SQLITE_URL, echo=False)

    SessionPG = sessionmaker(bind=pg_engine)
    pg = SessionPG()

    print("\nInitializing PostgreSQL tables...")
    init_db()
    print("Tables ready.")

    print("\nTruncating PostgreSQL tables...")
    for table_name, _, _ in reversed(TABLES):
        try:
            pg.execute(text(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE"))
        except Exception as e:
            print(f"  WARN {table_name}: {e}")
    pg.commit()
    print("PostgreSQL cleared.")

    print("\nMigrating data...")
    print("-" * 60)

    total = 0
    valid_ids = {}

    with sqlite_engine.connect() as sq:
        for table_name, model_class, sql in TABLES:
            rows = sq.execute(text(sql)).fetchall()
            if not rows:
                print(f"  {table_name}: 0 rows")
                continue

            cols = [c.name for c in model_class.__table__.columns]
            mappings = []
            fk_map = get_fk_map(model_class)

            for row in rows:
                d = {}
                row_dict = dict(row._mapping)

                for col in model_class.__table__.columns:
                    name = col.name
                    if name not in row_dict:
                        continue
                    val = row_dict[name]
                    ct = col_type(col)

                    if ct == "JSON":
                        d[name] = parse_json(val)
                    elif ct == "DateTime":
                        d[name] = parse_datetime(val)
                    elif ct == "Boolean":
                        d[name] = parse_bool(val)
                    elif ct == "Integer":
                        d[name] = int(val) if val is not None else None
                    elif ct == "Float":
                        d[name] = float(val) if val is not None else None
                    else:
                        d[name] = val

                for col_name, target_table in fk_map.items():
                    if col_name in d and d[col_name] is not None:
                        if target_table not in valid_ids or d[col_name] not in valid_ids[target_table]:
                            d[col_name] = None

                if table_name == "bookings":
                    if d.get("booking_type") is None:
                        d["booking_type"] = "scheduled"
                    if "is_emergency" not in d:
                        d["is_emergency"] = False

                if table_name == "booking_status_history" and "metadata" in d:
                    d["metadata_"] = d.pop("metadata")

                if table_name == "worker_fraud_data" and d.get("last_analysis_at") and len(str(d["last_analysis_at"])) > 30:
                    d["last_analysis_at"] = str(d["last_analysis_at"])[:30]

                if table_name == "fraud_reports" and d.get("analyzed_at") and len(str(d["analyzed_at"])) > 30:
                    d["analyzed_at"] = str(d["analyzed_at"])[:30]

                if table_name == "suspicious_activities" and d.get("detected_at") and len(str(d["detected_at"])) > 30:
                    d["detected_at"] = str(d["detected_at"])[:30]

                mappings.append(d)

            pk_col = model_class.__table__.primary_key.columns[0]
            pk_name = pk_col.name
            valid_ids[table_name] = {row[pk_name] for row in mappings if row.get(pk_name) is not None}

            pg.execute(text(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE"))
            pg.bulk_insert_mappings(model_class, mappings)
            pg.commit()
            count = len(mappings)
            total += count
            print(f"  {table_name}: {count} rows")

    pg.close()
    print("-" * 60)
    print(f"\nTotal migrated: {total}")
    print("=" * 60)


if __name__ == "__main__":
    main()
