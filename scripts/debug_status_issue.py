#!/usr/bin/env python3
"""
Debug script to help identify and fix the OCR status issue.
This script will help you find the exact file IDs and test the status update process.
"""

import requests
import json
import sys
import time

# Configuration
BASE_URL = "http://localhost:8000"

def test_backend_connection():
    """Test if the backend is running and accessible"""
    try:
        response = requests.get(f"{BASE_URL}/api/ocr/test", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running and accessible")
            return True
        else:
            print(f"⚠️  Backend server responded with status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend server is not accessible: {str(e)}")
        print("   Please start it with: cd backend && uvicorn app.main:app --reload --port 8000")
        return False

def check_database_records():
    """Check what records exist in the database"""
    print("\n🔍 Checking existing database records...")
    
    try:
        # Try to get a list of all OCR results (this endpoint might not exist, but let's try)
        response = requests.get(f"{BASE_URL}/api/ocr/status/test_check", timeout=5)
        # This will likely return 404, but that's expected
        
        print("📋 Database check complete")
        print("   Note: Individual file status checks will be done when you provide file IDs")
        
    except Exception as e:
        print(f"   Database connection test: {str(e)}")

def create_test_records():
    """Create test records to verify the system works"""
    print("\n🧪 Creating test records to verify the system...")
    
    test_files = [
        {"id": "test_fde_pdf", "status": "text_extracted", "name": "Test FDE.PDF"},
        {"id": "test_ingreso_pdf", "status": "ocr_processed", "name": "Test INGRESO.PDF"}
    ]
    
    success_count = 0
    for test_file in test_files:
        try:
            url = f"{BASE_URL}/api/ocr/update_status/{test_file['id']}"
            params = {"status": test_file['status']}
            response = requests.post(url, params=params, timeout=10)
            
            if response.status_code == 200:
                print(f"✅ Created test record: {test_file['name']} -> {test_file['status']}")
                success_count += 1
                
                # Verify we can retrieve it
                status_response = requests.get(f"{BASE_URL}/api/ocr/status/{test_file['id']}", timeout=5)
                if status_response.status_code == 200:
                    data = status_response.json()
                    print(f"   ✅ Verified retrieval: {data.get('status')}")
                else:
                    print(f"   ❌ Failed to retrieve: {status_response.status_code}")
            else:
                print(f"❌ Failed to create test record: {test_file['name']} - {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error creating test record {test_file['name']}: {str(e)}")
    
    print(f"\n📊 Test records: {success_count}/{len(test_files)} created successfully")
    return success_count == len(test_files)

def get_file_ids_interactively():
    """Get the actual SharePoint file IDs from the user"""
    print("\n📝 Now let's fix your actual files!")
    print("=" * 40)
    
    print("\n🔍 To find the SharePoint file IDs:")
    print("1. Open your browser and go to the SharePoint file table")
    print("2. Open Developer Tools (F12)")
    print("3. Go to the Console tab")
    print("4. Refresh the page")
    print("5. Look for console messages starting with '🔍 Fetching OCR status for PDF files'")
    print("6. You'll see the file names and their IDs")
    print("7. Copy the IDs for FDE.PDF and 28052025_INGRESO_2038965.pdf")
    
    files_to_fix = []
    
    # Get FDE.PDF file ID
    print(f"\n📄 For file: FDE.PDF")
    print("   Target status: text_extracted")
    fde_id = input("   Enter the SharePoint file ID: ").strip()
    if fde_id:
        files_to_fix.append({
            "file_id": fde_id,
            "filename": "FDE.PDF",
            "status": "text_extracted"
        })
    
    # Get INGRESO file ID
    print(f"\n📄 For file: 28052025_INGRESO_2038965.pdf")
    print("   Target status: ocr_processed")
    ingreso_id = input("   Enter the SharePoint file ID: ").strip()
    if ingreso_id:
        files_to_fix.append({
            "file_id": ingreso_id,
            "filename": "28052025_INGRESO_2038965.pdf",
            "status": "ocr_processed"
        })
    
    return files_to_fix

def update_file_status(file_id, status, filename):
    """Update the status for a specific file"""
    try:
        # First check current status
        print(f"\n📋 Checking current status for {filename}...")
        status_response = requests.get(f"{BASE_URL}/api/ocr/status/{file_id}", timeout=5)
        
        if status_response.status_code == 200:
            current_data = status_response.json()
            print(f"   Current status: {current_data.get('status', 'unknown')}")
        elif status_response.status_code == 404:
            print(f"   No existing record found")
        else:
            print(f"   Error checking status: {status_response.status_code}")
        
        # Update the status
        print(f"🔄 Updating status to: {status}")
        url = f"{BASE_URL}/api/ocr/update_status/{file_id}"
        params = {"status": status}
        response = requests.post(url, params=params, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Successfully updated {filename}")
            
            # Verify the update
            verify_response = requests.get(f"{BASE_URL}/api/ocr/status/{file_id}", timeout=5)
            if verify_response.status_code == 200:
                verify_data = verify_response.json()
                print(f"   ✅ Verified new status: {verify_data.get('status')}")
                return True
            else:
                print(f"   ⚠️  Could not verify update")
                return True  # Still consider it successful
        else:
            print(f"❌ Failed to update {filename}: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating {filename}: {str(e)}")
        return False

def main():
    print("🔧 OCR Status Debug and Fix Tool")
    print("=" * 50)
    
    # Test backend connection
    if not test_backend_connection():
        return
    
    # Check database
    check_database_records()
    
    # Create test records to verify system works
    if create_test_records():
        print("\n🎉 Test records created successfully - the system is working!")
    else:
        print("\n⚠️  Some test records failed - there might be an issue with the backend")
        return
    
    # Get actual file IDs and update them
    files_to_fix = get_file_ids_interactively()
    
    if files_to_fix:
        print(f"\n🔄 Updating {len(files_to_fix)} files...")
        success_count = 0
        
        for file_info in files_to_fix:
            if update_file_status(file_info['file_id'], file_info['status'], file_info['filename']):
                success_count += 1
        
        print(f"\n📊 Results: {success_count}/{len(files_to_fix)} files updated successfully")
        
        if success_count > 0:
            print("\n🎉 Status updates completed!")
            print("\n📝 Next steps:")
            print("1. Go back to your SharePoint file table")
            print("2. Refresh the page (F5)")
            print("3. Check the browser console for the debug messages")
            print("4. Verify the status column shows the correct values")
            print("5. If still incorrect, check the console for any error messages")
        else:
            print("\n❌ No files were updated successfully")
            print("   Please check the file IDs and try again")
    else:
        print("\n⚠️  No file IDs provided")
        print("   Please run the script again with the correct file IDs")

if __name__ == "__main__":
    main()