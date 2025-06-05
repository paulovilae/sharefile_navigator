#!/usr/bin/env python3
"""
Test script to verify batch processing current file tracking
"""
import requests
import time
import json

def test_batch_processing():
    """Test the batch processing API to verify current file tracking"""
    base_url = "http://localhost:8000"
    
    # Test data - simulate some files for processing
    test_files = [
        {
            "name": "test_file_1.pdf",
            "item_id": "test_id_1",
            "drive_id": "test_drive_1",
            "size": 1024,
            "modified": "2025-01-06T10:00:00Z"
        },
        {
            "name": "test_file_2.pdf", 
            "item_id": "test_id_2",
            "drive_id": "test_drive_2",
            "size": 2048,
            "modified": "2025-01-06T10:01:00Z"
        },
        {
            "name": "test_file_3.pdf",
            "item_id": "test_id_3", 
            "drive_id": "test_drive_3",
            "size": 3072,
            "modified": "2025-01-06T10:02:00Z"
        }
    ]
    
    settings = {
        "dpi": 300,
        "imageFormat": "PNG",
        "colorMode": "RGB",
        "pageRange": "all",
        "ocrEngine": "easyocr",
        "language": "spa",
        "confidenceThreshold": 0.7,
        "enableGpuAcceleration": True,
        "batchSize": 5,
        "autoSave": True
    }
    
    batch_id = f"test_batch_{int(time.time())}"
    
    print(f"🧪 Testing batch processing with batch_id: {batch_id}")
    print(f"📁 Test files: {len(test_files)} files")
    
    try:
        # 1. Start batch processing
        print("\n1️⃣ Starting batch processing...")
        start_response = requests.post(f"{base_url}/api/ocr/batch/start", json={
            "batch_id": batch_id,
            "files": test_files,
            "settings": settings
        })
        
        if start_response.status_code != 200:
            print(f"❌ Failed to start batch processing: {start_response.status_code}")
            print(f"Response: {start_response.text}")
            return
            
        print("✅ Batch processing started successfully")
        
        # 2. Monitor progress for a few iterations
        print("\n2️⃣ Monitoring progress...")
        for i in range(10):  # Monitor for 10 iterations
            time.sleep(2)  # Wait 2 seconds between checks
            
            status_response = requests.get(f"{base_url}/api/ocr/batch/status/{batch_id}")
            
            if status_response.status_code != 200:
                print(f"❌ Failed to get status: {status_response.status_code}")
                break
                
            status = status_response.json()
            
            print(f"\n📊 Iteration {i+1}:")
            print(f"   Status: {status['status']}")
            print(f"   Progress: {status['progress_percentage']:.1f}%")
            print(f"   Processed: {status['processed_count']}/{status['total_files']}")
            print(f"   Failed: {status['failed_count']}")
            print(f"   Current file index: {status['current_file_index']}")
            
            if status['current_file']:
                print(f"   Current file: {status['current_file']['name']}")
            else:
                print(f"   Current file: None")
                
            # Check if processing is complete
            if status['status'] in ['completed', 'error', 'cancelled']:
                print(f"\n🏁 Batch processing finished with status: {status['status']}")
                break
                
        # 3. Get final status
        print("\n3️⃣ Final status check...")
        final_response = requests.get(f"{base_url}/api/ocr/batch/status/{batch_id}")
        if final_response.status_code == 200:
            final_status = final_response.json()
            print(f"Final status: {final_status['status']}")
            print(f"Total processed: {final_status['processed_count']}")
            print(f"Total failed: {final_status['failed_count']}")
            print(f"Logs count: {len(final_status['logs'])}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the server. Make sure the backend is running on localhost:8000")
    except Exception as e:
        print(f"❌ Error during testing: {e}")

if __name__ == "__main__":
    test_batch_processing()