#!/usr/bin/env python3
"""
Test script to verify EasyOCR GPU acceleration is working.
"""
import sys
import os
import time
import tempfile
from PIL import Image, ImageDraw, ImageFont

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.utils.gpu_utils import configure_easyocr_gpu
import easyocr

def create_test_image():
    """Create a simple test image with text."""
    # Create a white image
    img = Image.new('RGB', (400, 200), color='white')
    draw = ImageDraw.Draw(img)
    
    # Add some text
    try:
        # Try to use a default font
        font = ImageFont.load_default()
    except:
        font = None
    
    text = "GPU Test Image\nEasyOCR Processing\n2025"
    draw.text((50, 50), text, fill='black', font=font)
    
    # Save to temporary file
    temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    img.save(temp_file.name)
    return temp_file.name

def test_easyocr_gpu():
    """Test EasyOCR with GPU acceleration."""
    print("=== EasyOCR GPU Test ===")
    
    # Create test image
    print("\n1. Creating test image...")
    test_image_path = create_test_image()
    print(f"   Test image created: {test_image_path}")
    
    # Test with GPU enabled
    print("\n2. Testing EasyOCR with GPU acceleration...")
    gpu_enabled = configure_easyocr_gpu(True)
    print(f"   GPU enabled: {gpu_enabled}")
    
    try:
        # Initialize EasyOCR reader
        print("   Initializing EasyOCR reader...")
        start_time = time.time()
        reader = easyocr.Reader(['en'], gpu=gpu_enabled)
        init_time = time.time() - start_time
        print(f"   Reader initialized in {init_time:.2f} seconds")
        
        # Process the image
        print("   Processing test image...")
        start_time = time.time()
        results = reader.readtext(test_image_path)
        process_time = time.time() - start_time
        print(f"   Image processed in {process_time:.2f} seconds")
        
        # Display results
        print("\n3. OCR Results:")
        for i, (bbox, text, confidence) in enumerate(results):
            print(f"   Text {i+1}: '{text}' (confidence: {confidence:.2f})")
        
        print(f"\n4. Performance Summary:")
        print(f"   GPU Acceleration: {'Enabled' if gpu_enabled else 'Disabled'}")
        print(f"   Initialization Time: {init_time:.2f}s")
        print(f"   Processing Time: {process_time:.2f}s")
        print(f"   Total Time: {init_time + process_time:.2f}s")
        
    except Exception as e:
        print(f"   Error during OCR processing: {e}")
    
    finally:
        # Clean up
        try:
            os.unlink(test_image_path)
            print(f"\n5. Cleanup: Test image deleted")
        except:
            pass
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_easyocr_gpu()