from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from loguru import logger

from app.db.database import get_db
from app.dependencies.auth import get_current_user, get_optional_user
from app.models.user import User
from app.services.image_analysis_service import analyze_image, get_analysis_history
from app.utils.file_upload import save_file

router = APIRouter(prefix="/ai/image-analysis", tags=["AI Image Analysis"])


@router.post("", summary="Analyze a repair image using Gemini Vision")
async def analyze_repair_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    try:
        result = await analyze_image(
            db=db,
            image_bytes=contents,
            mime_type=file.content_type,
            user_id=current_user.id if current_user else None,
        )
        return {"success": True, "data": result}
    except ValueError as e:
        logger.error(f"Image analysis failed: {e}")
        raise HTTPException(status_code=502, detail="AI couldn't analyze the image. Please try again.")
    except Exception as e:
        err_str = str(e)
        logger.error(f"Image analysis error: {e}")
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
            raise HTTPException(
                status_code=429,
                detail="AI quota limit reached. The free Gemini API allows 20 requests/day. Please try again tomorrow or upgrade your Gemini API plan at https://aistudio.google.com"
            )
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")


@router.get("/history", summary="Get image analysis history")
def analysis_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_analysis_history(db, current_user.id, page, limit)
