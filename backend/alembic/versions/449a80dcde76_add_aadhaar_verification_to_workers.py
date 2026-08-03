"""Add Aadhaar verification fields to workers

Revision ID: 449a80dcde76
Revises: c2d3e4f5a6b7
Create Date: 2026-07-31 19:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "449a80dcde76"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("workers", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("aadhaar_number_hash", sa.String(length=64), nullable=True)
        )
        batch_op.add_column(
            sa.Column("aadhaar_verified", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(
            sa.Column("aadhaar_verified_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.create_index(batch_op.f("ix_workers_aadhaar_number_hash"), ["aadhaar_number_hash"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("workers", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_workers_aadhaar_number_hash"))
        batch_op.drop_column("aadhaar_verified_at")
        batch_op.drop_column("aadhaar_verified")
        batch_op.drop_column("aadhaar_number_hash")