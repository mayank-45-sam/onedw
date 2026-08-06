"""AI Chat API — async Beanie version."""
from __future__ import annotations

import json
import base64
from typing import Optional
from datetime import datetime, timezone

from pydantic import Field
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.ai_chat import ChatSession, ChatMessage
from app.models.category import Category
from app.schemas.common import SchemaBase
from app.services.ai_chat import stream_chat, service_assistant, analyze_image_vision
from app.core.exceptions import NotFoundException, BadRequestException

router = APIRouter(prefix="/ai", tags=["AI Chat"])


async def _available_categories() -> list:
    cats = await Category.find_all().to_list()
    return sorted([c.name for c in cats if c.name])


class ChatRequest(SchemaBase):
    session_id: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=2000)
    language: str = Field(default="en", pattern="^(en|hi|ta)$")


class ServiceAssistantRequest(SchemaBase):
    problem: str = Field(..., min_length=1, max_length=2000)
    language: str = Field(default="en", pattern="^(en|hi|ta)$")


def _serialize_session(s: ChatSession) -> dict:
    return {
        "id": s.id, "title": s.title, "language": s.language,
        "message_count": len(s.messages) if s.messages else 0,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def _serialize_message(m: ChatMessage) -> dict:
    return {
        "id": m.id, "role": m.role, "content": m.content,
        "tokens_used": getattr(m, "tokens_used", None),
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


@router.post("/chat", summary="Chat with AI assistant (streaming)")
async def chat(body: ChatRequest, current_user: User = Depends(get_current_user)):
    # Get or create session
    if body.session_id:
        session = await ChatSession.find_one(
            ChatSession.id == body.session_id,
            ChatSession.user_id == current_user.id,
        )
        if not session:
            raise NotFoundException(message="Chat session not found")
    else:
        session = ChatSession(
            user_id=current_user.id, language=body.language,
            title="New Conversation", messages=[],
        )
        await session.insert()

    # Save user message
    user_msg = ChatMessage(session_id=session.id, role="user", content=body.message,
                           created_at=datetime.now(timezone.utc))
    await user_msg.insert()

    # Build history (last 20 messages)
    all_msgs = await ChatMessage.find(ChatMessage.session_id == session.id).to_list()
    all_msgs.sort(key=lambda m: m.created_at or datetime.min.replace(tzinfo=timezone.utc))
    history = all_msgs[-20:]
    llm_messages = [{"role": m.role, "content": m.content} for m in history]

    async def generate():
        full_response = []
        categories = await _available_categories()
        async for chunk in stream_chat(llm_messages, language=body.language, available_categories=categories):
            full_response.append(chunk)
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

        content = "".join(full_response)
        assistant_msg = ChatMessage(
            session_id=session.id, role="assistant", content=content,
            created_at=datetime.now(timezone.utc),
        )
        await assistant_msg.insert()

        if session.title == "New Conversation":
            session.title = body.message[:80] + ("..." if len(body.message) > 80 else "")
            session.updated_at = datetime.now(timezone.utc)
            await session.save()

        yield f"data: {json.dumps({'type': 'done', 'session_id': session.id})}\n\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.get("/history", summary="Get chat history (sessions)")
async def get_sessions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    all_sessions = await ChatSession.find(ChatSession.user_id == current_user.id).to_list()
    all_sessions.sort(key=lambda s: s.updated_at or s.created_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    total = len(all_sessions)
    sessions = all_sessions[(page - 1) * limit: page * limit]
    return {
        "success": True,
        "data": [_serialize_session(s) for s in sessions],
        "total": total, "page": page, "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/history/{session_id}", summary="Get session messages")
async def get_session_messages(session_id: str, current_user: User = Depends(get_current_user)):
    session = await ChatSession.find_one(
        ChatSession.id == session_id, ChatSession.user_id == current_user.id,
    )
    if not session:
        raise NotFoundException(message="Chat session not found")
    messages = await ChatMessage.find(ChatMessage.session_id == session_id).to_list()
    messages.sort(key=lambda m: m.created_at or datetime.min.replace(tzinfo=timezone.utc))
    return {
        "success": True,
        "data": {"session": _serialize_session(session), "messages": [_serialize_message(m) for m in messages]},
    }


@router.delete("/history/{session_id}", summary="Delete a chat session")
async def delete_session(session_id: str, current_user: User = Depends(get_current_user)):
    session = await ChatSession.find_one(
        ChatSession.id == session_id, ChatSession.user_id == current_user.id,
    )
    if not session:
        raise NotFoundException(message="Chat session not found")
    # Delete all messages in session
    msgs = await ChatMessage.find(ChatMessage.session_id == session_id).to_list()
    for m in msgs:
        await m.delete()
    await session.delete()
    return {"success": True, "message": "Chat session deleted", "data": None}


@router.post("/service-assistant", summary="Get service assistance for a problem")
async def service_assistant_endpoint(
    body: ServiceAssistantRequest,
    current_user: User = Depends(get_current_user),
):
    categories = await _available_categories()
    result = await service_assistant(body.problem, language=body.language, available_categories=categories)
    return {"success": True, "data": result}


@router.post("/transcribe", summary="Transcribe voice audio (speech-to-text)")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")
    data = await file.read()
    if not data:
        raise BadRequestException(message="Empty audio file")
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio too large (max 10MB)")
    from app.services.verification_service import transcribe_audio
    text = transcribe_audio(data, file.content_type or "audio/webm")
    if not text:
        raise HTTPException(status_code=502, detail="Speech-to-text is temporarily unavailable. Please type your message.")
    return {"success": True, "data": {"text": text}}


@router.post("/analyze-image", summary="Analyze an image using Vision API")
async def analyze_image_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")
    b64 = base64.b64encode(contents).decode("utf-8")
    image_data = f"data:{file.content_type};base64,{b64}"
    result = await analyze_image_vision(image_data)
    return {"success": True, "data": result}
