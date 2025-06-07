"""
Test script to verify GPU tracking in OCR processing.
This script processes a sample PDF file and displays the GPU information.
"""
import sys
import os
import json
import base64
import asyncio
import logging
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the necessary modules
from backend.app.api.ocr.pdf_processing import pdf_ocr_process
from backend.app.api.ocr.models import PdfOcrRequest
from backend.app.utils.gpu_utils import get_gpu_info, initialize_gpu_tracking, get_gpu_usage_stats

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize GPU tracking
initialize_gpu_tracking()

async def test_gpu_tracking():
    """Test GPU tracking in OCR processing."""
    # First, display GPU information
    gpu_info = get_gpu_info()
    logger.info("GPU Information:")
    logger.info(f"  GPU Available: {gpu_info['is_available']}")
    logger.info(f"  Device Count: {gpu_info['device_count']}")
    
    if gpu_info['devices']:
        for device in gpu_info['devices']:
            logger.info(f"  Device {device['id']}: {device['name']}")
    
    # Test different GPU selection modes
    test_modes = [
        {"name": "Auto Selection (Round-Robin)", "preferredGpu": "auto"},
    ]
    
    # Add specific GPU tests if multiple GPUs are available
    if gpu_info['device_count'] > 0:
        for i in range(min(gpu_info['device_count'], 2)):  # Test up to 2 GPUs
            test_modes.append({"name": f"Specific GPU {i}", "preferredGpu": str(i)})
    
    # Check if a PDF file path is provided as an argument
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        pdf_path = sys.argv[1]
    else:
        # Look for any PDF file in the current directory
        pdf_files = list(Path('.').glob('*.pdf'))
        if not pdf_files:
            logger.error("No PDF file found. Please provide a PDF file path as an argument.")
            return
        pdf_path = str(pdf_files[0])
    
    logger.info(f"Using PDF file: {pdf_path}")
    
    # Read the PDF file
    with open(pdf_path, 'rb') as f:
        pdf_data = f.read()
    
    # Encode the PDF data as base64
    pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
    
    # Process the PDF with different GPU selection modes
    for mode in test_modes:
        logger.info(f"\n\nTesting GPU mode: {mode['name']}")
        
        # Create a request object with the current GPU selection mode
        request = PdfOcrRequest(
            filename=os.path.basename(pdf_path),
            file_data=pdf_base64,
            settings={
                "dpi": 300,
                "colorMode": "Color",
                "imageFormat": "png",
                "ocrEngine": "easyocr",
                "language": "en",
                "enableGpuAcceleration": True,
                "preferredGpu": mode["preferredGpu"]
            }
        )
        
        # Process the PDF
        logger.info(f"Processing PDF with OCR using {mode['name']}...")
        result = await pdf_ocr_process(request, file_id=f"test_gpu_{mode['preferredGpu']}")
        
        # Display GPU usage statistics
        gpu_usage = get_gpu_usage_stats()
        logger.info("GPU Usage Statistics:")
        logger.info(f"  GPU Count: {gpu_usage['gpu_count']}")
        for gpu_id, stats in gpu_usage['usage'].items():
            logger.info(f"  GPU {gpu_id}:")
            logger.info(f"    In Use: {stats['in_use']}")
            logger.info(f"    Usage Count: {stats['usage_count']}")
            logger.info(f"    Total Usage Time: {stats['total_usage_time']:.2f}s")
        
        # Display the results
        logger.info("OCR Processing Results:")
        logger.info(f"  Filename: {result['filename']}")
        logger.info(f"  Page Count: {result['pageCount']}")
        logger.info(f"  Total Words: {result['totalWords']}")
        logger.info(f"  Processing Time: {result['processingTime']}ms")
        logger.info(f"  Has Embedded Text: {result['hasEmbeddedText']}")
        
        # Display GPU information from the results
        if 'gpuUsed' in result:
            logger.info(f"  GPU Used: {result['gpuUsed']}")
        
        if 'gpuInfo' in result:
            logger.info("  GPU Information:")
            logger.info(f"    GPU Available: {result['gpuInfo']['is_available']}")
            logger.info(f"    Device Count: {result['gpuInfo']['device_count']}")
            
            if result['gpuInfo']['devices']:
                for device in result['gpuInfo']['devices']:
                    logger.info(f"    Device {device['id']}: {device['name']}")
        
        # Display selected GPU information
        if 'gpuUsageStats' in result:
            logger.info("  GPU Usage Stats from Result:")
            logger.info(f"    GPU Count: {result['gpuUsageStats']['gpu_count']}")
            for gpu_id, stats in result['gpuUsageStats']['usage'].items():
                logger.info(f"    GPU {gpu_id}:")
                logger.info(f"      Usage Count: {stats['usage_count']}")
        
        # Display page-level GPU information
        for i, page in enumerate(result['pages']):
            logger.info(f"  Page {i+1}:")
            logger.info(f"    Status: {page['status']}")
            logger.info(f"    Word Count: {page['wordCount']}")
            
            if 'gpuUsed' in page:
                logger.info(f"    GPU Used: {page['gpuUsed']}")
            
            if 'selectedGpu' in page:
                logger.info(f"    Selected GPU: {page['selectedGpu']}")
            
            if 'gpuInfo' in page:
                logger.info("    GPU Information:")
                logger.info(f"      GPU Available: {page['gpuInfo']['is_available']}")
                logger.info(f"      Device Count: {page['gpuInfo']['device_count']}")
                
                if page['gpuInfo']['devices']:
                    for device in page['gpuInfo']['devices']:
                        logger.info(f"      Device {device['id']}: {device['name']}")

if __name__ == "__main__":
    asyncio.run(test_gpu_tracking())