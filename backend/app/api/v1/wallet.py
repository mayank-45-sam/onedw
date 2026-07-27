from typing import Optional
from pydantic import Field
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction, TransactionType, TransactionStatus
from app.schemas.common import SchemaBase
from app.core.exceptions import BadRequestException, NotFoundException

router = APIRouter(prefix="/wallet", tags=["Wallet"])


class WithdrawRequest(SchemaBase):
    amount: float = Field(..., gt=0)
    method: str = Field(default="bank_transfer")


class AddFundsRequest(SchemaBase):
    amount: float = Field(..., gt=0)


def _serialize_transaction(t: WalletTransaction) -> dict:
    return {
        "id": t.id,
        "wallet_id": t.wallet_id,
        "user_id": t.user_id,
        "type": t.type.value if t.type else "credit",
        "amount": t.amount,
        "currency": t.currency,
        "status": t.status.value if t.status else "completed",
        "description": t.description,
        "booking_id": t.booking_id,
        "reference": t.reference,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _serialize_wallet(w: Wallet) -> dict:
    return {
        "id": w.id,
        "user_id": w.user_id,
        "balance": w.balance,
        "currency": w.currency,
        "pending_balance": w.pending_balance,
        "total_earnings": w.total_earnings,
        "total_spent": w.total_spent,
        "created_at": w.created_at.isoformat() if w.created_at else None,
        "updated_at": w.updated_at.isoformat() if w.updated_at else None,
    }


def _get_or_create_wallet(db: Session, user_id: str) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if wallet is None:
        wallet = Wallet(user_id=user_id)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet


@router.get("", summary="Get wallet details")
def get_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet = _get_or_create_wallet(db, current_user.id)
    return {
        "success": True,
        "message": "Wallet retrieved successfully",
        "data": _serialize_wallet(wallet),
    }


@router.get("/transactions", summary="Get wallet transactions")
def get_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet = _get_or_create_wallet(db, current_user.id)
    query = db.query(WalletTransaction).filter(WalletTransaction.wallet_id == wallet.id)
    if type in ("credit", "debit"):
        query = query.filter(WalletTransaction.type == TransactionType(type))
    query = query.order_by(WalletTransaction.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()
    return {
        "success": True,
        "message": "Transactions retrieved successfully",
        "data": [_serialize_transaction(t) for t in items],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.post("/withdraw", summary="Withdraw from wallet")
def withdraw(
    body: WithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet = _get_or_create_wallet(db, current_user.id)
    if wallet.balance < body.amount:
        raise BadRequestException(message="Insufficient balance")
    wallet.balance -= body.amount
    wallet.total_spent += body.amount
    txn = WalletTransaction(
        wallet_id=wallet.id,
        user_id=current_user.id,
        type=TransactionType.DEBIT,
        amount=body.amount,
        currency=wallet.currency,
        status=TransactionStatus.COMPLETED,
        description=f"Withdrawal via {body.method}",
    )
    db.add(txn)
    db.commit()
    return {
        "success": True,
        "message": "Withdrawal successful",
        "data": None,
    }


@router.post("/add", summary="Add funds to wallet")
def add_funds(
    body: AddFundsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet = _get_or_create_wallet(db, current_user.id)
    wallet.balance += body.amount
    wallet.total_earnings += body.amount
    txn = WalletTransaction(
        wallet_id=wallet.id,
        user_id=current_user.id,
        type=TransactionType.CREDIT,
        amount=body.amount,
        currency=wallet.currency,
        status=TransactionStatus.COMPLETED,
        description="Funds added",
    )
    db.add(txn)
    db.commit()
    db.refresh(wallet)
    return {
        "success": True,
        "message": "Funds added successfully",
        "data": _serialize_wallet(wallet),
    }
