#!/usr/bin/env python3
"""
Comprehensive script to find SharePoint file IDs and fix their OCR status.
This script will help identify the actual file IDs and update their status correctly.
"""

import requests
import json
import sys
import time

# Configuration
BASE_URL = "http://localhost:8000"

def get_sharepoint_files():
    """Get list of SharePoint files to find the correct file IDs"""
    print("🔍 Fetching SharePoint files to find correct file IDs...")
    
    # This would need to be adapted based on your SharePoint API structure
    # For now, we'll provide instructions on how to find the IDs manually
    print("\n📋 To find the correct SharePoint file IDs:")
    print("1. Open your browser and go to the SharePoint file table")
    print("2. Open Developer Tools (F12)")
    print("3. Go to the Network tab")
    print("4. Refresh the page or navigate to the files")
    print("5. Look for API calls like '/api/sharepoint/files' or similar")
    print("6. Find the response containing file data")
    print("7. Look for files named 'FDE.PDF' and '28052025_INGRESO_2038965.pdf'")
    print("8. Copy their 'id' field values")
    
    return None

def check_current_status(file_id):
    """Check the current status of a file in the database"""
    try:
        url = f"{BASE_URL}/api/ocr/status/{file_id}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            return result.get('status'), result
        elif response.status_code == 404:
            return None, {"error": "No record found"}
        else:
            return "error", {"error": f"HTTP {response.status_code}"}
    except Exception as e:
        return "error", {"error": str(e)}

def update_file_status(file_id, status, description=""):
    """Update the OCR status for a specific file"""
    url = f"{BASE_URL}/api/ocr/update_status/{file_id}"
    params = {"status": status}
    
    try:
        response = requests.post(url, params=params, timeout=10)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Successfully updated {file_id}: {status}")
            if description:
                print(f"   Description: {description}")
            return True
        else:
            print(f"❌ Failed to update {file_id}: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error updating {file_id}: {str(e)}")
        return False

def interactive_file_id_input():
    """Interactive input for file IDs"""
    print("\n📝 Please provide the SharePoint file IDs:")
    print("(You can find these in the browser dev tools as described above)")
    
    files_to_update = []
    
    # Get FDE.PDF file ID
    print(f"\n🔍 For file: FDE.PDF")
    print("   Expected status: text_extracted (Text Extracted)")
    fde_id = input("   Enter SharePoint file ID: ").strip()
    if fde_id:
        files_to_update.append({
            "file_id": fde_id,
            "filename": "FDE.PDF",
            "status": "text_extracted",
            "description": "Text was extracted from embedded PDF text"
        })
    
    # Get 28052025_INGRESO file ID
    print(f"\n🔍 For file: 28052025_INGRESO_2038965.pdf")
    print("   Expected status: ocr_processed (OCR Processed)")
    ingreso_id = input("   Enter SharePoint file ID: ").strip()
    if ingreso_id:
        files_to_update.append({
            "file_id": ingreso_id,
            "filename": "28052025_INGRESO_2038965.pdf", 
            "status": "ocr_processed",
            "description": "Text was extracted using OCR processing"
        })
    
    return files_to_update

def test_common_file_ids():
    """Test some common patterns that might be the file IDs"""
    print("\n🧪 Testing common file ID patterns...")
    
    # Common SharePoint ID patterns
    test_patterns = [
        "FDE.PDF",
        "28052025_INGRESO_2038965.pdf",
        "fde.pdf",
        "28052025_ingreso_2038965.pdf"
    ]
    
    found_files = []
    
    for pattern in test_patterns:
        print(f"   Testing: {pattern}")
        status, result = check_current_status(pattern)
        if status and status != "error":
            print(f"   ✅ Found record with status: {status}")
            found_files.append({"file_id": pattern, "status": status, "result": result})
        elif result.get("error") == "No record found":
            print(f"   ❌ No record found")
        else:
            print(f"   ❌ Error: {result.get('error', 'Unknown error')}")
    
    return found_files

def main():
    print("🔧 SharePoint File Status Fix Tool")
    print("=" * 50)
    
    # Test if backend is running
    try:
        response = requests.get(f"{BASE_URL}/api/ocr/test", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running")
        else:
            print("⚠️  Backend server responded but may have issues")
    except:
        print("❌ Backend server is not running or not accessible")
        print("   Please start it with: cd backend && uvicorn app.main:app --reload --port 8000")
        return
    
    # Test common file ID patterns first
    found_files = test_common_file_ids()
    
    if found_files:
        print(f"\n🎉 Found {len(found_files)} existing records!")
        for file_info in found_files:
            print(f"   File ID: {file_info['file_id']}")
            print(f"   Current Status: {file_info['status']}")
            print()
        
        # Ask if user wants to update these
        update_choice = input("Do you want to update the status for these files? (y/n): ").strip().lower()
        if update_choice == 'y':
            for file_info in found_files:
                file_id = file_info['file_id']
                if "fde" in file_id.lower():
                    new_status = "text_extracted"
                    description = "FDE.PDF - Text extracted from embedded PDF"
                elif "ingreso" in file_id.lower():
                    new_status = "ocr_processed" 
                    description = "28052025_INGRESO - OCR processed"
                else:
                    continue
                
                update_file_status(file_id, new_status, description)
    else:
        print("\n❌ No existing records found with common patterns")
        print("   You'll need to provide the actual SharePoint file IDs")
        
        # Get file IDs interactively
        files_to_update = interactive_file_id_input()
        
        if files_to_update:
            print(f"\n🔄 Updating {len(files_to_update)} files...")
            success_count = 0
            
            for file_info in files_to_update:
                # Check current status first
                current_status, current_result = check_current_status(file_info['file_id'])
                print(f"\n📋 File: {file_info['filename']}")
                print(f"   File ID: {file_info['file_id']}")
                print(f"   Current Status: {current_status or 'No record'}")
                print(f"   Target Status: {file_info['status']}")
                
                if update_file_status(file_info['file_id'], file_info['status'], file_info['description']):
                    success_count += 1
            
            print(f"\n📊 Results: {success_count}/{len(files_to_update)} files updated successfully")
        else:
            print("\n⚠️  No file IDs provided")
    
    print("\n📝 Next steps:")
    print("1. Refresh your SharePoint file table page")
    print("2. Check if the status now shows correctly")
    print("3. If still incorrect, verify the file IDs are correct")
    print("4. Check browser console for any JavaScript errors")

if __name__ == "__main__":
    main()