from fastapi import APIRouter, Depends, Query, HTTPException
from loguru import logger

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
    _: User = Depends(RequireAdmin),
):
    try:
        result = await fraud_service.analyze_worker(
            worker_id=request.worker_id,
            trigger_reason=request.trigger_reason,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Fraud analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Fraud analysis failed")


@router.get("/report/{worker_id}", response_model=FraudAnalysisResponse)
async def get_fraud_report(
    worker_id: str,
    _: User = Depends(RequireAdmin),
):
    result = await fraud_service.get_fraud_report(worker_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Worker not found")
    return result


@router.get("/high-risk", response_model=HighRiskWorkerResponse)
async def get_high_risk_workers(
    min_score: float = Query(70, ge=0, le=100, description="Minimum fraud score"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _: User = Depends(RequireAdmin),
):
    return await fraud_service.get_high_risk_workers(
        min_score=min_score,
        page=page,
        limit=limit,
    )


@router.get("/status/{worker_id}", response_model=PublicFraudStatus)
async def get_public_fraud_status(
    worker_id: str,
    _: User = Depends(get_optional_user),
):
    return await fraud_service.get_public_fraud_status(worker_id)
