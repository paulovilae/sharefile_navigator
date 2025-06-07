"""
GPU detection and configuration utilities for OCR processing.
Supports multiple GPUs with selection and round-robin scheduling.
"""
import logging
import os
import time
import threading
from typing import Optional, Dict, List, Union, Tuple

logger = logging.getLogger(__name__)

# Global GPU state tracking
_gpu_locks = {}  # Locks for each GPU device
_gpu_usage = {}  # Track GPU usage stats
_last_used_gpu = -1  # For round-robin scheduling
_gpu_lock = threading.RLock()  # Global lock for GPU state updates

def is_gpu_available() -> bool:
    """
    Check if GPU acceleration is available for OCR processing.
    
    Returns:
        bool: True if GPU is available and should be used, False otherwise
    """
    try:
        # Check if CUDA is available
        import torch
        if torch.cuda.is_available():
            device_count = torch.cuda.device_count()
            logger.info(f"CUDA is available with {device_count} device(s)")
            return True
        else:
            # Check if this is a CPU-only PyTorch installation
            if hasattr(torch.version, 'cuda') and torch.version.cuda is None:
                logger.info(f"PyTorch {torch.__version__} is CPU-only version. GPU acceleration disabled.")
            else:
                logger.info("CUDA is not available - no GPU detected or drivers not installed")
            return False
    except ImportError:
        logger.info("PyTorch not available, GPU acceleration disabled")
        return False
    except Exception as e:
        logger.warning(f"Error checking GPU availability: {e}")
        return False

def get_optimal_gpu_setting(user_preference: bool = True) -> bool:
    """
    Get the optimal GPU setting based on user preference and system capabilities.
    
    Args:
        user_preference (bool): User's preference for GPU acceleration
        
    Returns:
        bool: Whether to use GPU acceleration
    """
    if not user_preference:
        logger.info("GPU acceleration disabled by user preference")
        return False
    
    gpu_available = is_gpu_available()
    if not gpu_available:
        logger.info("GPU acceleration requested but not available, falling back to CPU")
        return False
    
    logger.info("GPU acceleration enabled")
    return True

def configure_easyocr_gpu(enable_gpu_acceleration: bool = True) -> bool:
    """
    Configure EasyOCR GPU settings with automatic fallback.
    
    Args:
        enable_gpu_acceleration (bool): User preference for GPU acceleration
        
    Returns:
        bool: Actual GPU setting to use with EasyOCR
    """
    optimal_setting = get_optimal_gpu_setting(enable_gpu_acceleration)
    
    if enable_gpu_acceleration and not optimal_setting:
        logger.warning(
            "GPU acceleration was requested but is not available. "
            "EasyOCR will use CPU processing. This may be slower but will avoid "
            "PyTorch DataLoader pin_memory warnings."
        )
    
    return optimal_setting

def get_gpu_info():
    """
    Get information about available GPU devices.
    
    Returns:
        dict: Dictionary containing GPU information including:
            - is_available: Whether GPU is available
            - device_count: Number of available GPU devices
            - devices: List of dictionaries with device information (id, name, memory)
    """
    try:
        import torch
        
        result = {
            "is_available": torch.cuda.is_available(),
            "device_count": 0,
            "devices": []
        }
        
        if result["is_available"]:
            result["device_count"] = torch.cuda.device_count()
            
            # Get information for each device
            for i in range(result["device_count"]):
                # Get basic device info
                device_info = {
                    "id": i,
                    "name": torch.cuda.get_device_name(i)
                }
                
                # Try to get memory info if available
                try:
                    # Get memory info using torch
                    memory_total = torch.cuda.get_device_properties(i).total_memory / (1024 * 1024)  # MB
                    memory_reserved = torch.cuda.memory_reserved(i) / (1024 * 1024)  # MB
                    memory_allocated = torch.cuda.memory_allocated(i) / (1024 * 1024)  # MB
                    
                    device_info["memory"] = {
                        "total": memory_total,
                        "reserved": memory_reserved,
                        "allocated": memory_allocated,
                        "free": memory_total - memory_reserved
                    }
                    
                    # Update global usage tracking
                    with _gpu_lock:
                        if i in _gpu_usage:
                            _gpu_usage[i]["memory_used"] = memory_allocated
                            _gpu_usage[i]["memory_total"] = memory_total
                            # Estimate utilization based on memory usage
                            _gpu_usage[i]["utilization"] = int((memory_allocated / memory_total) * 100) if memory_total > 0 else 0
                
                except Exception as e:
                    logger.warning(f"Error getting GPU memory info for device {i}: {e}")
                    device_info["memory"] = {
                        "total": 0,
                        "reserved": 0,
                        "allocated": 0,
                        "free": 0
                    }
                
                result["devices"].append(device_info)
                
            logger.info(f"GPU info: {result['device_count']} devices available")
        else:
            logger.info("GPU info: No GPU devices available")
            
        return result
    except ImportError:
        logger.info("PyTorch not available, cannot get GPU information")
        return {
            "is_available": False,
            "device_count": 0,
            "devices": []
        }
    except Exception as e:
        logger.warning(f"Error getting GPU information: {e}")
        return {
            "is_available": False,
            "device_count": 0,
            "devices": [],
            "error": str(e)
        }

def initialize_gpu_tracking():
    """
    Initialize GPU tracking system.
    Should be called at application startup.
    """
    global _gpu_locks, _gpu_usage
    
    with _gpu_lock:
        gpu_info = get_gpu_info()
        if gpu_info["is_available"]:
            for i in range(gpu_info["device_count"]):
                if i not in _gpu_locks:
                    _gpu_locks[i] = threading.RLock()
                if i not in _gpu_usage:
                    _gpu_usage[i] = {
                        "in_use": False,
                        "last_used": 0,
                        "usage_count": 0,
                        "total_usage_time": 0,
                        "memory_used": 0,
                        "memory_total": 0,
                        "utilization": 0
                    }
            logger.info(f"Initialized GPU tracking for {len(_gpu_locks)} devices")
        else:
            logger.info("No GPUs available for tracking")

def get_gpu_usage_stats():
    """
    Get current GPU usage statistics.
    
    Returns:
        dict: Dictionary with GPU usage statistics
    """
    # Update GPU memory info before returning stats
    try:
        import torch
        if torch.cuda.is_available():
            with _gpu_lock:
                for i in range(torch.cuda.device_count()):
                    if i in _gpu_usage:
                        try:
                            # Get memory info
                            memory_total = torch.cuda.get_device_properties(i).total_memory / (1024 * 1024)  # MB
                            memory_allocated = torch.cuda.memory_allocated(i) / (1024 * 1024)  # MB
                            
                            # Update stats
                            _gpu_usage[i]["memory_used"] = memory_allocated
                            _gpu_usage[i]["memory_total"] = memory_total
                            
                            # Estimate utilization based on memory usage and in_use flag
                            if _gpu_usage[i]["in_use"]:
                                # If GPU is marked as in use, set utilization to at least 50%
                                base_utilization = 50
                            else:
                                base_utilization = 0
                                
                            # Add memory-based utilization
                            memory_utilization = int((memory_allocated / memory_total) * 100) if memory_total > 0 else 0
                            
                            # Use the higher of the two values
                            _gpu_usage[i]["utilization"] = max(base_utilization, memory_utilization)
                            
                        except Exception as e:
                            logger.warning(f"Error updating GPU memory info for device {i}: {e}")
    except Exception as e:
        logger.warning(f"Error updating GPU memory info: {e}")
    
    with _gpu_lock:
        return {
            "gpu_count": len(_gpu_locks),
            "usage": {gpu_id: stats.copy() for gpu_id, stats in _gpu_usage.items()}
        }

def select_gpu(preferred_gpu: Optional[int] = None) -> Tuple[bool, Optional[int]]:
    """
    Select a GPU for processing based on preference and availability.
    
    Args:
        preferred_gpu: Preferred GPU ID or None for auto-selection
        
    Returns:
        Tuple[bool, Optional[int]]: (success, gpu_id)
            - success: Whether a GPU was successfully selected
            - gpu_id: The selected GPU ID or None if no GPU is available
    """
    global _last_used_gpu
    
    # If no GPU is available, return False
    gpu_info = get_gpu_info()
    if not gpu_info["is_available"] or gpu_info["device_count"] == 0:
        logger.info("No GPUs available for selection")
        return False, None
    
    with _gpu_lock:
        # Initialize tracking if not already done
        if not _gpu_locks:
            initialize_gpu_tracking()
        
        # If a specific GPU is requested and it exists, try to use it
        if preferred_gpu is not None and preferred_gpu >= 0 and preferred_gpu < gpu_info["device_count"]:
            if _gpu_locks[preferred_gpu].acquire(blocking=False):
                _gpu_usage[preferred_gpu]["in_use"] = True
                _gpu_usage[preferred_gpu]["last_used"] = time.time()
                _gpu_usage[preferred_gpu]["usage_count"] += 1
                logger.info(f"Selected specific GPU {preferred_gpu}")
                return True, preferred_gpu
            else:
                logger.info(f"Preferred GPU {preferred_gpu} is busy")
                # Fall through to auto-selection if preferred GPU is busy
        
        # Auto-selection (round-robin)
        # Start from the next GPU after the last used one
        start_gpu = (_last_used_gpu + 1) % gpu_info["device_count"]
        current_gpu = start_gpu
        
        # Try each GPU in round-robin order
        for _ in range(gpu_info["device_count"]):
            if _gpu_locks[current_gpu].acquire(blocking=False):
                _gpu_usage[current_gpu]["in_use"] = True
                _gpu_usage[current_gpu]["last_used"] = time.time()
                _gpu_usage[current_gpu]["usage_count"] += 1
                _last_used_gpu = current_gpu
                logger.info(f"Auto-selected GPU {current_gpu} (round-robin)")
                return True, current_gpu
            
            # Try next GPU
            current_gpu = (current_gpu + 1) % gpu_info["device_count"]
        
        # If we get here, all GPUs are busy
        logger.info("All GPUs are currently busy")
        return False, None

def release_gpu(gpu_id: int):
    """
    Release a previously selected GPU.
    
    Args:
        gpu_id: The GPU ID to release
    """
    if gpu_id is None or gpu_id < 0:
        return
    
    with _gpu_lock:
        if gpu_id in _gpu_locks:
            # Update usage statistics
            if _gpu_usage[gpu_id]["in_use"]:
                usage_time = time.time() - _gpu_usage[gpu_id]["last_used"]
                _gpu_usage[gpu_id]["total_usage_time"] += usage_time
                _gpu_usage[gpu_id]["in_use"] = False
                logger.info(f"Released GPU {gpu_id} after {usage_time:.2f}s")
            
            # Release the lock
            try:
                _gpu_locks[gpu_id].release()
            except RuntimeError:
                # Lock might not be acquired
                pass

def configure_easyocr_gpu_with_selection(enable_gpu_acceleration: bool = True,
                                         preferred_gpu: Optional[int] = None) -> Tuple[bool, Optional[int]]:
    """
    Configure EasyOCR GPU settings with automatic fallback and GPU selection.
    
    Args:
        enable_gpu_acceleration: User preference for GPU acceleration
        preferred_gpu: Preferred GPU ID or None for auto-selection
        
    Returns:
        Tuple[bool, Optional[int]]: (gpu_enabled, gpu_id)
            - gpu_enabled: Whether GPU is enabled for EasyOCR
            - gpu_id: The selected GPU ID or None if CPU is used
    """
    if not enable_gpu_acceleration:
        logger.info("GPU acceleration disabled by user preference")
        return False, None
    
    # Check if GPU is available at all
    gpu_available = is_gpu_available()
    if not gpu_available:
        logger.info("GPU acceleration requested but not available, falling back to CPU")
        return False, None
    
    # Try to select a GPU
    success, gpu_id = select_gpu(preferred_gpu)
    if not success:
        logger.warning(
            "GPU acceleration was requested but no GPU could be selected. "
            "EasyOCR will use CPU processing. This may be slower but will avoid "
            "PyTorch DataLoader pin_memory warnings."
        )
        return False, None
    
    # Set CUDA device
    try:
        import torch
        torch.cuda.set_device(gpu_id)
        logger.info(f"Set CUDA device to GPU {gpu_id}")
    except Exception as e:
        logger.warning(f"Error setting CUDA device: {e}")
    
    logger.info(f"GPU acceleration enabled on GPU {gpu_id}")
    return True, gpu_id