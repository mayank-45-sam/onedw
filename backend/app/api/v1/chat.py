from typing import Optional
from pydantic import Field
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.common import SchemaBase
from app.core.exceptions import NotFoundException, BadRequestException
from app.core.socketio import emit_to_user

router = APIRouter(prefix="/chat", tags=["Chat"])


class NewConversationRequest(SchemaBase):
    participant_id: str


class SendMessageRequest(SchemaBase):
    text: Optional[str] = None
    image: Optional[str] = None
    voice_note: Optional[dict] = None
    attachments: Optional[list] = None


def _user_info(db: Session, user_id: str) -> dict:
    """Build the lightweight participant object the frontend renders."""
    user = db.get(User, user_id)
    if user is None:
        return {"id": user_id, "name": "User", "avatar": None, "role": None, "profession": None}

    profile = (
        user.customer_profile
        or user.worker_profile
        or user.admin_profile
    )
    return {
        "id": user.id,
        "name": profile.name if profile else user.email,
        "avatar": profile.avatar if profile else None,
        "role": user.role.value if user.role else None,
        "profession": user.worker_profile.profession if user.worker_profile else None,
    }


def _serialize_message(m: Message) -> dict:
    return {
        "id": m.id,
        "conversation_id": m.conversation_id,
        "sender_id": m.sender_id,
        "receiver_id": m.receiver_id,
        "text": m.text,
        "image": m.image,
        "voice_note": m.voice_note,
        "attachments": m.attachments or [],
        "status": m.status,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _serialize_conversation(c: Conversation, db: Session, current_user_id: str) -> dict:
    last_message = None
    if c.last_message_id:
        m = db.get(Message, c.last_message_id)
        if m is not None:
            last_message = _serialize_message(m)

    return {
        "id": c.id,
        "participants": [
            _user_info(db, pid) for pid in (c.participants or [])
            if pid != current_user_id
        ],
        "last_message": last_message,
        "unread_count": c.unread_count,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("/conversations", summary="List conversations")
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    convos = db.query(Conversation).filter(
        Conversation.participants.op("LIKE")(f"%{current_user.id}%")
    ).order_by(Conversation.updated_at.desc()).all()
    return {
        "success": True,
        "message": "Conversations retrieved",
        "data": [_serialize_conversation(c, db, current_user.id) for c in convos],
    }


@router.post("/conversations", status_code=201, summary="Create conversation")
def create_conversation(
    body: NewConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.participant_id == current_user.id:
        raise BadRequestException(message="Cannot start a conversation with yourself")

    target = db.get(User, body.participant_id)
    if target is None or not target.is_active:
        raise NotFoundException(message="User not found")

    existing = db.query(Conversation).filter(
        Conversation.participants.op("LIKE")(f"%{current_user.id}%"),
        Conversation.participants.op("LIKE")(f"%{body.participant_id}%"),
    ).first()
    if existing:
        return {"success": True, "message": "Conversation exists", "data": _serialize_conversation(existing, db, current_user.id)}
    convo = Conversation(participants=[current_user.id, body.participant_id])
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return {"success": True, "message": "Conversation created", "data": _serialize_conversation(convo, db, current_user.id)}


@router.get("/conversations/{conversation_id}/messages", summary="Get messages")
def get_messages(
    conversation_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if convo is None:
        raise NotFoundException(message="Conversation not found")
    query = db.query(Message).filter(Message.conversation_id == conversation_id)
    total = query.count()
    messages = query.order_by(Message.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "success": True,
        "message": "Messages retrieved",
        "data": [_serialize_message(m) for m in reversed(messages)],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.post("/conversations/{conversation_id}/messages", status_code=201, summary="Send message")
def send_message(
    conversation_id: str,
    body: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if convo is None:
        raise NotFoundException(message="Conversation not found")
    participants = convo.participants or []
    receiver_id = [p for p in participants if p != current_user.id]
    if not receiver_id:
        receiver_id = [current_user.id]
    msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        receiver_id=receiver_id[0],
        text=body.text,
        image=body.image,
        voice_note=body.voice_note,
        attachments=body.attachments or [],
    )
    db.add(msg)
    db.flush()
    convo.last_message_id = msg.id
    convo.unread_count = (convo.unread_count or 0) + 1
    convo.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)
    payload = {"conversation_id": conversation_id, "message": _serialize_message(msg)}
    if receiver_id[0] != current_user.id:
        emit_to_user(receiver_id[0], "chat:message", payload)
    emit_to_user(current_user.id, "chat:message", payload)
    return {"success": True, "message": "Message sent", "data": _serialize_message(msg)}


@router.patch("/conversations/{conversation_id}/read", summary="Mark conversation as read")
def mark_read(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if convo is None:
        raise NotFoundException(message="Conversation not found")
    convo.unread_count = 0
    db.commit()
    return {"success": True, "message": "Marked as read", "data": None}


@router.get("/search", summary="Search conversations")
def search_conversations(
    q: str = Query("", max_length=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    convos = db.query(Conversation).filter(
        Conversation.participants.op("LIKE")(f"%{current_user.id}%")
    ).all()
    return {"success": True, "message": "OK", "data": [_serialize_conversation(c, db, current_user.id) for c in convos]}
