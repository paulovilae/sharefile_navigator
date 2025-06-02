#!/usr/bin/env python3
"""
Test script to verify preloaded image functionality.
This script checks if preloaded images are properly accessible.
"""

import requests
import json
import sys
import os

# Configuration
BACKEND_URL = "http://localhost:8000"
TEST_FILE_ID = "your_test_file_id_here"  # Replace with actual file ID

def test_preload_check(file_id):
    """Test the preload check endpoint."""
    print(f"Testing preload check for file: {file_id}")
    
    try:
        response = requests.get(f"{BACKEND_URL}/api/ocr/preload_check/{file_id}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Preload check successful")
            print(f"   Preloaded: {data.get('preloaded', False)}")
            print(f"   Availability: {data.get('availability', {})}")
            if 'cached_data' in data:
                cached = data['cached_data']
                print(f"   Cached PDF images: {cached.get('pdf_images', {}).get('count', 0)}")
                print(f"   Cached OCR images: {cached.get('ocr_images', {}).get('count', 0)}")
            return data
        else:
            print(f"❌ Preload check failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error during preload check: {e}")
        return None

def test_preloaded_ocr(file_id):
    """Test the preloaded OCR endpoint."""
    print(f"\nTesting preloaded OCR for file: {file_id}")
    
    try:
        payload = {
            "file_data": "",  # Empty for preloaded
            "filename": "test_file.pdf",
            "settings": {
                "dpi": 300,
                "ocrEngine": "easyocr"
            }
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/ocr/pdf_ocr_with_preload?file_id={file_id}",
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Preloaded OCR successful")
            print(f"   Status: {data.get('status')}")
            print(f"   Source: {data.get('source')}")
            print(f"   Pages: {data.get('pageCount', 0)}")
            print(f"   Total words: {data.get('totalWords', 0)}")
            
            # Check image URLs
            pages = data.get('pages', [])
            for i, page in enumerate(pages):
                image_url = page.get('imageUrl', '')
                if image_url:
                    print(f"   Page {i+1} image URL: {image_url}")
                    # Test if image is accessible
                    try:
                        img_response = requests.head(f"{BACKEND_URL}{image_url}")
                        if img_response.status_code == 200:
                            print(f"     ✅ Image accessible")
                        else:
                            print(f"     ❌ Image not accessible: {img_response.status_code}")
                    except Exception as e:
                        print(f"     ❌ Error accessing image: {e}")
                else:
                    print(f"   Page {i+1}: No image URL")
            
            return data
        else:
            print(f"❌ Preloaded OCR failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error during preloaded OCR: {e}")
        return None

def test_image_endpoints():
    """Test image serving endpoints."""
    print(f"\nTesting image endpoints...")
    
    # Test regular image endpoint
    try:
        response = requests.get(f"{BACKEND_URL}/api/ocr/image?path=test/path")
        print(f"Regular image endpoint status: {response.status_code}")
    except Exception as e:
        print(f"Error testing regular image endpoint: {e}")
    
    # Test preloaded image endpoint
    try:
        response = requests.get(f"{BACKEND_URL}/api/ocr/preloaded_image?file_id=test&page=1&filename=test.png")
        print(f"Preloaded image endpoint status: {response.status_code}")
    except Exception as e:
        print(f"Error testing preloaded image endpoint: {e}")

def list_processed_files():
    """List files that have been processed and might have preloaded data."""
    print("\nListing processed files from database...")
    
    try:
        # This would require a database query endpoint
        # For now, we'll just suggest manual checking
        print("💡 To find processed files, check your database:")
        print("   SELECT file_id, status, pdf_text IS NOT NULL as has_pdf_text,")
        print("          ocr_text IS NOT NULL as has_ocr_text,")
        print("          pdf_image_path IS NOT NULL as has_pdf_images")
        print("   FROM ocr_results")
        print("   WHERE status IN ('completed', 'ocr_processed', 'text_extracted', 'OCR Done');")
        
    except Exception as e:
        print(f"Error listing processed files: {e}")

def main():
    """Main test function."""
    print("🧪 Testing Preloaded Images System")
    print("=" * 50)
    
    # Test basic endpoints
    test_image_endpoints()
    
    # List processed files
    list_processed_files()
    
    # If a test file ID is provided, test it
    if len(sys.argv) > 1:
        test_file_id = sys.argv[1]
        print(f"\n🎯 Testing with file ID: {test_file_id}")
        
        # Test preload check
        preload_data = test_preload_check(test_file_id)
        
        # Test preloaded OCR if data exists
        if preload_data and preload_data.get('preloaded', False):
            test_preloaded_ocr(test_file_id)
        else:
            print("⚠️  No preloaded data found for this file")
    else:
        print("\n💡 Usage: python test_preloaded_images.py <file_id>")
        print("   Replace <file_id> with an actual SharePoint file ID that has been processed")
    
    print("\n✅ Test completed!")

if __name__ == "__main__":
    main()