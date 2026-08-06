"""Users API — async Beanie version."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.worker import Worker
from app.models.customer import Customer
from app.schemas.auth import (
    ProfileUpdateRequest,
    PasswordChangeRequest,
    MessageResponse,
)
from app.services.user_service import UserService
from app.core.config import settings
from app.core.exceptions import BadRequestException

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/search", summary="Search users to start a conversation")
async def search_users(
    q: str = Query("", max_length=100),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    """Search active users by name or profession."""
    query_text = q.strip().lower()
    results = []

    if query_text:
        workers = await Worker.find().to_list()
        workers = [
            w for w in workers
            if w.user_id != current_user.id and (
                query_text in (w.name or "").lower() or query_text in (w.profession or "").lower()
            )
        ]
        workers = workers[:limit]

        customers = await Customer.find().to_list()
        customers = [
            c for c in customers
            if c.user_id != current_user.id and query_text in (c.name or "").lower()
        ]
        customers = customers[:limit]
    else:
        workers = await Worker.find().to_list()
        workers = [w for w in workers if w.user_id != current_user.id]
        workers.sort(key=lambda w: (0 if w.is_online else 1, -(w.rating or 0)))
        workers = workers[:limit]
        customers = []

    for w in workers:
        results.append({"id": w.user_id, "name": w.name, "avatar": w.avatar, "role": "worker", "profession": w.profession})
    for c in customers:
        results.append({"id": c.user_id, "name": c.name, "avatar": c.avatar, "role": "customer", "profession": None})

    seen = set()
    deduped = []
    for item in results:
        if item["id"] not in seen:
            seen.add(item["id"])
            deduped.append(item)

    return {"success": True, "message": "Users retrieved", "data": deduped}


@router.get("/me", summary="Get current user profile")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the authenticated user's profile including role-specific data."""
    service = UserService()
    profile = await service.get_user_with_profile(current_user.id)
    return {"success": True, "message": "Profile retrieved successfully", "data": profile}


@router.put("/update-profile", summary="Update current user profile")
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    """Update the authenticated user's profile data."""
    service = UserService()
    update_data = body.model_dump(exclude_unset=True)
    profile = await service.update_profile(user_id=current_user.id, update_data=update_data)
    return {"success": True, "message": "Profile updated successfully", "data": profile}


@router.post("/change-password", response_model=MessageResponse, summary="Change current password")
async def change_password(
    body: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
):
    """Change the authenticated user's password."""
    service = UserService()
    await service.change_password(
        user_id=current_user.id,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return MessageResponse(message="Password changed successfully")


@router.post("/upload-avatar", summary="Upload avatar image")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a new avatar image for the authenticated user."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise BadRequestException(message="File must be an image")

    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise BadRequestException(message="Invalid image type. Allowed: JPEG, PNG, WebP")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise BadRequestException(message=f"File size exceeds maximum of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB")

    service = UserService()
    avatar_url = await service.upload_avatar(
        user_id=current_user.id, file_content=content, filename=file.filename or "avatar.jpg",
    )
    return {"success": True, "message": "Avatar uploaded successfully", "data": {"avatar_url": avatar_url}}


@router.delete("/delete-avatar", response_model=MessageResponse, summary="Delete avatar image")
async def delete_avatar(current_user: User = Depends(get_current_user)):
    """Delete the authenticated user's avatar image."""
    service = UserService()
    await service.delete_avatar(user_id=current_user.id)
    return MessageResponse(message="Avatar deleted successfully")
