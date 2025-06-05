"""
Thumbnail generation utilities for OCR processing.
This module provides thumbnail generation during OCR processing to ensure
real thumbnails are created from actual document images.
"""

import os
import sqlite3
import logging
from PIL import Image
from datetime import datetime
from typing import Optional, Tuple
import io

logger = logging.getLogger(__name__)

class ThumbnailGenerator:
    """
    Generates and stores thumbnails during OCR processing.
    """
    
    def __init__(self, db_path: str = "ocr.db"):
        self.db_path = db_path
    
    def get_db_connection(self):
        """Get database connection."""
        return sqlite3.connect(self.db_path)
    
    def create_thumbnail_from_image_path(self, image_path: str, size: Tuple[int, int] = (150, 200)) -> Optional[bytes]:
        """
        Create thumbnail from an image file path.
        
        Args:
            image_path: Path to the source image
            size: Thumbnail size as (width, height)
            
        Returns:
            Thumbnail image data as bytes, or None if failed
        """
        try:
            if not os.path.exists(image_path):
                logger.warning(f"Image file not found: {image_path}")
                return None
                
            with Image.open(image_path) as img:
                # Convert to RGB if necessary (handles RGBA, P, etc.)
                if img.mode not in ('RGB', 'L'):
                    img = img.convert('RGB')
                
                # Create thumbnail maintaining aspect ratio
                img.thumbnail(size, Image.Resampling.LANCZOS)
                
                # Save to bytes
                output = io.BytesIO()
                img.save(output, format='JPEG', quality=85, optimize=True)
                return output.getvalue()
                
        except Exception as e:
            logger.error(f"Error creating thumbnail from {image_path}: {e}")
            return None
    
    def create_thumbnail_from_pil_image(self, pil_image: Image.Image, size: Tuple[int, int] = (150, 200)) -> Optional[bytes]:
        """
        Create thumbnail from a PIL Image object.
        
        Args:
            pil_image: PIL Image object
            size: Thumbnail size as (width, height)
            
        Returns:
            Thumbnail image data as bytes, or None if failed
        """
        try:
            # Make a copy to avoid modifying the original
            img = pil_image.copy()
            
            # Convert to RGB if necessary
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            
            # Create thumbnail maintaining aspect ratio
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Save to bytes
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=85, optimize=True)
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Error creating thumbnail from PIL image: {e}")
            return None
    
    def create_thumbnail_from_fitz_pixmap(self, pixmap, size: Tuple[int, int] = (150, 200)) -> Optional[bytes]:
        """
        Create thumbnail from a PyMuPDF pixmap object.
        
        Args:
            pixmap: PyMuPDF pixmap object
            size: Thumbnail size as (width, height)
            
        Returns:
            Thumbnail image data as bytes, or None if failed
        """
        try:
            # Convert pixmap to PIL Image
            img = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
            return self.create_thumbnail_from_pil_image(img, size)
            
        except Exception as e:
            logger.error(f"Error creating thumbnail from pixmap: {e}")
            return None
    
    def create_placeholder_thumbnail(self, file_id: str, size: Tuple[int, int] = (150, 200)) -> bytes:
        """
        Create a professional placeholder thumbnail with file ID.
        
        Args:
            file_id: The file ID to display
            size: Thumbnail size as (width, height)
            
        Returns:
            Placeholder thumbnail as bytes
        """
        try:
            from PIL import Image, ImageDraw, ImageFont
            
            # Create image with light background
            img = Image.new('RGB', size, color='#f8f9fa')
            draw = ImageDraw.Draw(img)
            
            # Try to use a system font, fallback to default
            try:
                font = ImageFont.truetype("arial.ttf", 12)
            except:
                try:
                    font = ImageFont.truetype("DejaVuSans.ttf", 12)
                except:
                    font = ImageFont.load_default()
            
            # Draw border
            border_color = '#dee2e6'
            draw.rectangle([0, 0, size[0]-1, size[1]-1], outline=border_color, width=2)
            
            # Draw PDF icon (simple representation)
            icon_size = min(size[0], size[1]) // 4
            icon_x = (size[0] - icon_size) // 2
            icon_y = size[1] // 4
            
            # Simple document icon
            draw.rectangle([icon_x, icon_y, icon_x + icon_size, icon_y + icon_size], 
                         outline='#6c757d', fill='#ffffff', width=2)
            
            # Add "PDF" text in icon
            try:
                pdf_font = ImageFont.truetype("arial.ttf", max(8, icon_size // 4))
            except:
                pdf_font = font
            
            pdf_text = "PDF"
            pdf_bbox = draw.textbbox((0, 0), pdf_text, font=pdf_font)
            pdf_width = pdf_bbox[2] - pdf_bbox[0]
            pdf_height = pdf_bbox[3] - pdf_bbox[1]
            pdf_x = icon_x + (icon_size - pdf_width) // 2
            pdf_y = icon_y + (icon_size - pdf_height) // 2
            draw.text((pdf_x, pdf_y), pdf_text, fill='#6c757d', font=pdf_font)
            
            # Add file ID (truncated if too long)
            display_id = file_id[:20] + "..." if len(file_id) > 23 else file_id
            
            # Calculate text position
            text_bbox = draw.textbbox((0, 0), display_id, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_height = text_bbox[3] - text_bbox[1]
            text_x = (size[0] - text_width) // 2
            text_y = icon_y + icon_size + 20
            
            # Ensure text fits
            if text_y + text_height > size[1] - 10:
                text_y = size[1] - text_height - 10
            
            draw.text((text_x, text_y), display_id, fill='#495057', font=font)
            
            # Convert to bytes
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=85)
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Error creating placeholder thumbnail: {e}")
            # Return minimal placeholder
            img = Image.new('RGB', size, color='#f8f9fa')
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=85)
            return output.getvalue()
    
    def store_thumbnail(self, file_id: str, thumbnail_data: bytes, source_type: str, source_path: str = None):
        """
        Store thumbnail in the thumbnails table.
        
        Args:
            file_id: The file ID
            thumbnail_data: Thumbnail image data as bytes
            source_type: Type of source ('image', 'pdf', 'placeholder')
            source_path: Path to source file (optional)
        """
        try:
            with self.get_db_connection() as conn:
                file_size = len(thumbnail_data)
                
                # Insert or replace thumbnail
                conn.execute("""
                    INSERT OR REPLACE INTO thumbnails
                    (file_id, thumbnail_data, thumbnail_format, width, height, file_size, source_type, source_path, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (file_id, thumbnail_data, 'JPEG', 150, 200, file_size, source_type, source_path, datetime.now()))
                
                conn.commit()
                logger.info(f"Stored {source_type} thumbnail for {file_id} ({file_size} bytes)")
                
        except Exception as e:
            logger.error(f"Error storing thumbnail for {file_id}: {e}")
    
    def generate_thumbnail_during_ocr(self, file_id: str, first_page_image_path: str = None, 
                                    first_page_pixmap=None) -> bool:
        """
        Generate and store thumbnail during OCR processing.
        
        Args:
            file_id: The file ID
            first_page_image_path: Path to first page image (if available)
            first_page_pixmap: PyMuPDF pixmap of first page (if available)
            
        Returns:
            True if thumbnail was generated successfully, False otherwise
        """
        try:
            thumbnail_data = None
            source_type = 'placeholder'
            source_path = None
            
            # Try to create thumbnail from pixmap first (best quality)
            if first_page_pixmap:
                thumbnail_data = self.create_thumbnail_from_fitz_pixmap(first_page_pixmap)
                if thumbnail_data:
                    source_type = 'pdf'
                    source_path = 'pixmap'
            
            # Try to create thumbnail from image file
            if not thumbnail_data and first_page_image_path and os.path.exists(first_page_image_path):
                thumbnail_data = self.create_thumbnail_from_image_path(first_page_image_path)
                if thumbnail_data:
                    source_type = 'image'
                    source_path = first_page_image_path
            
            # Create placeholder if no real thumbnail could be generated
            if not thumbnail_data:
                thumbnail_data = self.create_placeholder_thumbnail(file_id)
                source_type = 'placeholder'
            
            # Store the thumbnail
            self.store_thumbnail(file_id, thumbnail_data, source_type, source_path)
            return True
            
        except Exception as e:
            logger.error(f"Error generating thumbnail during OCR for {file_id}: {e}")
            return False