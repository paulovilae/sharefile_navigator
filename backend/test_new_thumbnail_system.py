#!/usr/bin/env python3
"""
Test script for the new thumbnail generation system.
This script will test generating a real thumbnail from a PDF file.
"""

import sys
import os
sys.path.append('.')

from app.utils.thumbnail_utils import ThumbnailGenerator
import fitz  # PyMuPDF
import tempfile
import base64

def test_thumbnail_generation():
    """Test thumbnail generation with a sample PDF."""
    
    # Create a simple test PDF
    print("Creating test PDF...")
    doc = fitz.open()  # Create new PDF
    page = doc.new_page()
    
    # Add some text to the page
    text = "This is a test PDF document for thumbnail generation."
    point = fitz.Point(50, 100)
    page.insert_text(point, text, fontsize=12)
    
    # Add a rectangle
    rect = fitz.Rect(50, 150, 200, 200)
    page.draw_rect(rect, color=(0, 0, 1), width=2)
    
    # Save to bytes
    pdf_bytes = doc.tobytes()
    doc.close()
    
    print(f"Created test PDF with {len(pdf_bytes)} bytes")
    
    # Test thumbnail generation
    print("\nTesting thumbnail generation...")
    
    # Create thumbnail generator with correct database path
    thumbnail_gen = ThumbnailGenerator("../ocr.db")
    
    # Open PDF and get first page pixmap
    test_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    first_page = test_doc[0]
    
    # Create pixmap
    matrix = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
    pixmap = first_page.get_pixmap(matrix=matrix, alpha=False)
    
    # Generate thumbnail from pixmap
    thumbnail_data = thumbnail_gen.create_thumbnail_from_fitz_pixmap(pixmap)
    
    if thumbnail_data:
        print(f"✅ Successfully generated thumbnail: {len(thumbnail_data)} bytes")
        
        # Save thumbnail to file for inspection
        with open('test_real_thumbnail.jpg', 'wb') as f:
            f.write(thumbnail_data)
        print("💾 Saved thumbnail as test_real_thumbnail.jpg")
        
        # Test storing in database
        test_file_id = "TEST_THUMBNAIL_001"
        thumbnail_gen.store_thumbnail(test_file_id, thumbnail_data, 'pdf', 'test_pixmap')
        print(f"✅ Stored thumbnail in database for file_id: {test_file_id}")
        
        # Test retrieving from database
        retrieved_data = thumbnail_gen.get_db_connection()
        cursor = retrieved_data.execute("SELECT thumbnail_data, source_type FROM thumbnails WHERE file_id = ?", (test_file_id,))
        result = cursor.fetchone()
        retrieved_data.close()
        
        if result:
            retrieved_thumbnail, source_type = result
            print(f"✅ Retrieved thumbnail from database: {len(retrieved_thumbnail)} bytes, source: {source_type}")
            
            # Save retrieved thumbnail
            with open('test_retrieved_thumbnail.jpg', 'wb') as f:
                f.write(retrieved_thumbnail)
            print("💾 Saved retrieved thumbnail as test_retrieved_thumbnail.jpg")
        else:
            print("❌ Failed to retrieve thumbnail from database")
    else:
        print("❌ Failed to generate thumbnail")
    
    test_doc.close()
    
    # Test placeholder generation
    print("\nTesting placeholder generation...")
    placeholder_data = thumbnail_gen.create_placeholder_thumbnail("PLACEHOLDER_TEST_001")
    if placeholder_data:
        print(f"✅ Generated placeholder thumbnail: {len(placeholder_data)} bytes")
        with open('test_placeholder_thumbnail.jpg', 'wb') as f:
            f.write(placeholder_data)
        print("💾 Saved placeholder as test_placeholder_thumbnail.jpg")
    else:
        print("❌ Failed to generate placeholder thumbnail")

if __name__ == "__main__":
    test_thumbnail_generation()