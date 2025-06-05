"""Add thumbnails table for better image management

Revision ID: add_thumbnails_table
Revises: 4a44a4f6a9cc
Create Date: 2025-06-03 14:38:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_thumbnails_table'
down_revision = '4a44a4f6a9cc'
branch_labels = None
depends_on = None

def upgrade():
    # Create thumbnails table
    op.create_table(
        'thumbnails',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('file_id', sa.String(), nullable=False, index=True),
        sa.Column('thumbnail_data', sa.LargeBinary(), nullable=False),
        sa.Column('thumbnail_format', sa.String(10), nullable=False, default='JPEG'),
        sa.Column('width', sa.Integer(), nullable=False, default=150),
        sa.Column('height', sa.Integer(), nullable=False, default=200),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('source_type', sa.String(20), nullable=False),  # 'pdf', 'image', 'placeholder'
        sa.Column('source_path', sa.Text(), nullable=True),  # Original file path if available
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('file_id', name='uq_thumbnails_file_id')
    )
    
    # Create index for faster lookups
    op.create_index('ix_thumbnails_file_id', 'thumbnails', ['file_id'])
    op.create_index('ix_thumbnails_source_type', 'thumbnails', ['source_type'])

def downgrade():
    op.drop_index('ix_thumbnails_source_type', table_name='thumbnails')
    op.drop_index('ix_thumbnails_file_id', table_name='thumbnails')
    op.drop_table('thumbnails')