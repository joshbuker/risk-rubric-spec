"""add scanner_id to identity_match_flags

Revision ID: 0002_add_scanner_id
Revises: 5dd7b8f7ebaf
Create Date: 2026-06-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0002_add_scanner_id'
down_revision: Union[str, Sequence[str], None] = '5dd7b8f7ebaf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'identity_match_flags',
        sa.Column('scanner_id', sa.String(), nullable=True),
    )
    op.create_foreign_key(
        'fk_identity_match_flags_scanner_id',
        'identity_match_flags',
        'scanners',
        ['scanner_id'],
        ['id'],
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_identity_match_flags_scanner_id',
        'identity_match_flags',
        type_='foreignkey',
    )
    op.drop_column('identity_match_flags', 'scanner_id')
