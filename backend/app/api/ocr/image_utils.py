import os
import tempfile
import mimetypes
import logging
from pathlib import Path
from fastapi import HTTPException
from fastapi.responses import FileResponse
from .db_utils import get_db_session
from app.models import OcrResult
import json

logger = logging.getLogger(__name__)

def serve_temp_image(path: str, temp_dir: str):
    """
    Serves a temporary image from PDF OCR processing.
    """
    base_temp_dir = os.path.join(tempfile.gettempdir(), 'pdf_ocr', temp_dir)
    image_path = os.path.join(base_temp_dir, path)
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Temporary image not found")
    return FileResponse(image_path, media_type=mimetypes.guess_type(image_path)[0] or 'image/png')

def serve_preloaded_image(file_id: str, page: int, filename: str):
    """
    Serves a preloaded image from database-stored paths.
    This endpoint handles images that were processed previously and stored in the database.
    """
    try:
        db = get_db_session()
        ocr_result = db.query(OcrResult).filter_by(file_id=file_id).first()
        db.close()
        
        if not ocr_result:
            raise HTTPException(status_code=404, detail="OCR result not found")
        
        # Try to find the image path from stored paths
        image_paths = []
        
        # Check PDF image paths first
        if ocr_result.pdf_image_path:
            try:
                if ocr_result.pdf_image_path.startswith('['):
                    image_paths = json.loads(ocr_result.pdf_image_path)
                else:
                    image_paths = [p.strip() for p in ocr_result.pdf_image_path.split(',') if p.strip()]
            except Exception as e:
                logger.warning(f"Error parsing PDF image paths: {e}")
        
        # If no PDF images, check OCR image paths
        if not image_paths and ocr_result.ocr_image_path:
            try:
                if ocr_result.ocr_image_path.startswith('['):
                    image_paths = json.loads(ocr_result.ocr_image_path)
                else:
                    image_paths = [p.strip() for p in ocr_result.ocr_image_path.split(',') if p.strip()]
            except Exception as e:
                logger.warning(f"Error parsing OCR image paths: {e}")
        
        # Find the specific page image
        if page <= len(image_paths):
            image_path = image_paths[page - 1]  # Convert to 0-based index
            
            # Check if the file exists
            if os.path.exists(image_path):
                return FileResponse(image_path, media_type=mimetypes.guess_type(image_path)[0] or 'image/png')
            else:
                logger.warning(f"Preloaded image not found at path: {image_path}")
        
        # If we can't find the specific image, try to find any image with the filename
        # in common OCR image directories
        possible_dirs = [
            os.path.join(tempfile.gettempdir(), 'ocr_images'),
            os.path.join(tempfile.gettempdir(), 'pdf_ocr'),
            os.path.join(tempfile.gettempdir(), 'ocr_preload')
        ]
        
        for base_dir in possible_dirs:
            if os.path.exists(base_dir):
                # Search recursively for the image file
                for root, dirs, files in os.walk(base_dir):
                    if filename in files:
                        found_path = os.path.join(root, filename)
                        logger.info(f"Found preloaded image at: {found_path}")
                        return FileResponse(found_path, media_type=mimetypes.guess_type(found_path)[0] or 'image/png')
        
        raise HTTPException(status_code=404, detail=f"Preloaded image not found for file {file_id}, page {page}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving preloaded image: {e}")
        raise HTTPException(status_code=500, detail=f"Error serving preloaded image: {str(e)}")

def serve_image(path: str):
    """
    Serves a preprocessed image.
    """
    base_temp_dir = os.path.join(tempfile.gettempdir(), 'ocr_images')
    image_path = os.path.join(base_temp_dir, path)
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(image_path, media_type=mimetypes.guess_type(image_path)[0] or 'image/png')