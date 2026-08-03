import json
import base64
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from google import genai
from google.genai import types
from loguru import logger

from app.core.config import settings
from app.models.worker import Worker
from app.models.fraud import WorkerFraudData
from app.models.image_analysis import ImageAnalysis


ANALYSIS_PROMPT = """You are a home repair estimation AI. Analyze this image and return a JSON object with EXACTLY these fields (no markdown, no extra text):

{
  "detected_object": "What object is damaged (e.g. fan, water tap, switch board, pipe, AC, TV, washing machine, door lock, window, ceiling fan, motor, furniture)",
  "problem": "Brief description of the problem detected",
  "confidence": 94.0,
  "severity": "low" | "medium" | "high" | "urgent",
  "repair_difficulty": "easy" | "medium" | "hard",
  "estimated_time_minutes": 30,
  "estimated_price_min": 250,
  "estimated_price_max": 450,
  "required_profession": "Plumber" | "Electrician" | "Carpenter" | "AC Technician" | "General Technician",
  "ai_suggestions": [
    "Turn off the main water supply before repair.",
    "This issue may worsen if ignored."
  ]
}

Use Indian Rupee (₹) pricing. Be realistic. Respond with ONLY the JSON object."""


def _get_gemini_client() -> Optional[genai.Client]:
    if not settings.GEMINI_API_KEY:
        return None
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _parse_ai_json(text: str) -> dict:
    """Extract a JSON object from a Gemini response, tolerating code fences and truncation."""
    cleaned = (text or "").strip()
    for prefix in ("```json", "```"):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].rstrip()

    start = cleaned.find("{")
    if start == -1:
        raise ValueError("No JSON object found in AI response")
    cleaned = cleaned[start:]

    for _ in range(10):
        for candidate in (cleaned, cleaned.rstrip() + "}"):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue
        idx = cleaned.rfind(",")
        if idx == -1:
            break
        cleaned = cleaned[:idx]

    raise ValueError("Could not parse AI response as JSON")


def _find_recommended_workers(db: Session, profession: str, limit: int = 3) -> list[dict]:
    profession_keywords = {
        "plumber": ["plumber", "plumbing", "pipe", "water"],
        "electrician": ["electrician", "electrical", "electric", "wiring"],
        "carpenter": ["carpenter", "carpentry", "wood", "furniture"],
        "ac technician": ["ac", "air conditioner", "hvac", "cooling", "refrigeration"],
        "general technician": [],
    }
    keywords = profession_keywords.get(profession.lower(), [])
    workers = db.query(Worker).filter(
        Worker.is_online == True
    ).order_by(Worker.rating.desc(), Worker.completed_jobs.desc()).limit(20).all()

    scored = []
    for w in workers:
        score = 0
        prof_lower = (w.profession or "").lower()
        bio_lower = (w.bio or "").lower()
        for kw in keywords:
            if kw in prof_lower:
                score += 3
            if kw in bio_lower:
                score += 1
        if keywords and score == 0:
            continue
        if not keywords:
            for kw in ["repair", "fix", "maintenance", "technician", "service"]:
                if kw in prof_lower or kw in bio_lower:
                    score += 1

        fd = db.query(WorkerFraudData).filter(WorkerFraudData.worker_id == w.id).first()
        trust_score = 100.0
        risk_level = "low"
        if fd:
            trust_score = max(0, 100.0 - fd.fraud_score)
            risk_level = fd.risk_level

        scored.append({
            "worker_id": w.id,
            "name": w.name,
            "avatar": w.avatar or "",
            "profession": w.profession,
            "rating": w.rating,
            "experience_years": w.experience_years,
            "completed_jobs": w.completed_jobs,
            "hourly_rate": w.hourly_rate,
            "trust_score": trust_score,
            "risk_level": risk_level,
            "estimated_arrival": "30 mins",
            "score": score,
        })

    scored.sort(key=lambda x: (x["trust_score"], x["rating"], x["score"]), reverse=True)
    return scored[:limit]


async def analyze_image(
    db: Session,
    image_bytes: bytes,
    mime_type: str,
    user_id: Optional[str] = None,
) -> dict:
    client = _get_gemini_client()
    if not client:
        raise ValueError("Gemini API not configured. Set GEMINI_API_KEY in .env")

    try:
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[ANALYSIS_PROMPT, image_part],
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=4096,
            ),
        )

        result = _parse_ai_json(response.text or "")

        required = ["detected_object", "problem", "confidence", "severity",
                     "repair_difficulty", "estimated_time_minutes",
                     "estimated_price_min", "estimated_price_max",
                     "required_profession", "ai_suggestions"]
        for key in required:
            if key not in result:
                result[key] = None if key != "ai_suggestions" else []

        profession = result.get("required_profession", "")
        recommended = _find_recommended_workers(db, profession) if profession else []
        result["recommended_workers"] = recommended

        if settings.GEMINI_API_KEY:
            record = ImageAnalysis(
                user_id=user_id,
                image_url="",
                detected_object=result.get("detected_object"),
                problem=result.get("problem"),
                confidence=result.get("confidence"),
                severity=result.get("severity"),
                repair_difficulty=result.get("repair_difficulty"),
                estimated_time_minutes=result.get("estimated_time_minutes"),
                estimated_price_min=result.get("estimated_price_min"),
                estimated_price_max=result.get("estimated_price_max"),
                required_profession=profession,
                ai_suggestions=result.get("ai_suggestions", []),
                recommended_workers=recommended,
                raw_response=result,
                created_at=datetime.now(timezone.utc),
            )
            db.add(record)
            db.commit()
            db.refresh(record)
            result["id"] = record.id

        return result

    except json.JSONDecodeError as e:
        logger.error(f"Gemini response parse error: {e}")
        raise ValueError(f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise


def get_analysis_history(db: Session, user_id: str, page: int = 1, limit: int = 20) -> dict:
    query = db.query(ImageAnalysis).filter(
        ImageAnalysis.user_id == user_id
    ).order_by(ImageAnalysis.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "data": [
            {
                "id": a.id,
                "image_url": a.image_url,
                "detected_object": a.detected_object,
                "problem": a.problem,
                "confidence": a.confidence,
                "severity": a.severity,
                "estimated_price_min": a.estimated_price_min,
                "estimated_price_max": a.estimated_price_max,
                "required_profession": a.required_profession,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in items
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }
