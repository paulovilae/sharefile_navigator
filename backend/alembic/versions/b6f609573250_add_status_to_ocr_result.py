"""add_status_to_ocr_result

Revision ID: b6f609573250
Revises: 514189ac7ce9
Create Date: 2025-05-29 15:38:43.929534

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6f609573250'
down_revision: Union[str, None] = '514189ac7ce9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('ocr_results', sa.Column('status', sa.String(), nullable=True, server_default='pending'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('ocr_results', 'status')
