"""add report_url to scores

Revision ID: 0003_add_report_url_to_scores
Revises: 0002_add_scanner_id
Create Date: 2026-06-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0003_add_report_url_to_scores'
down_revision: Union[str, Sequence[str], None] = '0002_add_scanner_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('scores', sa.Column('report_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('scores', 'report_url')
