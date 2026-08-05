from typing import Optional
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import RequireAdmin
from app.models.user import User
from app.services.broadcast_service import BroadcastService

router = APIRouter(prefix="/admin/broadcasts", tags=["Admin Broadcasts"])


@router.get("", summary="List broadcasts")
def list_broadcasts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    audience: Optional[str] = Query(None),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    return BroadcastService.list_broadcasts(
        db,
        page=page,
        limit=limit,
        search=search,
        category=category,
        audience=audience,
    )


@router.get("/stats", summary="Broadcast analytics")
def broadcast_stats(
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    return BroadcastService.stats(db)


@router.post("", summary="Send or schedule a broadcast")
def create_broadcast(
    body: dict = Body(...),
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    b = BroadcastService.create_broadcast(db, current_user, body)
    return {
        "success": True,
        "message": "Broadcast sent" if b.status == "sent" else "Broadcast scheduled",
        "data": BroadcastService.serialize(b),
    }


@router.post("/{broadcast_id}/resend", summary="Resend a broadcast")
def resend_broadcast(
    broadcast_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    b = BroadcastService.resend_broadcast(db, broadcast_id)
    return {
        "success": True,
        "message": "Broadcast re-sent",
        "data": BroadcastService.serialize(b),
    }


@router.delete("/{broadcast_id}", summary="Delete a broadcast")
def delete_broadcast(
    broadcast_id: str,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    BroadcastService.delete_broadcast(db, broadcast_id)
    return {"success": True, "message": "Broadcast deleted", "data": None}
