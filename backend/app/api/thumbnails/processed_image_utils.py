"""
Processed image utilities for OCR processing.
This module provides functions for storing and retrieving processed images.
"""

import logging
import io
from datetime import datetime
from typing import Optional, Tuple
from PIL import Image

from .db_utils import get_db_connection
from . import thumbnail_utils

logger = logging.getLogger(__name__)

def store_processed_image(file_id: str, image_data: bytes, image_format: str = 'JPEG', 
                         width: int = 0, height: int = 0, source_type: str = 'ocr', 
                         source_path: str = None) -> bool:
    """
    Store a processed image in the database.
    
    Args:
        file_id: The file ID
        image_data: Image data as bytes
        image_format: Image format (JPEG, PNG, etc.)
        width: Image width
        height: Image height
        source_type: Type of source ('ocr', 'pdf', etc.)
        source_path: Path to source file (optional)
        
    Returns:
        True if successful, False otherwise
    """
    try:
        if not image_data:
            logger.warning(f"No image data provided for file_id: {file_id}")
            return False
            
        file_size = len(image_data)
        
        # If width and height are not provided, try to get them from the image
        if width == 0 or height == 0:
            try:
                img = Image.open(io.BytesIO(image_data))
                width, height = img.size
            except Exception as e:
                logger.warning(f"Could not determine image dimensions: {e}")
                # Use default values if we can't determine the dimensions
                width = width or 800
                height = height or 1000
        
        with get_db_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO processed_images
                (file_id, image_data, image_format, width, height, file_size, source_type, source_path, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (file_id, image_data, image_format, width, height, file_size, source_type, source_path, datetime.now()))
            
            conn.commit()
            logger.info(f"Stored processed image for {file_id} ({file_size} bytes)")
            return True
            
    except Exception as e:
        logger.error(f"Error storing processed image for {file_id}: {e}")
        return False

def get_processed_image(file_id: str) -> Optional[Tuple[bytes, str]]:
    """
    Get a processed image from the database.
    
    Args:
        file_id: The file ID
        
    Returns:
        Tuple of (image_data, image_format) or None if not found
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.execute("""
                SELECT image_data, image_format
                FROM processed_images
                WHERE file_id = ?
            """, (file_id,))
            
            result = cursor.fetchone()
            
            if result:
                image_data, image_format = result
                return image_data, image_format
                
            return None
            
    except Exception as e:
        logger.error(f"Error retrieving processed image for {file_id}: {e}")
        return None

def store_processed_image_from_pdf(file_id: str, page_num: int = 1) -> bool:
    """
    Store a processed image from a PDF file.
    
    Args:
        file_id: The file ID
        page_num: Page number (1-based)
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Get PDF content from SharePoint
        pdf_content = thumbnail_utils.download_pdf_content_from_sharepoint(file_id)
        
        if not pdf_content:
            logger.warning(f"Could not download PDF content for {file_id}")
            return False
            
        # Create a high-resolution image from the PDF page
        import fitz  # PyMuPDF
        import io
        
        pdf_stream = io.BytesIO(pdf_content)
        pdf_document = fitz.open(stream=pdf_stream, filetype="pdf")
        
        # Check if page number is valid (convert to 0-based)
        page_index = page_num - 1
        if page_index < 0 or page_index >= len(pdf_document):
            pdf_document.close()
            logger.warning(f"Invalid page number {page_num} for PDF with {len(pdf_document)} pages")
            return False
            
        page = pdf_document[page_index]
        
        # Render page to high-resolution image (300 DPI)
        zoom_factor = 300 / 72  # 300 DPI / 72 (default PDF DPI)
        mat = fitz.Matrix(zoom_factor, zoom_factor)
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PIL Image
        img_data = pix.tobytes("ppm")
        img = Image.open(io.BytesIO(img_data))
        
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')
        
        # Save to bytes with high quality
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=90, optimize=True)
        image_data = output.getvalue()
        
        width, height = img.size
        
        # Store the processed image
        result = store_processed_image(
            f"{file_id}_page_{page_num}",
            image_data,
            'JPEG',
            width,
            height,
            f'pdf-page-{page_num}',
            None
        )
        
        pdf_document.close()
        return result
        
    except Exception as e:
        logger.error(f"Error storing processed image from PDF for {file_id} page {page_num}: {e}")
        return False