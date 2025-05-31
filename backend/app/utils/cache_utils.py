"""
Cache utilities for the OCR backend application.

This module provides caching functionality using cachetools for in-memory caching
and file-based caching for larger objects like images and PDFs.
"""

import hashlib
import json
import os
import pickle
import tempfile
import time
from functools import wraps
from typing import Any, Callable, Dict, Optional, Union

from cachetools import TTLCache, LRUCache
import logging

logger = logging.getLogger(__name__)

# In-memory caches with different TTL and size limits
ocr_results_cache = TTLCache(maxsize=1000, ttl=3600)  # 1 hour TTL, max 1000 items
sharepoint_files_cache = TTLCache(maxsize=500, ttl=1800)  # 30 minutes TTL, max 500 items
llm_scores_cache = TTLCache(maxsize=2000, ttl=7200)  # 2 hours TTL, max 2000 items
preprocessing_cache = LRUCache(maxsize=100)  # LRU cache for preprocessing results

# File-based cache directory
CACHE_DIR = os.path.join(tempfile.gettempdir(), "ocr_cache")
os.makedirs(CACHE_DIR, exist_ok=True)


def generate_cache_key(*args, **kwargs) -> str:
    """
    Generate a consistent cache key from arguments.
    
    Args:
        *args: Positional arguments
        **kwargs: Keyword arguments
        
    Returns:
        str: SHA256 hash of the serialized arguments
    """
    # Create a consistent string representation
    key_data = {
        'args': args,
        'kwargs': sorted(kwargs.items()) if kwargs else {}
    }
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.sha256(key_string.encode()).hexdigest()


def cache_ocr_result(func: Callable) -> Callable:
    """
    Decorator to cache OCR results.
    
    Args:
        func: Function to cache
        
    Returns:
        Callable: Wrapped function with caching
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        cache_key = generate_cache_key(func.__name__, *args, **kwargs)
        
        # Check if result is in cache
        if cache_key in ocr_results_cache:
            logger.info(f"Cache hit for OCR result: {cache_key[:16]}...")
            return ocr_results_cache[cache_key]
        
        # Execute function and cache result
        result = func(*args, **kwargs)
        ocr_results_cache[cache_key] = result
        logger.info(f"Cached OCR result: {cache_key[:16]}...")
        
        return result
    
    return wrapper


def cache_sharepoint_file(func: Callable) -> Callable:
    """
    Decorator to cache SharePoint file content.
    
    Args:
        func: Function to cache
        
    Returns:
        Callable: Wrapped function with caching
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        cache_key = generate_cache_key(func.__name__, *args, **kwargs)
        
        # Check if result is in cache
        if cache_key in sharepoint_files_cache:
            logger.info(f"Cache hit for SharePoint file: {cache_key[:16]}...")
            return sharepoint_files_cache[cache_key]
        
        # Execute function and cache result
        result = func(*args, **kwargs)
        sharepoint_files_cache[cache_key] = result
        logger.info(f"Cached SharePoint file: {cache_key[:16]}...")
        
        return result
    
    return wrapper


def cache_llm_score(func: Callable) -> Callable:
    """
    Decorator to cache LLM quality scores.
    
    Args:
        func: Function to cache
        
    Returns:
        Callable: Wrapped function with caching
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Create cache key based on text content hash for LLM scoring
        text_content = args[0] if args else kwargs.get('text', '')
        text_hash = hashlib.sha256(text_content.encode()).hexdigest()
        cache_key = f"llm_score_{text_hash}"
        
        # Check if result is in cache
        if cache_key in llm_scores_cache:
            logger.info(f"Cache hit for LLM score: {cache_key[:16]}...")
            return llm_scores_cache[cache_key]
        
        # Execute function and cache result
        result = func(*args, **kwargs)
        llm_scores_cache[cache_key] = result
        logger.info(f"Cached LLM score: {cache_key[:16]}...")
        
        return result
    
    return wrapper


def cache_preprocessing_result(func: Callable) -> Callable:
    """
    Decorator to cache preprocessing results.
    
    Args:
        func: Function to cache
        
    Returns:
        Callable: Wrapped function with caching
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        cache_key = generate_cache_key(func.__name__, *args, **kwargs)
        
        # Check if result is in cache
        if cache_key in preprocessing_cache:
            logger.info(f"Cache hit for preprocessing: {cache_key[:16]}...")
            return preprocessing_cache[cache_key]
        
        # Execute function and cache result
        result = func(*args, **kwargs)
        preprocessing_cache[cache_key] = result
        logger.info(f"Cached preprocessing result: {cache_key[:16]}...")
        
        return result
    
    return wrapper


def save_file_cache(cache_key: str, data: bytes, subfolder: str = "files") -> str:
    """
    Save binary data to file-based cache.
    
    Args:
        cache_key: Unique identifier for the cached item
        data: Binary data to cache
        subfolder: Subfolder within cache directory
        
    Returns:
        str: Path to the cached file
    """
    cache_subfolder = os.path.join(CACHE_DIR, subfolder)
    os.makedirs(cache_subfolder, exist_ok=True)
    
    cache_file_path = os.path.join(cache_subfolder, f"{cache_key}.cache")
    
    with open(cache_file_path, 'wb') as f:
        f.write(data)
    
    logger.info(f"Saved file cache: {cache_file_path}")
    return cache_file_path


def load_file_cache(cache_key: str, subfolder: str = "files") -> Optional[bytes]:
    """
    Load binary data from file-based cache.
    
    Args:
        cache_key: Unique identifier for the cached item
        subfolder: Subfolder within cache directory
        
    Returns:
        Optional[bytes]: Cached data if found, None otherwise
    """
    cache_file_path = os.path.join(CACHE_DIR, subfolder, f"{cache_key}.cache")
    
    if not os.path.exists(cache_file_path):
        return None
    
    # Check if cache file is still valid (not older than 1 hour)
    file_age = time.time() - os.path.getmtime(cache_file_path)
    if file_age > 3600:  # 1 hour
        os.remove(cache_file_path)
        logger.info(f"Removed expired cache file: {cache_file_path}")
        return None
    
    with open(cache_file_path, 'rb') as f:
        data = f.read()
    
    logger.info(f"Loaded file cache: {cache_file_path}")
    return data


def clear_cache(cache_type: str = "all") -> Dict[str, int]:
    """
    Clear specified cache or all caches.
    
    Args:
        cache_type: Type of cache to clear ("ocr", "sharepoint", "llm", "preprocessing", "files", "all")
        
    Returns:
        Dict[str, int]: Number of items cleared from each cache
    """
    cleared_counts = {}
    
    if cache_type in ["ocr", "all"]:
        count = len(ocr_results_cache)
        ocr_results_cache.clear()
        cleared_counts["ocr_results"] = count
        
    if cache_type in ["sharepoint", "all"]:
        count = len(sharepoint_files_cache)
        sharepoint_files_cache.clear()
        cleared_counts["sharepoint_files"] = count
        
    if cache_type in ["llm", "all"]:
        count = len(llm_scores_cache)
        llm_scores_cache.clear()
        cleared_counts["llm_scores"] = count
        
    if cache_type in ["preprocessing", "all"]:
        count = len(preprocessing_cache)
        preprocessing_cache.clear()
        cleared_counts["preprocessing"] = count
        
    if cache_type in ["files", "all"]:
        import shutil
        if os.path.exists(CACHE_DIR):
            file_count = sum(len(files) for _, _, files in os.walk(CACHE_DIR))
            shutil.rmtree(CACHE_DIR)
            os.makedirs(CACHE_DIR, exist_ok=True)
            cleared_counts["file_cache"] = file_count
    
    logger.info(f"Cleared caches: {cleared_counts}")
    return cleared_counts


def get_cache_stats() -> Dict[str, Dict[str, Union[int, float]]]:
    """
    Get statistics about all caches.
    
    Returns:
        Dict[str, Dict[str, Union[int, float]]]: Cache statistics
    """
    stats = {
        "ocr_results": {
            "size": len(ocr_results_cache),
            "maxsize": ocr_results_cache.maxsize,
            "ttl": getattr(ocr_results_cache, 'ttl', 0),
            "hits": getattr(ocr_results_cache, 'hits', 0),
            "misses": getattr(ocr_results_cache, 'misses', 0)
        },
        "sharepoint_files": {
            "size": len(sharepoint_files_cache),
            "maxsize": sharepoint_files_cache.maxsize,
            "ttl": getattr(sharepoint_files_cache, 'ttl', 0),
            "hits": getattr(sharepoint_files_cache, 'hits', 0),
            "misses": getattr(sharepoint_files_cache, 'misses', 0)
        },
        "llm_scores": {
            "size": len(llm_scores_cache),
            "maxsize": llm_scores_cache.maxsize,
            "ttl": getattr(llm_scores_cache, 'ttl', 0),
            "hits": getattr(llm_scores_cache, 'hits', 0),
            "misses": getattr(llm_scores_cache, 'misses', 0)
        },
        "preprocessing": {
            "size": len(preprocessing_cache),
            "maxsize": preprocessing_cache.maxsize,
            "hits": getattr(preprocessing_cache, 'hits', 0),
            "misses": getattr(preprocessing_cache, 'misses', 0)
        }
    }
    
    # Add file cache stats
    if os.path.exists(CACHE_DIR):
        file_count = sum(len(files) for _, _, files in os.walk(CACHE_DIR))
        cache_size = sum(
            os.path.getsize(os.path.join(dirpath, filename))
            for dirpath, _, filenames in os.walk(CACHE_DIR)
            for filename in filenames
        )
        stats["file_cache"] = {
            "file_count": file_count,
            "total_size_bytes": cache_size,
            "total_size_mb": round(cache_size / (1024 * 1024), 2)
        }
    
    return stats