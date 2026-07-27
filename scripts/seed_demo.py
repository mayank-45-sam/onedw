"""
OneDW hackathon demo seed script.
Inserts minimal, realistic data for a live demo.

Usage:
    cd backend
    python -m scripts.seed_demo
"""

import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.db.database import SessionLocal, init_db
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.worker import Worker
from app.models.worker_location import WorkerLocation
from app.models.category import Category
from app.models.service import Service
from app.models.booking import Booking
from app.models.coupon import Coupon
from app.core.security import get_password_hash


def _ensure_columns(db):
    """Add columns that exist in ORM models but may be missing from SQLite."""
    if db.get_bind().dialect.name != "sqlite":
        return
    conn = db.get_bind().raw_connection()
    cursor = conn.cursor()
    for table, col, dtype in [
        ("bookings", "transaction_id", "VARCHAR(100)"),
        ("bookings", "paid_at", "VARCHAR(30)"),
        ("bookings", "refunded_at", "VARCHAR(30)"),
        ("bookings", "refund_reason", "VARCHAR(500)"),
    ]:
        existing = {r[1] for r in cursor.execute(f"PRAGMA table_info({table})").fetchall()}
        if col not in existing:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}")
    conn.commit()


def seed():
    init_db()
    db = SessionLocal()

    try:
        _ensure_columns(db)

        # ── skip if demo data already exists ──
        if db.query(Category).filter(Category.slug == "plumbing").first():
            print("Demo data already exists — skipping seed.")
            return

        pw = get_password_hash("password123")
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # ───────────────────────────
        # 1. CATEGORIES
        # ───────────────────────────
        cats = {}
        for name, slug, icon, color in [
            ("Plumbing", "plumbing", "wrench", "#3b82f6"),
            ("Electrical", "electrical", "zap", "#f59e0b"),
            ("Cleaning", "cleaning", "sparkles", "#10b981"),
            ("AC Repair", "ac-repair", "wind", "#ef4444"),
        ]:
            c = Category(name=name, slug=slug, icon=icon, color=color,
                         description=f"Professional {name.lower()} services")
            db.add(c)
            db.flush()
            cats[slug] = c

        # ───────────────────────────
        # 2. SERVICES
        # ───────────────────────────
        svcs = {}
        for name, slug, cat_slug, price, dur in [
            ("Pipe Repair", "pipe-repair", "plumbing", 50, 60),
            ("Switch Fix", "switch-fix", "electrical", 30, 45),
            ("Deep Cleaning", "deep-cleaning", "cleaning", 80, 120),
            ("AC Service", "ac-service", "ac-repair", 120, 90),
        ]:
            s = Service(
                name=name, slug=slug,
                description=f"Expert {name.lower()} service — fast and reliable.",
                category_id=cats[cat_slug].id,
                base_price=price, duration=dur,
                popular=True,
            )
            db.add(s)
            db.flush()
            svcs[slug] = s

        # ───────────────────────────
        # 3. CUSTOMERS (2)
        # ───────────────────────────
        customers = []
        for email, name in [
            ("alice@demo.com", "Alice Johnson"),
            ("bob@demo.com", "Bob Williams"),
        ]:
            u = User(email=email, phone=None, password_hash=pw,
                     role=UserRole.CUSTOMER, is_active=True, is_verified=True)
            db.add(u)
            db.flush()
            c = Customer(user_id=u.id, name=name,
                         address={"city": "Bangalore", "state": "Karnataka"})
            db.add(c)
            db.flush()
            customers.append(c)

        # ───────────────────────────
        # 4. WORKERS (4)
        # ───────────────────────────
        worker_data = [
            ("Ravi Kumar",   "Plumber",   "plumbing",  4.8, 7, 35.0, (12.9716, 77.5946)),
            ("Suresh Reddy", "Electrician","electrical",4.6, 5, 30.0, (12.9750, 77.5980)),
            ("Priya Sharma", "Cleaner",   "cleaning",  4.9, 4, 25.0, (12.9800, 77.5850)),
            ("Arjun Nair",   "AC Tech",   "ac-repair", 4.3, 3, 40.0, (12.9850, 77.5900)),
        ]

        workers = []
        for wname, prof, cat_slug, rating, exp, rate, (lat, lng) in worker_data:
            u = User(email=f"{wname.split()[0].lower()}@demo.com", phone=None,
                     password_hash=pw, role=UserRole.WORKER,
                     is_active=True, is_verified=True)
            db.add(u)
            db.flush()
            w = Worker(
                user_id=u.id, name=wname, profession=prof,
                bio=f"Experienced {prof.lower()} with {exp}+ years in Bangalore.",
                experience_years=exp, completed_jobs=exp * 12,
                rating=rating, review_count=int(rating * 10),
                hourly_rate=rate, is_online=True,
                category_ids=[cats[cat_slug].id],
            )
            db.add(w)
            db.flush()
            loc = WorkerLocation(worker_id=w.id, latitude=lat, longitude=lng)
            db.add(loc)
            workers.append(w)

        # ───────────────────────────
        # 5. BOOKINGS (2)
        # ───────────────────────────
        addr = {
            "line1": "42 MG Road", "city": "Bangalore",
            "state": "Karnataka", "postalCode": "560001", "country": "India",
            "lat": 12.9758, "lng": 77.5960,
        }

        b1 = Booking(
            customer_id=customers[0].id, worker_id=workers[0].id,
            service_id=svcs["pipe-repair"].id,
            status="completed", payment_status="paid", payment_method="card",
            problem_description="Kitchen sink pipe is leaking badly under the cabinet.",
            problem_images=["/uploads/demo-leak-1.jpg", "/uploads/demo-leak-2.jpg"],
            scheduled_date="2026-07-20", scheduled_time="10:00",
            address=addr, price=50, final_price=50,
            eta_minutes=15, distance_km=2.3,
        )
        db.add(b1)

        b2 = Booking(
            customer_id=customers[1].id, worker_id=workers[1].id,
            service_id=svcs["switch-fix"].id,
            status="pending", payment_status="unpaid", payment_method="upi",
            problem_description="Bedroom light switch not working — no power to the socket.",
            problem_images=[],
            scheduled_date="2026-07-28", scheduled_time="14:30",
            address=addr, price=30, final_price=30,
        )
        db.add(b2)

        # ───────────────────────────
        # 6. COUPONS (2)
        # ───────────────────────────
        db.add(Coupon(
            code="SAVE10", title="Save 10%", description="10% off on any service",
            type="percent", value=10.0, max_discount=20.0, min_order=25.0,
            valid_from=now, valid_until=now + timedelta(days=90),
            usage_limit=100, is_active=True,
        ))
        db.add(Coupon(
            code="NEWUSER", title="New User 15%", description="15% off for first booking",
            type="percent", value=15.0, max_discount=30.0, min_order=20.0,
            valid_from=now, valid_until=now + timedelta(days=180),
            usage_limit=500, is_active=True,
        ))

        db.commit()

        # Update service counts on categories
        for c in db.query(Category).all():
            c.service_count = db.query(Service).filter(Service.category_id == c.id).count()
        db.commit()

        print("Demo seed complete!")
        print(f"  Users:       {db.query(User).count()}")
        print(f"  Customers:   {db.query(Customer).count()}")
        print(f"  Workers:     {db.query(Worker).count()}")
        print(f"  Categories:  {db.query(Category).count()}")
        print(f"  Services:    {db.query(Service).count()}")
        print(f"  Bookings:    {db.query(Booking).count()}")
        print(f"  Coupons:     {db.query(Coupon).count()}")
        print()
        print("Login with: email / password123")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
