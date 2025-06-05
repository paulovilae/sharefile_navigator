import sqlite3
import base64
from pathlib import Path
import sys
sys.path.append('.')
from improved_thumbnail_system import ThumbnailManager
import fitz
import tempfile
import os

def generate_thumbnail_for_latest_ocr():
    """Generate thumbnail for the most recently processed OCR result."""
    
    # Get the latest OCR result
    conn = sqlite3.connect('../ocr.db')
    cursor = conn.execute("""
        SELECT file_id, created_at, status 
        FROM ocr_results 
        ORDER BY created_at DESC 
        LIMIT 1
    """)
    
    result = cursor.fetchone()
    if not result:
        print("No OCR results found")
        return
    
    file_id, created_at, status = result
    print(f"Latest OCR result: {file_id} (Status: {status}, Created: {created_at})")
    
    # Check if thumbnail already exists
    cursor = conn.execute("SELECT id FROM thumbnails WHERE file_id = ?", (file_id,))
    if cursor.fetchone():
        print(f"Thumbnail already exists for {file_id}")
        conn.close()
        return
    
    # Try to find the original PDF file from SharePoint or other sources
    # For now, let's create a placeholder thumbnail since we don't have access to the original PDF
    
    manager = ThumbnailManager()
    
    # Create a professional placeholder thumbnail
    thumbnail_data = manager.create_placeholder_thumbnail(file_id)
    
    # Store the thumbnail
    manager.store_thumbnail(file_id, thumbnail_data, 'placeholder', None)
    
    print(f"✅ Generated placeholder thumbnail for {file_id}")
    
    conn.close()

if __name__ == "__main__":
    generate_thumbnail_for_latest_ocr()