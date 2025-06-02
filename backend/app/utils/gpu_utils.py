"""
GPU detection and configuration utilities for OCR processing.
"""
import logging
import os

logger = logging.getLogger(__name__)

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