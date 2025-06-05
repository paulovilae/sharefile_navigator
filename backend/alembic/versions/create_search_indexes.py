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
    # Create index on status for filtering processed files
    op.create_index(
        'idx_ocr_results_status',
        'ocr_results',
        ['status']
    )
    
    # Create index on created_at for date range filtering
    op.create_index(
        'idx_ocr_results_created_at',
        'ocr_results',
        ['created_at']
    )
    
    # Create index on file_id for quick lookups
    op.create_index(
        'idx_ocr_results_file_id',
        'ocr_results',
        ['file_id']
    )
    
    # Create composite index for common search patterns
    op.create_index(
        'idx_ocr_results_status_created',
        'ocr_results',
        ['status', 'created_at']
    )
    
    # Create index to quickly find records with images
    op.execute("""
        CREATE INDEX idx_ocr_results_has_images 
        ON ocr_results 
        WHERE pdf_image_path IS NOT NULL OR ocr_image_path IS NOT NULL
    """)

def downgrade():
    """
    Remove the search indexes.
    """
    op.drop_index('idx_ocr_results_status')
    op.drop_index('idx_ocr_results_created_at')
    op.drop_index('idx_ocr_results_file_id')
    op.drop_index('idx_ocr_results_status_created')
    op.drop_index('idx_ocr_results_has_images')