import uuid
from pathlib import Path
from fastapi import UploadFile

from app.core.exceptions import BadRequestException
from app.core.config import settings
from app.utils.paths import ensure_directory

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def _get_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


async def save_file(
    file: UploadFile,
    folder: str = "general",
) -> dict:
    """Save an uploaded file and return its metadata."""

    ext = _get_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise BadRequestException(
            message=f"File type '.{ext}' not allowed. Use: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise BadRequestException(
            message=f"Content type '{file.content_type}' not allowed"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise BadRequestException(message="File too large. Maximum size is 5MB")

    folder_path = ensure_directory(Path(settings.UPLOAD_DIR) / folder)
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = folder_path / filename
    filepath.write_bytes(content)

    url = f"/uploads/{folder}/{filename}"
    public_id = f"{folder}/{uuid.uuid4().hex}"

    return {
        "url": url,
        "publicId": public_id,
        "mimeType": file.content_type or f"image/{ext}",
        "size": len(content),
    }
