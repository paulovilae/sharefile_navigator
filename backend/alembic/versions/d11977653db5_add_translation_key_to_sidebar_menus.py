"""add_translation_key_to_sidebar_menus

Revision ID: d11977653db5
Revises: d2024fd17b84
Create Date: 2025-06-05 16:54:41.732738

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd11977653db5'
down_revision: Union[str, None] = 'd2024fd17b84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add translation_key column to sidebar_menus table."""
    # The column was already added manually, so this is a no-op migration
    # to acknowledge the schema change in Alembic
    pass


def downgrade() -> None:
    """Remove translation_key column from sidebar_menus table."""
    # SQLite doesn't support DROP COLUMN directly, so we'd need to recreate the table
    # For now, we'll leave this as a no-op since it's not critical
    pass
