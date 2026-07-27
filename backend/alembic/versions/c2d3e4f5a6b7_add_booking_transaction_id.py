"""add_booking_transaction_id_and_paid_at

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-07-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('bookings', sa.Column('transaction_id', sa.String(100), nullable=True))
    op.add_column('bookings', sa.Column('paid_at', sa.String(30), nullable=True))


def downgrade() -> None:
    op.drop_column('bookings', 'paid_at')
    op.drop_column('bookings', 'transaction_id')
