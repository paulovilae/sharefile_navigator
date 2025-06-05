import sqlite3
import base64
from PIL import Image, ImageDraw, ImageFont
import io
import json
from pathlib import Path
import fitz  # PyMuPDF
from datetime import datetime
import hashlib

class ThumbnailManager:
    def __init__(self, db_path='../ocr.db'):
        self.db_path = db_path
    
    def get_db_connection(self):
        return sqlite3.connect(self.db_path)
    
    def create_thumbnail_from_pdf(self, pdf_path: str, size: tuple = (150, 200)) -> bytes:
        """Create thumbnail from PDF file."""
        try:
            if not Path(pdf_path).exists():
                return None
                
            pdf_document = fitz.open(pdf_path)
            page = pdf_document[0]  # First page
            
            # Render page to image
            mat = fitz.Matrix(1.0, 1.0)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image
            img_data = pix.tobytes("ppm")
            img = Image.open(io.BytesIO(img_data))
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Create thumbnail maintaining aspect ratio
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Save to bytes
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=80, optimize=True)
            
            pdf_document.close()
            return output.getvalue()
            
        except Exception as e:
            print(f"Error creating PDF thumbnail: {e}")
            return None
    
    def create_thumbnail_from_image(self, image_path: str, size: tuple = (150, 200)) -> bytes:
        """Create thumbnail from image file."""
        try:
            if not Path(image_path).exists():
                return None
                
            with Image.open(image_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Create thumbnail maintaining aspect ratio
                img.thumbnail(size, Image.Resampling.LANCZOS)
                
                # Save to bytes
                output = io.BytesIO()
                img.save(output, format='JPEG', quality=80, optimize=True)
                
                return output.getvalue()
                
        except Exception as e:
            print(f"Error creating image thumbnail: {e}")
            return None
    
    def create_placeholder_thumbnail(self, file_id: str, size: tuple = (150, 200)) -> bytes:
        """Create a professional placeholder thumbnail."""
        img = Image.new('RGB', size, color='#f8f9fa')
        draw = ImageDraw.Draw(img)
        
        # Try to use a default font
        try:
            font = ImageFont.truetype("arial.ttf", 10)
            title_font = ImageFont.truetype("arial.ttf", 14)
        except:
            font = ImageFont.load_default()
            title_font = ImageFont.load_default()
        
        # Draw border
        draw.rectangle([2, 2, size[0]-2, size[1]-2], outline='#dee2e6', width=1)
        
        # Draw header area
        header_height = 40
        draw.rectangle([8, 8, size[0]-8, header_height], fill='#e3f2fd', outline='#1976d2', width=1)
        
        # Draw PDF icon and text
        draw.text((size[0]//2, 25), "PDF", fill='#1976d2', font=title_font, anchor="mm")
        
        # Draw file ID (truncated)
        file_text = file_id[:18] + "..." if len(file_id) > 18 else file_id
        draw.text((size[0]//2, 60), file_text, fill='#495057', font=font, anchor="mm")
        
        # Draw content lines
        y_start = 80
        line_spacing = 12
        for i in range(6):
            width = size[0] - 30 - (i % 3) * 15  # Varying line widths
            draw.rectangle([15, y_start + i * line_spacing, width, y_start + i * line_spacing + 2], fill='#e9ecef')
        
        # Draw footer text
        draw.text((size[0]//2, size[1] - 20), "Click to view", fill='#6c757d', font=font, anchor="mm")
        
        # Save to bytes
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=85, optimize=True)
        return output.getvalue()
    
    def store_thumbnail(self, file_id: str, thumbnail_data: bytes, source_type: str, source_path: str = None):
        """Store thumbnail in the dedicated thumbnails table."""
        with self.get_db_connection() as conn:
            # Calculate file size
            file_size = len(thumbnail_data)
            
            # Insert or update thumbnail
            conn.execute("""
                INSERT OR REPLACE INTO thumbnails 
                (file_id, thumbnail_data, thumbnail_format, width, height, file_size, source_type, source_path, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (file_id, thumbnail_data, 'JPEG', 150, 200, file_size, source_type, source_path, datetime.now()))
            
            conn.commit()
    
    def get_thumbnail(self, file_id: str) -> bytes:
        """Retrieve thumbnail from the thumbnails table."""
        with self.get_db_connection() as conn:
            cursor = conn.execute("SELECT thumbnail_data FROM thumbnails WHERE file_id = ?", (file_id,))
            result = cursor.fetchone()
            return result[0] if result else None
    
    def generate_thumbnails_for_existing_records(self):
        """Generate thumbnails for all existing OCR records."""
        with self.get_db_connection() as conn:
            # Get all records
            cursor = conn.execute("""
                SELECT file_id, pdf_image_path, ocr_image_path 
                FROM ocr_results 
                WHERE status IN ('completed', 'ocr_processed', 'text_extracted', 'OCR Done')
            """)
            
            records = cursor.fetchall()
            updated_count = 0
            
            for record in records:
                file_id, pdf_image_path, ocr_image_path = record
                
                # Check if thumbnail already exists
                existing = conn.execute("SELECT id FROM thumbnails WHERE file_id = ?", (file_id,)).fetchone()
                if existing:
                    continue  # Skip if thumbnail already exists
                
                thumbnail_data = None
                source_type = 'placeholder'
                source_path = None
                
                # Try to find source files and create real thumbnails
                for path_field in [pdf_image_path, ocr_image_path]:
                    if not path_field:
                        continue
                        
                    try:
                        paths = json.loads(path_field) if path_field.startswith('[') else [path_field]
                        if not isinstance(paths, list):
                            paths = [paths]
                            
                        for path in paths:
                            if not Path(path).exists():
                                continue
                                
                            # Try PDF first, then image
                            if path.lower().endswith('.pdf'):
                                thumbnail_data = self.create_thumbnail_from_pdf(path)
                                source_type = 'pdf'
                                source_path = path
                            else:
                                thumbnail_data = self.create_thumbnail_from_image(path)
                                source_type = 'image'
                                source_path = path
                            
                            if thumbnail_data:
                                break
                                
                        if thumbnail_data:
                            break
                            
                    except Exception as e:
                        print(f"Error processing path {path_field}: {e}")
                        continue
                
                # If no real thumbnail could be created, make a placeholder
                if not thumbnail_data:
                    thumbnail_data = self.create_placeholder_thumbnail(file_id)
                    source_type = 'placeholder'
                
                # Store the thumbnail
                self.store_thumbnail(file_id, thumbnail_data, source_type, source_path)
                updated_count += 1
                print(f"Generated {source_type} thumbnail for {file_id}")
            
            return updated_count
    
    def cleanup_orphaned_thumbnails(self):
        """Remove thumbnails for files that no longer exist in ocr_results."""
        with self.get_db_connection() as conn:
            cursor = conn.execute("""
                DELETE FROM thumbnails 
                WHERE file_id NOT IN (SELECT file_id FROM ocr_results)
            """)
            deleted_count = cursor.rowcount
            conn.commit()
            return deleted_count
    
    def get_thumbnail_stats(self):
        """Get statistics about thumbnails."""
        with self.get_db_connection() as conn:
            stats = {}
            
            # Total thumbnails
            cursor = conn.execute("SELECT COUNT(*) FROM thumbnails")
            stats['total'] = cursor.fetchone()[0]
            
            # By source type
            cursor = conn.execute("SELECT source_type, COUNT(*) FROM thumbnails GROUP BY source_type")
            stats['by_type'] = dict(cursor.fetchall())
            
            # Total size
            cursor = conn.execute("SELECT SUM(file_size) FROM thumbnails")
            stats['total_size'] = cursor.fetchone()[0] or 0
            
            return stats

def main():
    """Main function to regenerate all thumbnails."""
    manager = ThumbnailManager()
    
    print("Starting thumbnail generation...")
    updated_count = manager.generate_thumbnails_for_existing_records()
    print(f"Generated thumbnails for {updated_count} records")
    
    print("\nCleaning up orphaned thumbnails...")
    deleted_count = manager.cleanup_orphaned_thumbnails()
    print(f"Deleted {deleted_count} orphaned thumbnails")
    
    print("\nThumbnail statistics:")
    stats = manager.get_thumbnail_stats()
    print(f"Total thumbnails: {stats['total']}")
    print(f"By type: {stats['by_type']}")
    print(f"Total size: {stats['total_size']:,} bytes ({stats['total_size']/1024:.1f} KB)")

if __name__ == "__main__":
    main()