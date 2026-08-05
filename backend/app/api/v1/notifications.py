from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _serialize(n: Notification) -> dict:
    return {
        "id": n.id,
        "user_id": n.user_id,
        "title": n.title,
        "body": n.body,
        "type": n.type,
        "read": n.read,
        "data": n.data,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


@router.get("", summary="Get notifications")
def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    total = query.count()
    items = query.order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "success": True,
        "message": "Notifications retrieved",
        "data": [_serialize(n) for n in items],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/unread-count", summary="Unread notifications count")
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,
    ).count()
    return {"success": True, "message": "Unread count", "data": {"count": count}}


@router.patch("/{notification_id}/read", summary="Mark notification as read")
def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if n is None:
        raise NotFoundException(message="Notification not found")
    n.read = True
    db.commit()
    return {"success": True, "message": "Marked as read", "data": None}


@router.patch("/read-all", summary="Mark all notifications as read")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,
    ).update({"read": True})
    db.commit()
    return {"success": True, "message": "All marked as read", "data": None}


@router.delete("/{notification_id}", summary="Delete notification")
def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if n is None:
        raise NotFoundException(message="Notification not found")
    db.delete(n)
    db.commit()
    return {"success": True, "message": "Notification deleted", "data": None}
