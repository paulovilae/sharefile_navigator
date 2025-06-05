import sqlite3
import base64
from PIL import Image, ImageDraw, ImageFont
import io
import json
from pathlib import Path

def create_placeholder_thumbnail(file_id: str, size: tuple = (150, 200)) -> str:
    """
    Create a proper placeholder thumbnail with the file ID.
    """
    # Create a new image with a light background
    img = Image.new('RGB', size, color='#f5f5f5')
    draw = ImageDraw.Draw(img)
    
    # Try to use a default font, fallback to basic if not available
    try:
        font = ImageFont.truetype("arial.ttf", 12)
        title_font = ImageFont.truetype("arial.ttf", 16)
    except:
        font = ImageFont.load_default()
        title_font = ImageFont.load_default()
    
    # Draw a border
    draw.rectangle([5, 5, size[0]-5, size[1]-5], outline='#cccccc', width=2)
    
    # Draw PDF icon area
    icon_area = [20, 20, size[0]-20, 60]
    draw.rectangle(icon_area, fill='#e3f2fd', outline='#1976d2', width=2)
    
    # Draw "PDF" text
    draw.text((size[0]//2 - 15, 35), "PDF", fill='#1976d2', font=title_font, anchor="mm")
    
    # Draw file ID (truncated if too long)
    file_text = file_id[:20] + "..." if len(file_id) > 20 else file_id
    draw.text((size[0]//2, 80), file_text, fill='#333333', font=font, anchor="mm")
    
    # Draw "Document Preview" text
    draw.text((size[0]//2, 120), "Document Preview", fill='#666666', font=font, anchor="mm")
    draw.text((size[0]//2, 140), "Click to view full PDF", fill='#666666', font=font, anchor="mm")
    
    # Add some decorative elements
    draw.rectangle([30, 160, size[0]-30, 165], fill='#e0e0e0')
    draw.rectangle([30, 170, size[0]-50, 175], fill='#e0e0e0')
    draw.rectangle([30, 180, size[0]-40, 185], fill='#e0e0e0')
    
    # Save to bytes
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=80, optimize=True)
    
    # Convert to base64
    thumbnail_data = output.getvalue()
    base64_string = base64.b64encode(thumbnail_data).decode('utf-8')
    
    return base64_string

def fix_thumbnails():
    """
    Fix thumbnails for records that have invalid or missing thumbnail data.
    """
    conn = sqlite3.connect('../ocr.db')
    
    # Get all records that need thumbnail fixes
    cursor = conn.execute("""
        SELECT file_id, pdf_image_path, ocr_image_path, thumbnail_preview
        FROM ocr_results 
        WHERE status IN ('completed', 'ocr_processed', 'text_extracted', 'OCR Done')
    """)
    
    records = cursor.fetchall()
    updated_count = 0
    
    for record in records:
        file_id, pdf_image_path, ocr_image_path, current_thumbnail = record
        
        # Check if the current thumbnail is based on non-existent files
        needs_update = False
        
        if current_thumbnail:
            # Check if the source files exist
            source_files_exist = False
            
            for path_field in [pdf_image_path, ocr_image_path]:
                if path_field:
                    try:
                        paths = json.loads(path_field)
                        if isinstance(paths, list):
                            for path in paths:
                                if Path(path).exists():
                                    source_files_exist = True
                                    break
                        elif isinstance(paths, str) and Path(paths).exists():
                            source_files_exist = True
                    except:
                        if isinstance(path_field, str) and Path(path_field).exists():
                            source_files_exist = True
                
                if source_files_exist:
                    break
            
            if not source_files_exist:
                needs_update = True
        else:
            needs_update = True
        
        if needs_update:
            # Generate a proper placeholder thumbnail
            new_thumbnail = create_placeholder_thumbnail(file_id)
            
            # Update the record
            conn.execute("""
                UPDATE ocr_results
                SET thumbnail_preview = ?
                WHERE file_id = ?
            """, (new_thumbnail, file_id))
            
            updated_count += 1
            print(f"Updated thumbnail for {file_id}")
    
    conn.commit()
    conn.close()
    
    print(f"Fixed thumbnails for {updated_count} records")
    return updated_count

if __name__ == "__main__":
    fix_thumbnails()