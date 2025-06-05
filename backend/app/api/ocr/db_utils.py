import os
import logging
import datetime
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import create_engine
from app.models import OcrResult, Base, Setting

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ocr.db')

if DATABASE_URL.startswith('sqlite:///'):
    db_path = DATABASE_URL.replace('sqlite:///', '')
    abs_db_path = os.path.abspath(db_path)
    print(f'Using SQLite database at: {abs_db_path}')
    logger.warning(f'Using SQLite database at: {abs_db_path}')

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db_session():
    """Get a database session."""
    return SessionLocal()

def get_setting_value(key: str, default_value: str = None, category: str = None) -> str:
    """
    Get a setting value from the database.
    """
    try:
        db = SessionLocal()
        query = db.query(Setting).filter(Setting.key == key)
        if category:
            query = query.filter(Setting.category == category)
        setting = query.first()
        db.close()
        
        if setting and setting.value:
            return setting.value
        return default_value
    except Exception as e:
        logger.error(f"Error getting setting {key}: {e}")
        return default_value