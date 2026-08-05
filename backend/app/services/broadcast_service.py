"""Service for admin notification broadcasts.

Broadcasts are fan-out campaigns: an admin composes a message, picks an
audience + category + priority, and the service creates one ``Notification``
row per recipient (with a realtime Socket.IO push when available). Sent
campaigns are tracked on the ``Broadcast`` row for the history + analytics UI.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional

from loguru import logger
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.socketio import emit_to_user
from app.db.database import SessionLocal
from app.models.broadcast import Broadcast
from app.models.notification import Notification
from app.models.user import User, UserRole
from app.models.worker import Worker

VALID_AUDIENCES = {"all", "customers", "workers", "verified_workers", "pending_workers"}
VALID_CATEGORIES = {"announcement", "maintenance", "emergency", "promotion", "policy"}
VALID_PRIORITIES = {"low", "medium", "high"}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _parse_iso(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except (ValueError, TypeError):
        return None


def resolve_audience_user_ids(db: Session, audience: str) -> list:
    """Resolve an audience label to the list of recipient user ids."""
    if audience == "all":
        rows = db.query(User.id).filter(
            User.is_active == True,
            User.role != UserRole.ADMIN,
        ).all()
        return [r[0] for r in rows]

    if audience == "customers":
        rows = db.query(User.id).filter(
            User.role == UserRole.CUSTOMER,
            User.is_active == True,
        ).all()
        return [r[0] for r in rows]

    if audience == "workers":
        rows = db.query(User.id).filter(
            User.role == UserRole.WORKER,
            User.is_active == True,
        ).all()
        return [r[0] for r in rows]

    if audience == "verified_workers":
        rows = (
            db.query(Worker.user_id)
            .join(User, User.id == Worker.user_id)
            .filter(
                Worker.verification_status == "completed",
                User.is_active == True,
            )
            .all()
        )
        return [r[0] for r in rows]

    if audience == "pending_workers":
        rows = (
            db.query(Worker.user_id)
            .join(User, User.id == Worker.user_id)
            .filter(
                or_(
                    Worker.verification_status.is_(None),
                    Worker.verification_status != "completed",
                ),
                User.is_active == True,
            )
            .all()
        )
        return [r[0] for r in rows]

    return []


def _notification_payload(n: Notification) -> dict:
    return {
        "id": n.id,
        "title": n.title,
        "body": n.body,
        "type": n.type,
        "read": n.read,
        "data": n.data,
    }


class BroadcastService:
    @staticmethod
    def serialize(b: Broadcast) -> dict:
        return {
            "id": b.id,
            "title": b.title,
            "message": b.message,
            "audience": b.audience,
            "category": b.category,
            "priority": b.priority,
            "status": b.status,
            "scheduled_at": b.scheduled_at.isoformat() if b.scheduled_at else None,
            "sent_at": b.sent_at.isoformat() if b.sent_at else None,
            "sent_by": b.sent_by,
            "total_recipients": b.total_recipients,
            "delivered_count": b.delivered_count,
            "failed_count": b.failed_count,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }

    @staticmethod
    def create_broadcast(db: Session, admin_user: User, payload: dict) -> Broadcast:
        title = str(payload.get("title", "")).strip()
        message = str(payload.get("message", "")).strip()
        audience = str(payload.get("audience", "")).strip()
        category = str(payload.get("category", "announcement")).strip()
        priority = str(payload.get("priority", "medium")).strip()
        schedule_now = bool(payload.get("schedule_now", True))

        if not title:
            raise BadRequestException(message="Title is required")
        if len(title) > 255:
            raise BadRequestException(message="Title must be 255 characters or fewer")
        if not message:
            raise BadRequestException(message="Message is required")
        if len(message) > 4000:
            raise BadRequestException(message="Message must be 4000 characters or fewer")
        if audience not in VALID_AUDIENCES:
            raise BadRequestException(message="Invalid audience")
        if category not in VALID_CATEGORIES:
            raise BadRequestException(message="Invalid category")
        if priority not in VALID_PRIORITIES:
            raise BadRequestException(message="Invalid priority")

        scheduled_at = None
        if not schedule_now:
            scheduled_at = _parse_iso(payload.get("scheduled_at"))
            if scheduled_at is None:
                raise BadRequestException(message="Invalid schedule time")
            if scheduled_at <= _utcnow():
                raise BadRequestException(message="Schedule time must be in the future")

        broadcast = Broadcast(
            title=title,
            message=message,
            audience=audience,
            category=category,
            priority=priority,
            status="sent" if schedule_now else "scheduled",
            scheduled_at=scheduled_at,
            sent_by=admin_user.id,
        )
        db.add(broadcast)
        db.flush()

        if schedule_now:
            BroadcastService.deliver(db, broadcast, commit=False)

        db.commit()
        db.refresh(broadcast)
        return broadcast

    @staticmethod
    def deliver(db: Session, broadcast: Broadcast, commit: bool = True) -> dict:
        """Fan out a broadcast to its audience, creating Notification rows."""
        user_ids = resolve_audience_user_ids(db, broadcast.audience)
        broadcast.total_recipients = len(user_ids)
        delivered = 0
        failed = 0

        for uid in user_ids:
            try:
                n = Notification(
                    user_id=uid,
                    title=broadcast.title,
                    body=broadcast.message,
                    type="broadcast",
                    read=False,
                    data={
                        "broadcast_id": broadcast.id,
                        "category": broadcast.category,
                        "priority": broadcast.priority,
                    },
                )
                db.add(n)
                db.flush()
                emit_to_user(uid, "notification:new", {"notification": _notification_payload(n)})
                delivered += 1
            except Exception as e:  # noqa: BLE001
                failed += 1
                logger.warning(f"Broadcast delivery failed for user {uid}: {e}")

        broadcast.delivered_count = delivered
        broadcast.failed_count = failed
        broadcast.status = "sent"
        broadcast.sent_at = _utcnow()

        if commit:
            db.commit()
        return {"delivered": delivered, "failed": failed, "total": len(user_ids)}

    @staticmethod
    def list_broadcasts(
        db: Session,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        category: Optional[str] = None,
        audience: Optional[str] = None,
    ) -> dict:
        query = db.query(Broadcast)
        if search:
            like = f"%{search}%"
            query = query.filter(or_(Broadcast.title.ilike(like), Broadcast.message.ilike(like)))
        if category:
            query = query.filter(Broadcast.category == category)
        if audience:
            query = query.filter(Broadcast.audience == audience)

        total = query.count()
        items = (
            query.order_by(Broadcast.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        return {
            "success": True,
            "message": "Broadcasts retrieved",
            "data": [BroadcastService.serialize(b) for b in items],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit if total > 0 else 0,
        }

    @staticmethod
    def stats(db: Session) -> dict:
        now = _utcnow()
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_week = start_of_day - timedelta(days=start_of_day.weekday())

        sent_today = db.query(Broadcast).filter(
            Broadcast.status == "sent",
            Broadcast.sent_at >= start_of_day,
        ).count()
        sent_this_week = db.query(Broadcast).filter(
            Broadcast.status == "sent",
            Broadcast.sent_at >= start_of_week,
        ).count()
        total_broadcasts = db.query(Broadcast).count()
        total_delivered = db.query(func.coalesce(func.sum(Broadcast.delivered_count), 0)).scalar()
        total_attempted = db.query(func.coalesce(func.sum(Broadcast.total_recipients), 0)).scalar()
        success_rate = round(total_delivered * 100 / total_attempted, 1) if total_attempted else 0.0

        return {
            "success": True,
            "message": "OK",
            "data": {
                "sent_today": sent_today,
                "sent_this_week": sent_this_week,
                "total_broadcasts": total_broadcasts,
                "success_rate": success_rate,
                "total_delivered": total_delivered or 0,
            },
        }

    @staticmethod
    def resend_broadcast(db: Session, broadcast_id: str) -> Broadcast:
        b = db.query(Broadcast).filter(Broadcast.id == broadcast_id).first()
        if b is None:
            raise NotFoundException(message="Broadcast not found")
        BroadcastService.deliver(db, b)
        db.refresh(b)
        return b

    @staticmethod
    def delete_broadcast(db: Session, broadcast_id: str) -> None:
        b = db.query(Broadcast).filter(Broadcast.id == broadcast_id).first()
        if b is None:
            raise NotFoundException(message="Broadcast not found")
        # Remove the notifications that this broadcast delivered to users.
        delivered = db.query(Notification).filter(
            func.json_extract(Notification.data, "$.broadcast_id") == broadcast_id
        ).all()
        for n in delivered:
            db.delete(n)
        db.delete(b)
        db.commit()


def dispatch_due_broadcasts() -> None:
    """Send any scheduled broadcasts whose time has arrived. Runs in the scheduler."""
    db = SessionLocal()
    try:
        now = _utcnow()
        due = db.query(Broadcast).filter(
            Broadcast.status == "scheduled",
            Broadcast.scheduled_at <= now,
        ).all()
        for b in due:
            try:
                result = BroadcastService.deliver(db, b, commit=True)
                logger.info(
                    f"Scheduled broadcast {b.id} dispatched "
                    f"({result['delivered']} delivered, {result['failed']} failed)"
                )
            except Exception as e:  # noqa: BLE001
                logger.error(f"Failed to dispatch scheduled broadcast {b.id}: {e}")
    finally:
        db.close()


async def broadcast_scheduler_loop(interval_seconds: int = 30) -> None:
    """Background loop started in the app lifespan for scheduled broadcasts."""
    while True:
        try:
            await asyncio.to_thread(dispatch_due_broadcasts)
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001
            logger.error(f"Broadcast scheduler error: {e}")
        await asyncio.sleep(interval_seconds)
