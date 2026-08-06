"""Async Broadcast service — Beanie version."""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional

from loguru import logger
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.socketio import emit_to_user
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


async def resolve_audience_user_ids(audience: str) -> list:
    """Resolve an audience label to the list of recipient user ids."""
    if audience == "all":
        users = await User.find(User.is_active == True, User.role != UserRole.ADMIN).to_list()
        return [u.id for u in users]

    if audience == "customers":
        users = await User.find(User.role == UserRole.CUSTOMER, User.is_active == True).to_list()
        return [u.id for u in users]

    if audience == "workers":
        users = await User.find(User.role == UserRole.WORKER, User.is_active == True).to_list()
        return [u.id for u in users]

    if audience == "verified_workers":
        workers = await Worker.find(Worker.verification_status == "completed").to_list()
        user_ids = [w.user_id for w in workers]
        users = await User.find(User.id.in_(user_ids), User.is_active == True).to_list()
        return [u.id for u in users]

    if audience == "pending_workers":
        workers = await Worker.find().to_list()
        pending_worker_user_ids = [w.user_id for w in workers if w.verification_status != "completed"]
        users = await User.find(User.id.in_(pending_worker_user_ids), User.is_active == True).to_list()
        return [u.id for u in users]

    return []


def _notification_payload(n: Notification) -> dict:
    return {"id": n.id, "title": n.title, "body": n.body, "type": n.type, "read": n.read, "data": n.data}


class BroadcastService:
    @staticmethod
    def serialize(b: Broadcast) -> dict:
        return {
            "id": b.id, "title": b.title, "message": b.message, "audience": b.audience,
            "category": b.category, "priority": b.priority, "status": b.status,
            "scheduled_at": b.scheduled_at.isoformat() if b.scheduled_at else None,
            "sent_at": b.sent_at.isoformat() if b.sent_at else None,
            "sent_by": b.sent_by, "total_recipients": b.total_recipients,
            "delivered_count": b.delivered_count, "failed_count": b.failed_count,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }

    @staticmethod
    async def create_broadcast(admin_user: User, payload: dict) -> Broadcast:
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
            title=title, message=message, audience=audience, category=category, priority=priority,
            status="sent" if schedule_now else "scheduled",
            scheduled_at=scheduled_at, sent_by=admin_user.id,
        )
        await broadcast.insert()

        if schedule_now:
            await BroadcastService.deliver(broadcast)

        return broadcast

    @staticmethod
    async def deliver(broadcast: Broadcast) -> dict:
        """Fan out a broadcast to its audience, creating Notification rows."""
        user_ids = await resolve_audience_user_ids(broadcast.audience)
        broadcast.total_recipients = len(user_ids)
        delivered = 0
        failed = 0

        for uid in user_ids:
            try:
                n = Notification(
                    user_id=uid, title=broadcast.title, body=broadcast.message,
                    type="broadcast", read=False,
                    data={"broadcast_id": broadcast.id, "category": broadcast.category, "priority": broadcast.priority},
                )
                await n.insert()
                emit_to_user(uid, "notification:new", {"notification": _notification_payload(n)})
                delivered += 1
            except Exception as e:
                failed += 1
                logger.warning(f"Broadcast delivery failed for user {uid}: {e}")

        broadcast.delivered_count = delivered
        broadcast.failed_count = failed
        broadcast.status = "sent"
        broadcast.sent_at = _utcnow()
        await broadcast.save()
        return {"delivered": delivered, "failed": failed, "total": len(user_ids)}

    @staticmethod
    async def list_broadcasts(
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        category: Optional[str] = None,
        audience: Optional[str] = None,
    ) -> dict:
        all_b = await Broadcast.find_all().to_list()
        if search:
            term = search.lower()
            all_b = [b for b in all_b if term in (b.title or "").lower() or term in (b.message or "").lower()]
        if category:
            all_b = [b for b in all_b if b.category == category]
        if audience:
            all_b = [b for b in all_b if b.audience == audience]

        all_b.sort(key=lambda b: b.created_at or datetime.min, reverse=True)
        total = len(all_b)
        items = all_b[(page - 1) * limit: page * limit]
        return {
            "success": True, "message": "Broadcasts retrieved",
            "data": [BroadcastService.serialize(b) for b in items],
            "total": total, "page": page, "limit": limit,
            "pages": (total + limit - 1) // limit if total > 0 else 0,
        }

    @staticmethod
    async def stats() -> dict:
        now = _utcnow()
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_week = start_of_day - timedelta(days=start_of_day.weekday())

        all_b = await Broadcast.find_all().to_list()
        sent_today = sum(1 for b in all_b if b.status == "sent" and b.sent_at and b.sent_at >= start_of_day)
        sent_this_week = sum(1 for b in all_b if b.status == "sent" and b.sent_at and b.sent_at >= start_of_week)
        total_broadcasts = len(all_b)
        total_delivered = sum(b.delivered_count or 0 for b in all_b)
        total_attempted = sum(b.total_recipients or 0 for b in all_b)
        success_rate = round(total_delivered * 100 / total_attempted, 1) if total_attempted else 0.0

        return {
            "success": True, "message": "OK",
            "data": {
                "sent_today": sent_today, "sent_this_week": sent_this_week,
                "total_broadcasts": total_broadcasts, "success_rate": success_rate,
                "total_delivered": total_delivered,
            },
        }

    @staticmethod
    async def resend_broadcast(broadcast_id: str) -> Broadcast:
        b = await Broadcast.find_one(Broadcast.id == broadcast_id)
        if b is None:
            raise NotFoundException(message="Broadcast not found")
        await BroadcastService.deliver(b)
        return b

    @staticmethod
    async def delete_broadcast(broadcast_id: str) -> None:
        b = await Broadcast.find_one(Broadcast.id == broadcast_id)
        if b is None:
            raise NotFoundException(message="Broadcast not found")
        # Remove associated notifications
        all_n = await Notification.find_all().to_list()
        for n in all_n:
            if isinstance(n.data, dict) and n.data.get("broadcast_id") == broadcast_id:
                await n.delete()
        await b.delete()


async def dispatch_due_broadcasts() -> None:
    """Send any scheduled broadcasts whose time has arrived."""
    now = _utcnow()
    all_b = await Broadcast.find(Broadcast.status == "scheduled").to_list()
    due = [b for b in all_b if b.scheduled_at and b.scheduled_at <= now]
    for b in due:
        try:
            result = await BroadcastService.deliver(b)
            logger.info(f"Scheduled broadcast {b.id} dispatched ({result['delivered']} delivered)")
        except Exception as e:
            logger.error(f"Failed to dispatch scheduled broadcast {b.id}: {e}")


async def broadcast_scheduler_loop(interval_seconds: int = 30) -> None:
    """Background loop started in the app lifespan for scheduled broadcasts."""
    while True:
        try:
            await dispatch_due_broadcasts()
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Broadcast scheduler error: {e}")
        await asyncio.sleep(interval_seconds)
