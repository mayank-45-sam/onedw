"""Chat API — async Beanie version."""
from __future__ import annotations

from typing import Optional
from datetime import datetime, timezone

from pydantic import Field
from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.customer import Customer
from app.models.worker import Worker
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


async def _user_info(user_id: str) -> dict:
    """Build the lightweight participant object the frontend renders."""
    user = await User.find_one(User.id == user_id)
    if user is None:
        return {"id": user_id, "name": "User", "avatar": None, "role": None, "profession": None}
    name = user.email
    avatar = None
    profession = None
    role = user.role.value if user.role else None
    if role == "customer":
        p = await Customer.find_one(Customer.user_id == user_id)
        if p:
            name = p.name or user.email
            avatar = p.avatar
    elif role == "worker":
        p = await Worker.find_one(Worker.user_id == user_id)
        if p:
            name = p.name or user.email
            avatar = p.avatar
            profession = p.profession
    return {"id": user.id, "name": name, "avatar": avatar, "role": role, "profession": profession}


def _serialize_message(m: Message) -> dict:
    return {
        "id": m.id, "conversation_id": m.conversation_id,
        "sender_id": m.sender_id, "receiver_id": m.receiver_id,
        "text": m.text, "image": m.image, "voice_note": m.voice_note,
        "attachments": m.attachments or [], "status": m.status,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


async def _serialize_conversation(c: Conversation, current_user_id: str) -> dict:
    last_message = None
    if c.last_message_id:
        lm = await Message.find_one(Message.id == c.last_message_id)
        if lm:
            last_message = _serialize_message(lm)

    participants_data = []
    for pid in (c.participants or []):
        if pid != current_user_id:
            participants_data.append(await _user_info(pid))

    return {
        "id": c.id, "participants": participants_data,
        "last_message": last_message, "unread_count": c.unread_count,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("/conversations", summary="List conversations")
async def list_conversations(current_user: User = Depends(get_current_user)):
    all_convos = await Conversation.find_all().to_list()
    convos = [c for c in all_convos if current_user.id in (c.participants or [])]
    convos.sort(key=lambda c: c.updated_at or c.created_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    data = [await _serialize_conversation(c, current_user.id) for c in convos]
    return {"success": True, "message": "Conversations retrieved", "data": data}


@router.post("/conversations", status_code=201, summary="Create conversation")
async def create_conversation(
    body: NewConversationRequest,
    current_user: User = Depends(get_current_user),
):
    if body.participant_id == current_user.id:
        raise BadRequestException(message="Cannot start a conversation with yourself")
    target = await User.find_one(User.id == body.participant_id)
    if target is None or not target.is_active:
        raise NotFoundException(message="User not found")

    # Check for existing conversation
    all_convos = await Conversation.find_all().to_list()
    existing = next(
        (c for c in all_convos
         if current_user.id in (c.participants or []) and body.participant_id in (c.participants or [])),
        None
    )
    if existing:
        return {"success": True, "message": "Conversation exists",
                "data": await _serialize_conversation(existing, current_user.id)}

    convo = Conversation(
        participants=[current_user.id, body.participant_id],
        unread_count=0, created_at=datetime.now(timezone.utc),
    )
    await convo.insert()
    return {"success": True, "message": "Conversation created",
            "data": await _serialize_conversation(convo, current_user.id)}


@router.get("/conversations/{conversation_id}/messages", summary="Get messages")
async def get_messages(
    conversation_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    convo = await Conversation.find_one(Conversation.id == conversation_id)
    if convo is None:
        raise NotFoundException(message="Conversation not found")
    all_msgs = await Message.find(Message.conversation_id == conversation_id).to_list()
    all_msgs.sort(key=lambda m: m.created_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    total = len(all_msgs)
    messages = all_msgs[(page - 1) * limit: page * limit]
    return {
        "success": True, "message": "Messages retrieved",
        "data": [_serialize_message(m) for m in reversed(messages)],
        "total": total, "page": page, "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.post("/conversations/{conversation_id}/messages", status_code=201, summary="Send message")
async def send_message(
    conversation_id: str,
    body: SendMessageRequest,
    current_user: User = Depends(get_current_user),
):
    convo = await Conversation.find_one(Conversation.id == conversation_id)
    if convo is None:
        raise NotFoundException(message="Conversation not found")
    participants = convo.participants or []
    others = [p for p in participants if p != current_user.id]
    receiver_id = others[0] if others else current_user.id

    msg = Message(
        conversation_id=conversation_id, sender_id=current_user.id,
        receiver_id=receiver_id, text=body.text, image=body.image,
        voice_note=body.voice_note, attachments=body.attachments or [],
        status="sent", created_at=datetime.now(timezone.utc),
    )
    await msg.insert()

    convo.last_message_id = msg.id
    convo.unread_count = (convo.unread_count or 0) + 1
    convo.updated_at = datetime.now(timezone.utc)
    await convo.save()

    payload = {"conversation_id": conversation_id, "message": _serialize_message(msg)}
    if receiver_id != current_user.id:
        emit_to_user(receiver_id, "chat:message", payload)
    emit_to_user(current_user.id, "chat:message", payload)
    return {"success": True, "message": "Message sent", "data": _serialize_message(msg)}


@router.patch("/conversations/{conversation_id}/read", summary="Mark conversation as read")
async def mark_read(conversation_id: str, current_user: User = Depends(get_current_user)):
    convo = await Conversation.find_one(Conversation.id == conversation_id)
    if convo is None:
        raise NotFoundException(message="Conversation not found")
    convo.unread_count = 0
    await convo.save()
    return {"success": True, "message": "Marked as read", "data": None}


@router.get("/search", summary="Search conversations")
async def search_conversations(
    q: str = Query("", max_length=100),
    current_user: User = Depends(get_current_user),
):
    all_convos = await Conversation.find_all().to_list()
    convos = [c for c in all_convos if current_user.id in (c.participants or [])]
    data = [await _serialize_conversation(c, current_user.id) for c in convos]
    return {"success": True, "message": "OK", "data": data}
