"""
Startup utilities for the OCR backend application.

This module handles initialization tasks that should run when the application starts,
including auto-preloading of processed OCR data.
"""

import logging
import asyncio
import os
from typing import Optional

from app.utils.preload_utils import preload_manager
from app.utils.cache_utils import get_cache_stats

logger = logging.getLogger(__name__)


async def auto_preload_on_startup(limit: int = 20, enable_auto_preload: bool = None):
    """
    Automatically preload processed OCR data on application startup.
    
    Args:
        limit: Maximum number of files to preload
        enable_auto_preload: Whether to enable auto-preload (reads from env if None)
    """
    try:
        # Check if auto-preload is enabled
        if enable_auto_preload is None:
            enable_auto_preload = os.getenv('ENABLE_AUTO_PRELOAD', 'true').lower() == 'true'
        
        if not enable_auto_preload:
            logger.info("Auto-preload disabled by configuration")
            return
        
        logger.info(f"Starting auto-preload on startup (limit: {limit})")
        
        # Get processed files
        processed_files = preload_manager.get_processed_files()
        if not processed_files:
            logger.info("No processed files found for auto-preload")
            return
        
        # Sort by updated_at descending to get most recent first
        processed_files.sort(key=lambda x: x['updated_at'], reverse=True)
        target_files = [f['file_id'] for f in processed_files[:limit]]
        
        logger.info(f"Auto-preloading {len(target_files)} most recent files")
        
        # Run preload
        results = preload_manager.preload_batch(file_ids=target_files)
        
        successful = results.get('successful', 0)
        failed = results.get('failed', 0)
        
        logger.info(f"Auto-preload completed: {successful} successful, {failed} failed")
        
        # Log cache stats after preload
        cache_stats = get_cache_stats()
        logger.info(f"Cache stats after auto-preload: {cache_stats}")
        
    except Exception as e:
        logger.error(f"Error in auto-preload on startup: {e}")


async def initialize_preload_system():
    """
    Initialize the preload system and perform startup tasks.
    """
    try:
        logger.info("Initializing preload system...")
        
        # Get initial stats
        stats = preload_manager.get_preload_stats()
        logger.info(f"Preload system initialized with {stats.get('total_processed_files', 0)} processed files")
        
        # Run auto-preload if enabled
        auto_preload_limit = int(os.getenv('AUTO_PRELOAD_LIMIT', '20'))
        await auto_preload_on_startup(limit=auto_preload_limit)
        
        logger.info("Preload system initialization completed")
        
    except Exception as e:
        logger.error(f"Error initializing preload system: {e}")


def setup_startup_tasks(app):
    """
    Setup startup tasks for the FastAPI application.
    
    Args:
        app: FastAPI application instance
    """
    
    @app.on_event("startup")
    async def startup_event():
        """Handle application startup."""
        logger.info("Application starting up...")
        
        # Initialize preload system
        await initialize_preload_system()
        
        logger.info("Application startup completed")
    
    @app.on_event("shutdown")
    async def shutdown_event():
        """Handle application shutdown."""
        logger.info("Application shutting down...")
        
        # Log final cache stats
        try:
            cache_stats = get_cache_stats()
            logger.info(f"Final cache stats: {cache_stats}")
        except Exception as e:
            logger.error(f"Error getting final cache stats: {e}")
        
        logger.info("Application shutdown completed")


# Environment variable configuration
def get_preload_config():
    """
    Get preload configuration from environment variables.
    
    Returns:
        Dictionary with preload configuration
    """
    return {
        'enable_auto_preload': os.getenv('ENABLE_AUTO_PRELOAD', 'true').lower() == 'true',
        'auto_preload_limit': int(os.getenv('AUTO_PRELOAD_LIMIT', '20')),
        'preload_on_startup': os.getenv('PRELOAD_ON_STARTUP', 'true').lower() == 'true',
        'cache_warmup_enabled': os.getenv('CACHE_WARMUP_ENABLED', 'true').lower() == 'true',
    }


async def warmup_cache():
    """
    Warm up the cache with frequently accessed data.
    """
    try:
        config = get_preload_config()
        
        if not config['cache_warmup_enabled']:
            logger.info("Cache warmup disabled by configuration")
            return
        
        logger.info("Starting cache warmup...")
        
        # Get most recently accessed files (you could track this in the database)
        processed_files = preload_manager.get_processed_files()
        
        if processed_files:
            # Preload a small number of most recent files for warmup
            warmup_limit = min(5, len(processed_files))
            recent_files = sorted(processed_files, key=lambda x: x['updated_at'], reverse=True)[:warmup_limit]
            file_ids = [f['file_id'] for f in recent_files]
            
            logger.info(f"Warming up cache with {len(file_ids)} recent files")
            
            results = preload_manager.preload_batch(file_ids=file_ids)
            logger.info(f"Cache warmup completed: {results.get('successful', 0)} files preloaded")
        
    except Exception as e:
        logger.error(f"Error in cache warmup: {e}")


# Health check for preload system
def preload_health_check():
    """
    Perform a health check on the preload system.
    
    Returns:
        Dictionary with health check results
    """
    try:
        stats = preload_manager.get_preload_stats()
        cache_stats = get_cache_stats()
        
        # Basic health indicators
        total_files = stats.get('total_processed_files', 0)
        cache_size = cache_stats.get('ocr_results', {}).get('size', 0)
        
        health_status = {
            'status': 'healthy',
            'total_processed_files': total_files,
            'cached_items': cache_size,
            'preload_system_active': True,
            'timestamp': None
        }
        
        # Add timestamp
        import datetime
        health_status['timestamp'] = datetime.datetime.utcnow().isoformat()
        
        return health_status
        
    except Exception as e:
        import datetime
        return {
            'status': 'unhealthy',
            'error': str(e),
            'preload_system_active': False,
            'timestamp': datetime.datetime.utcnow().isoformat()
        }