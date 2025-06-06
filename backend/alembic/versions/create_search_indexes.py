"""Create search indexes for efficient image search

Revision ID: create_search_indexes
Revises: 4a44a4f6a9cc
Create Date: 2025-06-03 12:43:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'create_search_indexes'
down_revision = '4a44a4f6a9cc'
branch_labels = None
depends_on = None

def upgrade():
    """
    Create indexes to optimize search performance for large databases.
    """
    # Create indexes with IF NOT EXISTS to avoid conflicts
    op.execute("CREATE INDEX IF NOT EXISTS idx_ocr_results_status ON ocr_results (status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_ocr_results_created_at ON ocr_results (created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_ocr_results_file_id ON ocr_results (file_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_ocr_results_status_created ON ocr_results (status, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_ocr_results_has_images ON ocr_results (id) WHERE pdf_image_path IS NOT NULL OR ocr_image_path IS NOT NULL")

def downgrade():
    """
    Remove the search indexes.
    """
    op.drop_index('idx_ocr_results_status')
    op.drop_index('idx_ocr_results_created_at')
    op.drop_index('idx_ocr_results_file_id')
    op.drop_index('idx_ocr_results_status_created')
    op.drop_index('idx_ocr_results_has_images')