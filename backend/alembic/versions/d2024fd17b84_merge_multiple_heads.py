"""merge_multiple_heads

Revision ID: d2024fd17b84
Revises: add_batch_processing_table, add_thumbnails_table, b6f609573250, create_search_indexes
Create Date: 2025-06-05 16:52:31.351894

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2024fd17b84'
down_revision: Union[str, None] = ('add_batch_processing_table', 'add_thumbnails_table', 'b6f609573250', 'create_search_indexes')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
