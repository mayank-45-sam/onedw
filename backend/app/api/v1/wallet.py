"""Wallet API — async Beanie version."""
from __future__ import annotations

from typing import Optional
from datetime import datetime, timezone

from pydantic import Field
from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction, TransactionType, TransactionStatus
from app.schemas.common import SchemaBase
from app.core.exceptions import BadRequestException

router = APIRouter(prefix="/wallet", tags=["Wallet"])


class WithdrawRequest(SchemaBase):
    amount: float = Field(..., gt=0)
    method: str = Field(default="bank_transfer")


class AddFundsRequest(SchemaBase):
    amount: float = Field(..., gt=0)


def _serialize_transaction(t: WalletTransaction) -> dict:
    return {
        "id": t.id, "wallet_id": t.wallet_id, "user_id": t.user_id,
        "type": t.type.value if t.type else "credit",
        "amount": t.amount, "currency": getattr(t, "currency", "INR"),
        "status": t.status.value if t.status else "completed",
        "description": t.description, "booking_id": getattr(t, "booking_id", None),
        "reference": getattr(t, "reference", None),
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _serialize_wallet(w: Wallet) -> dict:
    return {
        "id": w.id, "user_id": w.user_id, "balance": w.balance,
        "currency": getattr(w, "currency", "INR"),
        "pending_balance": getattr(w, "pending_balance", 0.0),
        "total_earnings": getattr(w, "total_earnings", 0.0),
        "total_spent": getattr(w, "total_spent", 0.0),
        "created_at": w.created_at.isoformat() if w.created_at else None,
        "updated_at": w.updated_at.isoformat() if w.updated_at else None,
    }


async def _get_or_create_wallet(user_id: str) -> Wallet:
    wallet = await Wallet.find_one(Wallet.user_id == user_id)
    if wallet is None:
        wallet = Wallet(user_id=user_id, balance=0.0)
        await wallet.insert()
    return wallet


@router.get("", summary="Get wallet details")
async def get_wallet(current_user: User = Depends(get_current_user)):
    wallet = await _get_or_create_wallet(current_user.id)
    return {"success": True, "message": "Wallet retrieved successfully", "data": _serialize_wallet(wallet)}


@router.get("/transactions", summary="Get wallet transactions")
async def get_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    wallet = await _get_or_create_wallet(current_user.id)
    all_txns = await WalletTransaction.find(WalletTransaction.wallet_id == wallet.id).to_list()
    if type in ("credit", "debit"):
        all_txns = [t for t in all_txns if (t.type.value if t.type else "") == type]
    all_txns.sort(key=lambda t: t.created_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    total = len(all_txns)
    items = all_txns[(page - 1) * limit: page * limit]
    return {
        "success": True, "message": "Transactions retrieved successfully",
        "data": [_serialize_transaction(t) for t in items],
        "total": total, "page": page, "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.post("/withdraw", summary="Withdraw from wallet")
async def withdraw(body: WithdrawRequest, current_user: User = Depends(get_current_user)):
    wallet = await _get_or_create_wallet(current_user.id)
    if (wallet.balance or 0) < body.amount:
        raise BadRequestException(message="Insufficient balance")
    wallet.balance = (wallet.balance or 0) - body.amount
    wallet.total_spent = (getattr(wallet, "total_spent", 0) or 0) + body.amount
    await wallet.save()
    txn = WalletTransaction(
        wallet_id=wallet.id, user_id=current_user.id,
        type=TransactionType.DEBIT, amount=body.amount,
        currency=getattr(wallet, "currency", "INR"),
        status=TransactionStatus.COMPLETED,
        description=f"Withdrawal via {body.method}",
    )
    await txn.insert()
    return {"success": True, "message": "Withdrawal successful", "data": None}


@router.post("/add", summary="Add funds to wallet")
async def add_funds(body: AddFundsRequest, current_user: User = Depends(get_current_user)):
    wallet = await _get_or_create_wallet(current_user.id)
    wallet.balance = (wallet.balance or 0) + body.amount
    wallet.total_earnings = (getattr(wallet, "total_earnings", 0) or 0) + body.amount
    await wallet.save()
    txn = WalletTransaction(
        wallet_id=wallet.id, user_id=current_user.id,
        type=TransactionType.CREDIT, amount=body.amount,
        currency=getattr(wallet, "currency", "INR"),
        status=TransactionStatus.COMPLETED, description="Funds added",
    )
    await txn.insert()
    return {"success": True, "message": "Funds added successfully", "data": _serialize_wallet(wallet)}
