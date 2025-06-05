import sqlite3
import os
import logging

logger = logging.getLogger(__name__)

# Database setup
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./ocr.db')

def get_db_connection():
    """Get a raw SQLite connection for direct SQL queries."""
    db_path = DATABASE_URL.replace('sqlite:///', '')
    # Ensure the directory for the database exists if it's a file-based DB
    if db_path and db_path != ':memory:':
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
    return sqlite3.connect(db_path)