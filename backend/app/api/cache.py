"""
Cache management API endpoints.

This module provides endpoints for monitoring and managing the application cache.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Union, Optional
import logging

from app.utils.cache_utils import clear_cache, get_cache_stats

logger = logging.getLogger(__name__)

router = APIRouter(tags=["cache"])


@router.get("/stats", summary="Get cache statistics")
def get_cache_statistics():
    """
    Get detailed statistics about all caches.
    
    Returns:
        Dict containing cache statistics including size, hits, misses, and TTL information.
    """
    try:
        stats = get_cache_stats()
        logger.info("Cache statistics requested")
        return {
            "status": "success",
            "data": stats
        }
    except Exception as e:
        logger.error(f"Error getting cache statistics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting cache statistics: {str(e)}")


@router.post("/clear", summary="Clear cache")
def clear_cache_endpoint(cache_type: Optional[str] = "all"):
    """
    Clear specified cache or all caches.
    
    Args:
        cache_type: Type of cache to clear. Options: "ocr", "sharepoint", "llm", "preprocessing", "files", "all"
        
    Returns:
        Dict containing the number of items cleared from each cache.
    """
    valid_cache_types = ["ocr", "sharepoint", "llm", "preprocessing", "files", "all"]
    
    if cache_type not in valid_cache_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid cache_type. Must be one of: {', '.join(valid_cache_types)}"
        )
    
    try:
        cleared_counts = clear_cache(cache_type)
        logger.info(f"Cache cleared: {cache_type}, counts: {cleared_counts}")
        return {
            "status": "success",
            "message": f"Successfully cleared {cache_type} cache(s)",
            "cleared_counts": cleared_counts
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error clearing cache: {str(e)}")


@router.get("/health", summary="Cache health check")
def cache_health_check():
    """
    Check the health of the caching system.
    
    Returns:
        Dict containing cache health information.
    """
    try:
        stats = get_cache_stats()
        
        # Check if any cache is near capacity
        warnings = []
        for cache_name, cache_stats in stats.items():
            if cache_name == "file_cache":
                continue
                
            size = cache_stats.get("size", 0)
            maxsize = cache_stats.get("maxsize", 0)
            
            if maxsize > 0 and size / maxsize > 0.8:  # 80% capacity
                warnings.append(f"{cache_name} is at {(size/maxsize)*100:.1f}% capacity")
        
        is_healthy = len(warnings) == 0
        
        return {
            "status": "healthy" if is_healthy else "warning",
            "healthy": is_healthy,
            "warnings": warnings,
            "cache_stats": stats
        }
    except Exception as e:
        logger.error(f"Error checking cache health: {e}", exc_info=True)
        return {
            "status": "error",
            "healthy": False,
            "error": str(e)
        }