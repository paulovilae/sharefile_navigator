#!/usr/bin/env python
"""
Test script for improved batch processing.
This script tests the batch processing system with the improvements we've made
to address resource consumption issues.
"""
import os
import sys
import time
import json
import requests
import base64
import uuid
import psutil
from datetime import datetime

# Add the parent directory to the path so we can import from the backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Base URL for the API
BASE_URL = "http://localhost:5173/api"

def monitor_system_resources():
    """Monitor system resources during batch processing"""
    process = psutil.Process()
    memory_info = process.memory_info()
    cpu_percent = process.cpu_percent(interval=0.1)
    
    return {
        "memory_mb": memory_info.rss / 1024 / 1024,
        "cpu_percent": cpu_percent,
        "time": datetime.now().isoformat()
    }

def log_resources(resources):
    """Log system resources"""
    logger.info(f"Memory: {resources['memory_mb']:.2f} MB, CPU: {resources['cpu_percent']:.2f}%")

def start_batch_processing(pdf_files, batch_id=None):
    """Start batch processing for a list of PDF files"""
    if batch_id is None:
        batch_id = f"test-batch-{uuid.uuid4()}"
    
    logger.info(f"Starting batch processing with ID: {batch_id}")
    
    # Prepare files for batch processing
    files = []
    for pdf_file in pdf_files:
        # Read PDF file
        with open(pdf_file, "rb") as f:
            pdf_data = f.read()
        
        # Encode as base64
        pdf_data_base64 = base64.b64encode(pdf_data).decode("utf-8")
        
        # Add to files list
        files.append({
            "name": os.path.basename(pdf_file),
            "file_data": pdf_data_base64,
            "file_id": f"test-{uuid.uuid4()}"
        })
    
    # Prepare request payload
    payload = {
        "batch_id": batch_id,
        "files": files,
        "settings": {
            "language": "en",
            "ocrEngine": "easyocr",
            "enableGpuAcceleration": True,
            "dpi": 300,
            "colorMode": "Color",
            "imageFormat": "png"
        }
    }
    
    # Start batch processing
    response = requests.post(
        f"{BASE_URL}/ocr/batch/start",
        json=payload
    )
    
    if response.status_code != 200:
        logger.error(f"Failed to start batch processing: {response.text}")
        return None
    
    logger.info(f"Batch processing started: {response.json()}")
    return batch_id

def monitor_batch_processing(batch_id, interval=5, max_time=600):
    """Monitor batch processing status"""
    start_time = time.time()
    resources_log = []
    
    while True:
        # Check if max time exceeded
        elapsed_time = time.time() - start_time
        if elapsed_time > max_time:
            logger.warning(f"Max monitoring time ({max_time}s) exceeded")
            break
        
        # Get batch status
        try:
            response = requests.get(f"{BASE_URL}/ocr/batch/status/{batch_id}")
            if response.status_code != 200:
                logger.error(f"Failed to get batch status: {response.text}")
                time.sleep(interval)
                continue
            
            status = response.json()
            
            # Monitor system resources
            resources = monitor_system_resources()
            resources_log.append(resources)
            log_resources(resources)
            
            # Log batch status
            logger.info(f"Batch status: {status['status']}, Progress: {status['progress_percentage']:.2f}%, "
                       f"Processed: {status['processed_count']}/{status['total_files']}")
            
            # Check if batch is completed
            if status['status'] in ['completed', 'error', 'cancelled']:
                logger.info(f"Batch processing {status['status']}")
                break
            
        except Exception as e:
            logger.error(f"Error monitoring batch: {e}")
        
        # Wait for next check
        time.sleep(interval)
    
    # Save resources log
    with open(f"batch_resources_{batch_id}.json", "w") as f:
        json.dump(resources_log, f, indent=2)
    
    return resources_log

def main():
    """Main function"""
    logger.info("Starting batch processing test")
    
    # Find PDF files in the current directory
    pdf_files = [f for f in os.listdir(".") if f.lower().endswith(".pdf")]
    
    if not pdf_files:
        logger.error("No PDF files found in the current directory")
        return
    
    logger.info(f"Found {len(pdf_files)} PDF files: {pdf_files}")
    
    # Start batch processing
    batch_id = start_batch_processing([os.path.join(".", pdf) for pdf in pdf_files[:3]])
    
    if batch_id:
        # Monitor batch processing
        resources_log = monitor_batch_processing(batch_id)
        
        # Analyze resource usage
        if resources_log:
            max_memory = max(r["memory_mb"] for r in resources_log)
            avg_memory = sum(r["memory_mb"] for r in resources_log) / len(resources_log)
            max_cpu = max(r["cpu_percent"] for r in resources_log)
            avg_cpu = sum(r["cpu_percent"] for r in resources_log) / len(resources_log)
            
            logger.info(f"Resource usage summary:")
            logger.info(f"  Max memory: {max_memory:.2f} MB")
            logger.info(f"  Avg memory: {avg_memory:.2f} MB")
            logger.info(f"  Max CPU: {max_cpu:.2f}%")
            logger.info(f"  Avg CPU: {avg_cpu:.2f}%")

if __name__ == "__main__":
    main()