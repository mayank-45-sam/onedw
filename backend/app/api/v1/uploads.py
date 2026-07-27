from fastapi import APIRouter, Depends, Form, UploadFile, File

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.utils.file_upload import save_file

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post(
    "",
    summary="Upload an image file",
)
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form("general"),
    current_user: User = Depends(get_current_user),
):
    """Upload an image (jpg, jpeg, png, webp, gif). Max 5MB."""
    result = await save_file(file, folder=folder)
    return {
        "success": True,
        "message": "File uploaded successfully",
        "data": {
            "url": result["url"],
            "publicId": result["publicId"],
            "mimeType": result["mimeType"],
            "size": result["size"],
        },
    }
