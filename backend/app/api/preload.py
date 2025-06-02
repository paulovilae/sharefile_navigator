"""
Preload API endpoints for OCR system.

This module provides API endpoints to manage preloading of processed
OCR data, improving performance by utilizing cached data.
"""

import os
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine

from app.utils.preload_utils import preload_manager, get_cached_text, get_cached_image_paths, is_data_preloaded
from app.utils.cache_utils import get_cache_stats, clear_cache

logger = logging.getLogger(__name__)

router = APIRouter(tags=["preload"])

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ocr.db')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class PreloadRequest(BaseModel):
    """Request model for preloading specific files."""
    file_ids: List[str]
    force_reload: bool = False


class BatchPreloadRequest(BaseModel):
    """Request model for batch preloading."""
    limit: Optional[int] = None
    force_reload: bool = False


@router.get('/status', summary="Get preload system status")
async def get_preload_status():
    """
    Get the current status of the preload system including statistics.
    """
    try:
        stats = preload_manager.get_preload_stats()
        cache_stats = get_cache_stats()
        
        return {
            "preload_stats": stats,
            "cache_stats": cache_stats,
            "status": "active"
        }
    except Exception as e:
        logger.error(f"Error getting preload status: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting preload status: {str(e)}")


@router.get('/check/{file_id}', summary="Check preload availability for a file")
async def check_preload_availability(file_id: str, db: Session = Depends(get_db)):
    """
    Check what data is available for preloading for a specific file.
    """
    try:
        availability = preload_manager.check_preload_availability(file_id, db)
        preload_status = is_data_preloaded(file_id)
        
        return {
            "file_id": file_id,
            "availability": availability,
            "currently_preloaded": preload_status
        }
    except Exception as e:
        logger.error(f"Error checking preload availability for file {file_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking availability: {str(e)}")


@router.post('/file/{file_id}', summary="Preload data for a specific file")
async def preload_file(file_id: str, force_reload: bool = False, db: Session = Depends(get_db)):
    """
    Preload all available data for a specific file.
    """
    try:
        # Check if already preloaded and force_reload is False
        if not force_reload:
            preload_status = is_data_preloaded(file_id)
            if any(preload_status.values()) and 'error' not in preload_status:
                logger.info(f"File {file_id} already has preloaded data")
                return {
                    "file_id": file_id,
                    "message": "Data already preloaded",
                    "preloaded_data": preload_status,
                    "action": "skipped"
                }
        
        result = preload_manager.preload_file_complete(file_id, db)
        
        if result.get('success', False):
            return {
                "file_id": file_id,
                "message": "Data preloaded successfully",
                "preloaded_data": result.get('preloaded', {}),
                "availability": result.get('availability', {}),
                "action": "preloaded"
            }
        else:
            return {
                "file_id": file_id,
                "message": result.get('error', 'Unknown error'),
                "action": "failed"
            }
    except Exception as e:
        logger.error(f"Error preloading file {file_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error preloading file: {str(e)}")


@router.post('/files', summary="Preload data for multiple files")
async def preload_files(request: PreloadRequest, db: Session = Depends(get_db)):
    """
    Preload data for multiple specific files.
    """
    try:
        logger.info(f"Preloading {len(request.file_ids)} specific files")
        
        results = preload_manager.preload_batch(file_ids=request.file_ids)
        
        return {
            "message": f"Batch preload completed for {len(request.file_ids)} files",
            "results": results
        }
    except Exception as e:
        logger.error(f"Error in batch preload: {e}")
        raise HTTPException(status_code=500, detail=f"Error in batch preload: {str(e)}")


@router.post('/batch', summary="Preload all processed files")
async def preload_batch(request: BatchPreloadRequest, background_tasks: BackgroundTasks):
    """
    Preload data for all processed files or up to a specified limit.
    This operation runs in the background for large datasets.
    """
    try:
        logger.info(f"Starting batch preload with limit: {request.limit}")
        
        # Run preload in background for large operations
        background_tasks.add_task(
            run_batch_preload_task,
            limit=request.limit,
            force_reload=request.force_reload
        )
        
        return {
            "message": "Batch preload started in background",
            "limit": request.limit,
            "status": "started"
        }
    except Exception as e:
        logger.error(f"Error starting batch preload: {e}")
        raise HTTPException(status_code=500, detail=f"Error starting batch preload: {str(e)}")


async def run_batch_preload_task(limit: Optional[int] = None, force_reload: bool = False):
    """
    Background task to run batch preload.
    """
    try:
        logger.info(f"Running batch preload task with limit: {limit}")
        results = preload_manager.preload_batch(limit=limit)
        logger.info(f"Batch preload task completed: {results.get('successful', 0)} successful, {results.get('failed', 0)} failed")
    except Exception as e:
        logger.error(f"Error in batch preload task: {e}")


@router.get('/text/{file_id}', summary="Get cached text for a file")
async def get_cached_text_endpoint(file_id: str, text_type: str = 'auto'):
    """
    Get cached text for a file.
    
    Args:
        file_id: The file ID
        text_type: Type of text ('pdf', 'ocr', or 'auto')
    """
    try:
        if text_type not in ['pdf', 'ocr', 'auto']:
            raise HTTPException(status_code=400, detail="text_type must be 'pdf', 'ocr', or 'auto'")
        
        cached_text = get_cached_text(file_id, text_type)
        
        if cached_text is None:
            # Try to preload if not in cache
            logger.info(f"Text not in cache for file {file_id}, attempting to preload")
            db = SessionLocal()
            try:
                preload_result = preload_manager.preload_text_data(file_id, db)
                if preload_result:
                    cached_text = get_cached_text(file_id, text_type)
            finally:
                db.close()
        
        if cached_text is None:
            raise HTTPException(status_code=404, detail=f"No cached text found for file {file_id}")
        
        return {
            "file_id": file_id,
            "text_type": text_type,
            "text": cached_text,
            "length": len(cached_text)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cached text for file {file_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting cached text: {str(e)}")


@router.get('/images/{file_id}', summary="Get cached image paths for a file")
async def get_cached_images_endpoint(file_id: str, image_type: str = 'auto'):
    """
    Get cached image paths for a file.
    
    Args:
        file_id: The file ID
        image_type: Type of images ('pdf', 'ocr', or 'auto')
    """
    try:
        if image_type not in ['pdf', 'ocr', 'auto']:
            raise HTTPException(status_code=400, detail="image_type must be 'pdf', 'ocr', or 'auto'")
        
        cached_paths = get_cached_image_paths(file_id, image_type)
        
        if cached_paths is None:
            # Try to preload if not in cache
            logger.info(f"Image paths not in cache for file {file_id}, attempting to preload")
            db = SessionLocal()
            try:
                preload_result = preload_manager.preload_image_paths(file_id, db)
                if preload_result:
                    cached_paths = get_cached_image_paths(file_id, image_type)
            finally:
                db.close()
        
        if cached_paths is None:
            raise HTTPException(status_code=404, detail=f"No cached image paths found for file {file_id}")
        
        return {
            "file_id": file_id,
            "image_type": image_type,
            "image_paths": cached_paths,
            "count": len(cached_paths)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cached image paths for file {file_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting cached image paths: {str(e)}")


@router.get('/processed', summary="Get list of processed files available for preloading")
async def get_processed_files(db: Session = Depends(get_db)):
    """
    Get a list of all processed files that have data available for preloading.
    """
    try:
        processed_files = preload_manager.get_processed_files(db)
        
        return {
            "total_files": len(processed_files),
            "files": processed_files
        }
    except Exception as e:
        logger.error(f"Error getting processed files: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting processed files: {str(e)}")


@router.delete('/cache', summary="Clear preload cache")
async def clear_preload_cache(cache_type: str = 'all'):
    """
    Clear the preload cache.
    
    Args:
        cache_type: Type of cache to clear ('ocr', 'preprocessing', 'all')
    """
    try:
        if cache_type not in ['ocr', 'preprocessing', 'all']:
            raise HTTPException(status_code=400, detail="cache_type must be 'ocr', 'preprocessing', or 'all'")
        
        cleared_counts = clear_cache(cache_type)
        
        return {
            "message": f"Cache cleared successfully",
            "cache_type": cache_type,
            "cleared_counts": cleared_counts
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=f"Error clearing cache: {str(e)}")


@router.post('/auto-preload', summary="Auto-preload system startup")
async def auto_preload_startup(background_tasks: BackgroundTasks, limit: int = 50):
    """
    Automatically preload the most recently processed files on system startup.
    This is useful for warming up the cache when the system starts.
    """
    try:
        logger.info(f"Starting auto-preload for up to {limit} files")
        
        # Run auto-preload in background
        background_tasks.add_task(run_auto_preload_task, limit)
        
        return {
            "message": f"Auto-preload started for up to {limit} files",
            "status": "started"
        }
    except Exception as e:
        logger.error(f"Error starting auto-preload: {e}")
        raise HTTPException(status_code=500, detail=f"Error starting auto-preload: {str(e)}")


async def run_auto_preload_task(limit: int):
    """
    Background task for auto-preload on startup.
    """
    try:
        logger.info(f"Running auto-preload task for {limit} files")
        
        # Get most recently processed files
        db = SessionLocal()
        try:
            processed_files = preload_manager.get_processed_files(db)
            # Sort by updated_at descending to get most recent first
            processed_files.sort(key=lambda x: x['updated_at'], reverse=True)
            target_files = [f['file_id'] for f in processed_files[:limit]]
            
            if target_files:
                results = preload_manager.preload_batch(file_ids=target_files)
                logger.info(f"Auto-preload completed: {results.get('successful', 0)} successful, {results.get('failed', 0)} failed")
            else:
                logger.info("No processed files found for auto-preload")
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error in auto-preload task: {e}")