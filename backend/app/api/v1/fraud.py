from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from loguru import logger

from app.db.database import get_db
from app.dependencies.auth import RequireAdmin, get_optional_user
from app.models.user import User
from app.schemas.fraud import (
    FraudAnalysisResponse,
    HighRiskWorkerResponse,
    FraudAnalyzeRequest,
    PublicFraudStatus,
)
from app.services import fraud_service

router = APIRouter(prefix="/fraud", tags=["Fraud Detection"])


@router.post("/analyze", response_model=FraudAnalysisResponse)
async def analyze_worker(
    request: FraudAnalyzeRequest,
    db: Session = Depends(get_db),
    _: User = Depends(RequireAdmin),
):
    try:
        result = await fraud_service.analyze_worker(
            worker_id=request.worker_id,
            trigger_reason=request.trigger_reason,
            db=db,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Fraud analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Fraud analysis failed")


@router.get("/report/{worker_id}", response_model=FraudAnalysisResponse)
def get_fraud_report(
    worker_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(RequireAdmin),
):
    result = fraud_service.get_fraud_report(worker_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Worker not found")
    return result


@router.get("/high-risk", response_model=HighRiskWorkerResponse)
def get_high_risk_workers(
    min_score: float = Query(70, ge=0, le=100, description="Minimum fraud score"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(RequireAdmin),
):
    return fraud_service.get_high_risk_workers(
        db=db,
        min_score=min_score,
        page=page,
        limit=limit,
    )


@router.get("/status/{worker_id}", response_model=PublicFraudStatus)
def get_public_fraud_status(
    worker_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_optional_user),
):
    return fraud_service.get_public_fraud_status(worker_id, db)
