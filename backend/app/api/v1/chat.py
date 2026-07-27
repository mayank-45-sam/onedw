from typing import Optional
from pydantic import Field
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.common import SchemaBase
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/chat", tags=["Chat"])


class NewConversationRequest(SchemaBase):
    participant_id: str


class SendMessageRequest(SchemaBase):
    text: Optional[str] = None
    image: Optional[str] = None


def _serialize_conversation(c: Conversation, current_user_id: str) -> dict:
    return {
        "id": c.id,
        "participants": c.participants or [],
        "last_message_id": c.last_message_id,
        "unread_count": c.unread_count,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
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
        "data": [_serialize_conversation(c, current_user.id) for c in convos],
    }


@router.post("/conversations", status_code=201, summary="Create conversation")
def create_conversation(
    body: NewConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Conversation).filter(
        Conversation.participants.op("LIKE")(f"%{current_user.id}%"),
        Conversation.participants.op("LIKE")(f"%{body.participant_id}%"),
    ).first()
    if existing:
        return {"success": True, "message": "Conversation exists", "data": _serialize_conversation(existing, current_user.id)}
    convo = Conversation(participants=[current_user.id, body.participant_id])
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return {"success": True, "message": "Conversation created", "data": _serialize_conversation(convo, current_user.id)}


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
    )
    db.add(msg)
    convo.last_message_id = None
    db.commit()
    db.refresh(msg)
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
    return {"success": True, "message": "OK", "data": [_serialize_conversation(c, current_user.id) for c in convos]}
