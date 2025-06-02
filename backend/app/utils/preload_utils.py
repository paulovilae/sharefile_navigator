"""
Preloading utilities for OCR system.

This module provides functionality to preload images and text data
that have already been processed, improving performance by utilizing
cached data when available.
"""

import logging
import os
import tempfile
import json
import base64
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine

from app.models import OcrResult
from app.utils.cache_utils import (
    save_file_cache, 
    load_file_cache, 
    generate_cache_key,
    ocr_results_cache,
    preprocessing_cache
)

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ocr.db')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class PreloadManager:
    """Manages preloading of processed OCR data."""
    
    def __init__(self):
        self.temp_dir = os.path.join(tempfile.gettempdir(), 'ocr_preload')
        os.makedirs(self.temp_dir, exist_ok=True)
    
    def get_processed_files(self, db: Session = None) -> List[Dict]:
        """
        Get all files that have been processed and have available data.
        
        Returns:
            List of dictionaries containing file information
        """
        if db is None:
            db = SessionLocal()
            close_db = True
        else:
            close_db = False
        
        try:
            # Query for files with processed data
            results = db.query(OcrResult).filter(
                OcrResult.status.in_(['completed', 'ocr_processed', 'text_extracted', 'OCR Done'])
            ).all()
            
            processed_files = []
            for result in results:
                file_info = {
                    'file_id': result.file_id,
                    'directory_id': result.directory_id,
                    'status': result.status,
                    'has_pdf_text': bool(result.pdf_text),
                    'has_ocr_text': bool(result.ocr_text),
                    'has_pdf_images': bool(result.pdf_image_path),
                    'has_ocr_images': bool(result.ocr_image_path),
                    'pdf_text_length': len(result.pdf_text) if result.pdf_text else 0,
                    'ocr_text_length': len(result.ocr_text) if result.ocr_text else 0,
                    'metrics': json.loads(result.metrics) if result.metrics else {},
                    'created_at': result.created_at,
                    'updated_at': result.updated_at
                }
                processed_files.append(file_info)
            
            logger.info(f"Found {len(processed_files)} processed files available for preloading")
            return processed_files
            
        except Exception as e:
            logger.error(f"Error getting processed files: {e}")
            return []
        finally:
            if close_db:
                db.close()
    
    def preload_text_data(self, file_id: str, db: Session = None) -> Dict[str, str]:
        """
        Preload text data for a specific file.
        
        Args:
            file_id: The file ID to preload
            db: Database session (optional)
            
        Returns:
            Dictionary containing preloaded text data
        """
        if db is None:
            db = SessionLocal()
            close_db = True
        else:
            close_db = False
        
        try:
            result = db.query(OcrResult).filter_by(file_id=file_id).first()
            if not result:
                logger.warning(f"No OCR result found for file_id: {file_id}")
                return {}
            
            preloaded_data = {}
            
            # Preload PDF text if available
            if result.pdf_text:
                cache_key = generate_cache_key("pdf_text", file_id)
                ocr_results_cache[cache_key] = result.pdf_text
                preloaded_data['pdf_text'] = result.pdf_text
                logger.info(f"Preloaded PDF text for file {file_id} ({len(result.pdf_text)} chars)")
            
            # Preload OCR text if available
            if result.ocr_text:
                cache_key = generate_cache_key("ocr_text", file_id)
                ocr_results_cache[cache_key] = result.ocr_text
                preloaded_data['ocr_text'] = result.ocr_text
                logger.info(f"Preloaded OCR text for file {file_id} ({len(result.ocr_text)} chars)")
            
            # Preload metrics if available
            if result.metrics:
                cache_key = generate_cache_key("metrics", file_id)
                metrics = json.loads(result.metrics) if isinstance(result.metrics, str) else result.metrics
                ocr_results_cache[cache_key] = metrics
                preloaded_data['metrics'] = metrics
                logger.info(f"Preloaded metrics for file {file_id}")
            
            return preloaded_data
            
        except Exception as e:
            logger.error(f"Error preloading text data for file {file_id}: {e}")
            return {}
        finally:
            if close_db:
                db.close()
    
    def preload_image_paths(self, file_id: str, db: Session = None) -> Dict[str, List[str]]:
        """
        Preload image paths for a specific file.
        
        Args:
            file_id: The file ID to preload
            db: Database session (optional)
            
        Returns:
            Dictionary containing preloaded image paths
        """
        if db is None:
            db = SessionLocal()
            close_db = True
        else:
            close_db = False
        
        try:
            result = db.query(OcrResult).filter_by(file_id=file_id).first()
            if not result:
                logger.warning(f"No OCR result found for file_id: {file_id}")
                return {}
            
            preloaded_paths = {}
            
            # Preload PDF image paths if available
            if result.pdf_image_path:
                try:
                    if result.pdf_image_path.startswith('['):
                        # JSON format
                        pdf_paths = json.loads(result.pdf_image_path)
                    else:
                        # Comma-separated format
                        pdf_paths = [p.strip() for p in result.pdf_image_path.split(',') if p.strip()]
                    
                    cache_key = generate_cache_key("pdf_image_paths", file_id)
                    preprocessing_cache[cache_key] = pdf_paths
                    preloaded_paths['pdf_image_paths'] = pdf_paths
                    logger.info(f"Preloaded {len(pdf_paths)} PDF image paths for file {file_id}")
                except Exception as e:
                    logger.error(f"Error parsing PDF image paths for file {file_id}: {e}")
            
            # Preload OCR image paths if available
            if result.ocr_image_path:
                try:
                    if result.ocr_image_path.startswith('['):
                        # JSON format
                        ocr_paths = json.loads(result.ocr_image_path)
                    else:
                        # Comma-separated format
                        ocr_paths = [p.strip() for p in result.ocr_image_path.split(',') if p.strip()]
                    
                    cache_key = generate_cache_key("ocr_image_paths", file_id)
                    preprocessing_cache[cache_key] = ocr_paths
                    preloaded_paths['ocr_image_paths'] = ocr_paths
                    logger.info(f"Preloaded {len(ocr_paths)} OCR image paths for file {file_id}")
                except Exception as e:
                    logger.error(f"Error parsing OCR image paths for file {file_id}: {e}")
            
            return preloaded_paths
            
        except Exception as e:
            logger.error(f"Error preloading image paths for file {file_id}: {e}")
            return {}
        finally:
            if close_db:
                db.close()
    
    def check_preload_availability(self, file_id: str, db: Session = None) -> Dict[str, bool]:
        """
        Check what data is available for preloading for a specific file.
        
        Args:
            file_id: The file ID to check
            db: Database session (optional)
            
        Returns:
            Dictionary indicating what data is available
        """
        if db is None:
            db = SessionLocal()
            close_db = True
        else:
            close_db = False
        
        try:
            result = db.query(OcrResult).filter_by(file_id=file_id).first()
            if not result:
                return {
                    'exists': False,
                    'has_pdf_text': False,
                    'has_ocr_text': False,
                    'has_pdf_images': False,
                    'has_ocr_images': False,
                    'is_processed': False
                }
            
            return {
                'exists': True,
                'has_pdf_text': bool(result.pdf_text),
                'has_ocr_text': bool(result.ocr_text),
                'has_pdf_images': bool(result.pdf_image_path),
                'has_ocr_images': bool(result.ocr_image_path),
                'is_processed': result.status in ['completed', 'ocr_processed', 'text_extracted', 'OCR Done'],
                'status': result.status
            }
            
        except Exception as e:
            logger.error(f"Error checking preload availability for file {file_id}: {e}")
            return {'exists': False, 'error': str(e)}
        finally:
            if close_db:
                db.close()
    
    def preload_file_complete(self, file_id: str, db: Session = None) -> Dict[str, any]:
        """
        Preload all available data for a specific file.
        
        Args:
            file_id: The file ID to preload
            db: Database session (optional)
            
        Returns:
            Dictionary containing all preloaded data
        """
        logger.info(f"Starting complete preload for file: {file_id}")
        
        # Check availability first
        availability = self.check_preload_availability(file_id, db)
        if not availability.get('exists', False):
            logger.warning(f"File {file_id} not found in database")
            return {'success': False, 'error': 'File not found'}
        
        if not availability.get('is_processed', False):
            logger.info(f"File {file_id} is not yet processed (status: {availability.get('status')})")
            return {'success': False, 'error': 'File not processed yet', 'status': availability.get('status')}
        
        preloaded_data = {
            'file_id': file_id,
            'success': True,
            'preloaded': {}
        }
        
        # Preload text data
        text_data = self.preload_text_data(file_id, db)
        if text_data:
            preloaded_data['preloaded']['text'] = text_data
        
        # Preload image paths
        image_paths = self.preload_image_paths(file_id, db)
        if image_paths:
            preloaded_data['preloaded']['images'] = image_paths
        
        # Add availability info
        preloaded_data['availability'] = availability
        
        logger.info(f"Completed preload for file {file_id}: {len(preloaded_data['preloaded'])} data types loaded")
        return preloaded_data
    
    def preload_batch(self, file_ids: List[str] = None, limit: int = None) -> Dict[str, any]:
        """
        Preload data for multiple files.
        
        Args:
            file_ids: List of specific file IDs to preload (optional)
            limit: Maximum number of files to preload (optional)
            
        Returns:
            Dictionary containing batch preload results
        """
        db = SessionLocal()
        try:
            if file_ids:
                # Preload specific files
                target_files = file_ids
                logger.info(f"Starting batch preload for {len(target_files)} specific files")
            else:
                # Get all processed files
                processed_files = self.get_processed_files(db)
                target_files = [f['file_id'] for f in processed_files]
                if limit:
                    target_files = target_files[:limit]
                logger.info(f"Starting batch preload for {len(target_files)} processed files")
            
            results = {
                'total_files': len(target_files),
                'successful': 0,
                'failed': 0,
                'results': {}
            }
            
            for file_id in target_files:
                try:
                    result = self.preload_file_complete(file_id, db)
                    results['results'][file_id] = result
                    if result.get('success', False):
                        results['successful'] += 1
                    else:
                        results['failed'] += 1
                except Exception as e:
                    logger.error(f"Error preloading file {file_id}: {e}")
                    results['results'][file_id] = {'success': False, 'error': str(e)}
                    results['failed'] += 1
            
            logger.info(f"Batch preload completed: {results['successful']} successful, {results['failed']} failed")
            return results
            
        except Exception as e:
            logger.error(f"Error in batch preload: {e}")
            return {'error': str(e)}
        finally:
            db.close()
    
    def get_preload_stats(self) -> Dict[str, any]:
        """
        Get statistics about preloaded data.
        
        Returns:
            Dictionary containing preload statistics
        """
        try:
            db = SessionLocal()
            processed_files = self.get_processed_files(db)
            db.close()
            
            stats = {
                'total_processed_files': len(processed_files),
                'files_with_pdf_text': sum(1 for f in processed_files if f['has_pdf_text']),
                'files_with_ocr_text': sum(1 for f in processed_files if f['has_ocr_text']),
                'files_with_pdf_images': sum(1 for f in processed_files if f['has_pdf_images']),
                'files_with_ocr_images': sum(1 for f in processed_files if f['has_ocr_images']),
                'cache_sizes': {
                    'ocr_results_cache': len(ocr_results_cache),
                    'preprocessing_cache': len(preprocessing_cache)
                }
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting preload stats: {e}")
            return {'error': str(e)}


# Global preload manager instance
preload_manager = PreloadManager()


def get_cached_text(file_id: str, text_type: str = 'auto') -> Optional[str]:
    """
    Get cached text for a file.
    
    Args:
        file_id: The file ID
        text_type: Type of text to get ('pdf', 'ocr', or 'auto')
        
    Returns:
        Cached text if available, None otherwise
    """
    try:
        if text_type == 'auto':
            # Try PDF text first, then OCR text
            pdf_key = generate_cache_key("pdf_text", file_id)
            if pdf_key in ocr_results_cache:
                return ocr_results_cache[pdf_key]
            
            ocr_key = generate_cache_key("ocr_text", file_id)
            if ocr_key in ocr_results_cache:
                return ocr_results_cache[ocr_key]
        elif text_type == 'pdf':
            cache_key = generate_cache_key("pdf_text", file_id)
            return ocr_results_cache.get(cache_key)
        elif text_type == 'ocr':
            cache_key = generate_cache_key("ocr_text", file_id)
            return ocr_results_cache.get(cache_key)
        
        return None
        
    except Exception as e:
        logger.error(f"Error getting cached text for file {file_id}: {e}")
        return None


def get_cached_image_paths(file_id: str, image_type: str = 'auto') -> Optional[List[str]]:
    """
    Get cached image paths for a file.
    
    Args:
        file_id: The file ID
        image_type: Type of images to get ('pdf', 'ocr', or 'auto')
        
    Returns:
        List of cached image paths if available, None otherwise
    """
    try:
        if image_type == 'auto':
            # Try PDF images first, then OCR images
            pdf_key = generate_cache_key("pdf_image_paths", file_id)
            if pdf_key in preprocessing_cache:
                return preprocessing_cache[pdf_key]
            
            ocr_key = generate_cache_key("ocr_image_paths", file_id)
            if ocr_key in preprocessing_cache:
                return preprocessing_cache[ocr_key]
        elif image_type == 'pdf':
            cache_key = generate_cache_key("pdf_image_paths", file_id)
            return preprocessing_cache.get(cache_key)
        elif image_type == 'ocr':
            cache_key = generate_cache_key("ocr_image_paths", file_id)
            return preprocessing_cache.get(cache_key)
        
        return None
        
    except Exception as e:
        logger.error(f"Error getting cached image paths for file {file_id}: {e}")
        return None


def is_data_preloaded(file_id: str) -> Dict[str, bool]:
    """
    Check if data is preloaded for a file.
    
    Args:
        file_id: The file ID to check
        
    Returns:
        Dictionary indicating what data is preloaded
    """
    try:
        pdf_text_key = generate_cache_key("pdf_text", file_id)
        ocr_text_key = generate_cache_key("ocr_text", file_id)
        pdf_images_key = generate_cache_key("pdf_image_paths", file_id)
        ocr_images_key = generate_cache_key("ocr_image_paths", file_id)
        
        return {
            'pdf_text': pdf_text_key in ocr_results_cache,
            'ocr_text': ocr_text_key in ocr_results_cache,
            'pdf_images': pdf_images_key in preprocessing_cache,
            'ocr_images': ocr_images_key in preprocessing_cache
        }
        
    except Exception as e:
        logger.error(f"Error checking preload status for file {file_id}: {e}")
        return {'error': str(e)}