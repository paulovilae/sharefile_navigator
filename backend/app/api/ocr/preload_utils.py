import logging
from fastapi import HTTPException
from app.utils.preload_utils import get_cached_text, get_cached_image_paths, is_data_preloaded, preload_manager
from .db_utils import get_db_session
from app.models import OcrResult

logger = logging.getLogger(__name__)

async def check_preloaded_data(file_id: str):
    """
    Check if a file has preloaded data available and return it if found.
    This endpoint allows quick access to already processed data without reprocessing.
    """
    try:
        logger.info(f"Checking preloaded data for file: {file_id}")
        
        # Check what's preloaded
        preload_status = is_data_preloaded(file_id)
        availability = preload_manager.check_preload_availability(file_id)
        
        if not availability.get('exists', False):
            return {
                "file_id": file_id,
                "preloaded": False,
                "message": "File not found in database"
            }
        
        result = {
            "file_id": file_id,
            "preloaded": any(preload_status.values()) if 'error' not in preload_status else False,
            "availability": availability,
            "preload_status": preload_status
        }
        
        # If data is preloaded, include it in the response
        if result["preloaded"]:
            cached_data = {}
            
            # Get cached text
            pdf_text = get_cached_text(file_id, 'pdf')
            if pdf_text:
                cached_data['pdf_text'] = {
                    'text': pdf_text[:500] + '...' if len(pdf_text) > 500 else pdf_text,
                    'full_length': len(pdf_text)
                }
            
            ocr_text = get_cached_text(file_id, 'ocr')
            if ocr_text:
                cached_data['ocr_text'] = {
                    'text': ocr_text[:500] + '...' if len(ocr_text) > 500 else ocr_text,
                    'full_length': len(ocr_text)
                }
            
            # Get cached image paths
            pdf_images = get_cached_image_paths(file_id, 'pdf')
            if pdf_images:
                cached_data['pdf_images'] = {
                    'paths': pdf_images,
                    'count': len(pdf_images)
                }
            
            ocr_images = get_cached_image_paths(file_id, 'ocr')
            if ocr_images:
                cached_data['ocr_images'] = {
                    'paths': ocr_images,
                    'count': len(ocr_images)
                }
            
            result['cached_data'] = cached_data
        
        return result
        
    except Exception as e:
        logger.error(f"Error checking preloaded data for file {file_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking preloaded data: {str(e)}")