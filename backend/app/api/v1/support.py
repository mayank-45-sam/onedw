from fastapi import APIRouter, Depends

from app.models.user import User, UserRole
from app.models.notification import Notification
from app.schemas.support import SupportContactRequest
from app.core.socketio import emit_to_user

router = APIRouter(prefix="/support", tags=["Support"])


@router.post("/contact", summary="Send a support message to the admin team")
async def contact_support(body: SupportContactRequest):
    """Create an admin notification for each message submitted from the Help page."""
    admins = await User.find(
        User.role == UserRole.ADMIN,
        User.is_active == True,
    ).to_list()

    name = body.name.strip()
    subject = body.subject.strip()
    message = body.message.strip()

    for admin in admins:
        notification = Notification(
            user_id=admin.id,
            title="New support message",
            body=f"{name} — {subject}",
            type="support",
            data={
                "name": name,
                "email": body.email,
                "subject": subject,
                "message": message,
            },
        )
        await notification.insert()

        emit_to_user(
            admin.id,
            "notification:new",
            {
                "notification": {
                    "id": notification.id,
                    "title": notification.title,
                    "body": notification.body,
                    "type": notification.type,
                    "read": notification.read,
                    "data": notification.data,
                }
            },
        )

    return {
        "success": True,
        "message": "Message sent successfully",
        "data": {"delivered_to": len(admins)},
    }
