#!/usr/bin/env python3
"""
Test script to verify the OCR status update functionality works correctly.
"""

import requests
import json
import sys
import time

# Configuration
BASE_URL = "http://localhost:8000"

def test_status_update():
    """Test the status update endpoint with a dummy file ID"""
    print("🧪 Testing OCR Status Update Endpoint")
    print("=" * 50)
    
    # Test file ID (dummy for testing)
    test_file_id = f"test_file_{int(time.time())}"
    test_status = "text_extracted"
    
    print(f"📝 Testing with file ID: {test_file_id}")
    print(f"📝 Setting status to: {test_status}")
    
    # Test the update endpoint
    url = f"{BASE_URL}/api/ocr/update_status/{test_file_id}"
    params = {"status": test_status}
    
    try:
        print(f"\n🔄 Making request to: {url}")
        response = requests.post(url, params=params, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Status update successful!")
            print(f"   Response: {json.dumps(result, indent=2)}")
            
            # Test retrieving the status
            print(f"\n🔍 Testing status retrieval...")
            status_url = f"{BASE_URL}/api/ocr/status/{test_file_id}"
            status_response = requests.get(status_url, timeout=10)
            
            if status_response.status_code == 200:
                status_result = status_response.json()
                print(f"✅ Status retrieval successful!")
                print(f"   Status: {status_result.get('status')}")
                print(f"   File ID: {status_result.get('file_id')}")
                return True
            else:
                print(f"❌ Status retrieval failed: {status_response.status_code}")
                print(f"   Response: {status_response.text}")
                return False
                
        else:
            print(f"❌ Status update failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection failed - is the backend server running on {BASE_URL}?")
        print("   Start the backend with: cd backend && uvicorn app.main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_status_mapping():
    """Test different status values to ensure they're handled correctly"""
    print("\n🧪 Testing Status Mapping")
    print("=" * 30)
    
    test_statuses = [
        "text_extracted",
        "ocr_processed", 
        "pending",
        "error",
        "needs manual review"
    ]
    
    success_count = 0
    for i, status in enumerate(test_statuses):
        test_file_id = f"test_mapping_{int(time.time())}_{i}"
        url = f"{BASE_URL}/api/ocr/update_status/{test_file_id}"
        params = {"status": status}
        
        try:
            response = requests.post(url, params=params, timeout=5)
            if response.status_code == 200:
                print(f"✅ {status}")
                success_count += 1
            else:
                print(f"❌ {status} - {response.status_code}")
        except Exception as e:
            print(f"❌ {status} - Error: {str(e)}")
    
    print(f"\n📊 Status mapping test: {success_count}/{len(test_statuses)} successful")
    return success_count == len(test_statuses)

def main():
    print("🔧 OCR Status Update Test Suite")
    print("=" * 50)
    
    # Test basic functionality
    basic_test_passed = test_status_update()
    
    # Test status mapping if basic test passed
    mapping_test_passed = False
    if basic_test_passed:
        mapping_test_passed = test_status_mapping()
    
    # Summary
    print("\n📋 Test Summary")
    print("=" * 20)
    print(f"Basic functionality: {'✅ PASS' if basic_test_passed else '❌ FAIL'}")
    print(f"Status mapping: {'✅ PASS' if mapping_test_passed else '❌ FAIL'}")
    
    if basic_test_passed and mapping_test_passed:
        print("\n🎉 All tests passed! The OCR status update functionality is working correctly.")
        print("\n📝 Next steps:")
        print("1. Find the actual SharePoint file IDs for your processed files")
        print("2. Run the fix_ocr_status.py script with the real file IDs")
        print("3. Check the SharePoint file table to verify status display")
    else:
        print("\n⚠️  Some tests failed. Please check:")
        print("1. Backend server is running (uvicorn app.main:app --reload --port 8000)")
        print("2. Database is accessible")
        print("3. OCR API endpoints are properly configured")

if __name__ == "__main__":
    main()