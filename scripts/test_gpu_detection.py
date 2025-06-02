#!/usr/bin/env python3
"""
Test script to verify GPU detection functionality.
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.utils.gpu_utils import is_gpu_available, configure_easyocr_gpu, get_optimal_gpu_setting

def test_gpu_detection():
    """Test GPU detection functionality."""
    print("=== GPU Detection Test ===")
    
    # Test basic GPU availability
    print("\n1. Testing GPU availability...")
    gpu_available = is_gpu_available()
    print(f"   GPU Available: {gpu_available}")
    
    # Test optimal GPU setting with user preference True
    print("\n2. Testing optimal GPU setting (user wants GPU)...")
    optimal_true = get_optimal_gpu_setting(True)
    print(f"   User wants GPU, optimal setting: {optimal_true}")
    
    # Test optimal GPU setting with user preference False
    print("\n3. Testing optimal GPU setting (user doesn't want GPU)...")
    optimal_false = get_optimal_gpu_setting(False)
    print(f"   User doesn't want GPU, optimal setting: {optimal_false}")
    
    # Test EasyOCR configuration
    print("\n4. Testing EasyOCR GPU configuration...")
    easyocr_gpu_true = configure_easyocr_gpu(True)
    print(f"   EasyOCR GPU (user wants GPU): {easyocr_gpu_true}")
    
    easyocr_gpu_false = configure_easyocr_gpu(False)
    print(f"   EasyOCR GPU (user doesn't want GPU): {easyocr_gpu_false}")
    
    # Test PyTorch availability
    print("\n5. Testing PyTorch availability...")
    try:
        import torch
        print(f"   PyTorch version: {torch.__version__}")
        print(f"   CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"   CUDA device count: {torch.cuda.device_count()}")
            for i in range(torch.cuda.device_count()):
                print(f"   Device {i}: {torch.cuda.get_device_name(i)}")
    except ImportError:
        print("   PyTorch not available")
    
    print("\n=== Test Complete ===")
    print(f"Summary: GPU will be {'enabled' if easyocr_gpu_true else 'disabled'} for EasyOCR")
    
    if not gpu_available and easyocr_gpu_true:
        print("WARNING: This shouldn't happen - GPU not available but would be enabled")
    elif gpu_available and not easyocr_gpu_true:
        print("INFO: GPU available but will be disabled (user preference or other reason)")
    elif not gpu_available and not easyocr_gpu_true:
        print("INFO: GPU not available, correctly disabled")
    else:
        print("INFO: GPU available and enabled")

if __name__ == "__main__":
    test_gpu_detection()