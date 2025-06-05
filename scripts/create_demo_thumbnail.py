#!/usr/bin/env python3
"""
Create a demo thumbnail for testing the thumbnail system.
This creates a simple placeholder thumbnail to demonstrate the system.
"""

import sqlite3
import base64
from PIL import Image, ImageDraw, ImageFont
import io
import os

def create_demo_thumbnail(text="DEMO", size=(150, 200)):
    """Create a simple demo thumbnail with text."""
    # Create a new image with a gradient background
    img = Image.new('RGB', size, color='#4A90E2')
    draw = ImageDraw.Draw(img)
    
    # Try to use a default font, fallback to basic if not available
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except:
        font = ImageFont.load_default()
    
    # Add text
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    
    x = (size[0] - text_width) // 2
    y = (size[1] - text_height) // 2
    
    draw.text((x, y), text, fill='white', font=font)
    
    # Add a border
    draw.rectangle([0, 0, size[0]-1, size[1]-1], outline='white', width=2)
    
    # Convert to base64
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=70, optimize=True)
    thumbnail_data = output.getvalue()
    base64_string = base64.b64encode(thumbnail_data).decode('utf-8')
    
    return base64_string

def main():
    # Database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'ocr.db')
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get records without thumbnails
    cursor.execute("""
        SELECT file_id FROM ocr_results 
        WHERE thumbnail_preview IS NULL 
        AND (pdf_image_path IS NOT NULL OR ocr_image_path IS NOT NULL)
        LIMIT 3
    """)
    
    records = cursor.fetchall()
    
    updated_count = 0
    for record in records:
        file_id = record[0]
        
        # Create a demo thumbnail
        thumbnail_base64 = create_demo_thumbnail(f"PDF\n{file_id[:8]}")
        
        # Update the record
        cursor.execute("""
            UPDATE ocr_results 
            SET thumbnail_preview = ? 
            WHERE file_id = ?
        """, (thumbnail_base64, file_id))
        
        updated_count += 1
        print(f"Created demo thumbnail for {file_id}")
    
    conn.commit()
    conn.close()
    
    print(f"Created {updated_count} demo thumbnails")

if __name__ == "__main__":
    main()