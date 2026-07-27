"""add_refund_audit_fields

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-07-26 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('bookings', sa.Column('refunded_at', sa.String(30), nullable=True))
    op.add_column('bookings', sa.Column('refund_reason', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('bookings', 'refund_reason')
    op.drop_column('bookings', 'refunded_at')
