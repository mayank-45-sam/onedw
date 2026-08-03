from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.notification import Notification
from app.schemas.support import SupportContactRequest
from app.core.socketio import emit_to_user

router = APIRouter(prefix="/support", tags=["Support"])


@router.post("/contact", summary="Send a support message to the admin team")
def contact_support(body: SupportContactRequest, db: Session = Depends(get_db)):
    """Create an admin notification for each message submitted from the Help page."""
    admins = (
        db.query(User)
        .filter(User.role == UserRole.ADMIN, User.is_active == True)
        .all()
    )

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
        db.add(notification)
        db.flush()

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

    db.commit()

    return {
        "success": True,
        "message": "Message sent successfully",
        "data": {"delivered_to": len(admins)},
    }
