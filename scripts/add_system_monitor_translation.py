#!/usr/bin/env python
"""
Script to add translations for the System Monitor page.
"""
import os
import sys
import sqlite3
from datetime import datetime

# Add the parent directory to the path so we can import from the backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def add_translation(db_path, key, language, value):
    """Add a translation to the database"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the translation already exists
        cursor.execute(
            "SELECT id FROM localizations WHERE key = ? AND language = ?",
            (key, language)
        )
        existing = cursor.fetchone()
        
        if existing:
            # Update existing translation
            cursor.execute(
                "UPDATE localizations SET value = ?, updated_at = ? WHERE key = ? AND language = ?",
                (value, datetime.utcnow().isoformat(), key, language)
            )
            logger.info(f"Updated translation for {key} ({language}): {value}")
        else:
            # Insert new translation
            cursor.execute(
                "INSERT INTO localizations (key, language, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (key, language, value, datetime.utcnow().isoformat(), datetime.utcnow().isoformat())
            )
            logger.info(f"Added new translation for {key} ({language}): {value}")
        
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error adding translation: {e}")
        return False
    finally:
        if conn:
            conn.close()

def main():
    """Main function"""
    # Database path
    db_path = "ocr.db"
    
    # Translations to add
    translations = [
        # English translations
        ("nav.menu.system_monitor", "en", "System Monitor"),
        
        # Spanish translations
        ("nav.menu.system_monitor", "es", "Monitor de Sistema"),
    ]
    
    # Add translations
    for key, language, value in translations:
        add_translation(db_path, key, language, value)
    
    logger.info("Translations added successfully")

if __name__ == "__main__":
    main()