#!/usr/bin/env python3
"""
Script to fix OCR status for files that have been processed but don't have correct status in database.
This addresses the issue where processing results show correct status but database shows incorrect status.
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000"  # Adjust if your backend runs on different port

def update_file_status(file_id, status, description=""):
    """Update the OCR status for a specific file"""
    url = f"{BASE_URL}/api/ocr/update_status/{file_id}"
    
    # Prepare the request data
    params = {
        "status": status
    }
    
    try:
        response = requests.post(url, params=params)
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

def main():
    print("🔧 OCR Status Fix Script")
    print("=" * 50)
    
    # Files to fix based on the user's screenshots
    files_to_fix = [
        {
            "file_id": "FDE_PDF_ID",  # Replace with actual SharePoint file ID
            "status": "text_extracted",
            "description": "FDE.PDF - Text was extracted from embedded PDF text"
        },
        {
            "file_id": "28052025_INGRESO_ID",  # Replace with actual SharePoint file ID  
            "status": "ocr_processed",
            "description": "28052025_INGRESO_2038965.pdf - Text was extracted using OCR processing"
        }
    ]
    
    print("Note: You need to replace the file_id values with the actual SharePoint file IDs")
    print("You can find these IDs by:")
    print("1. Looking at the browser network tab when viewing the files")
    print("2. Checking the SharePoint file table data")
    print("3. Using the SharePoint API to list files")
    print()
    
    # Ask user if they want to proceed with example IDs or provide real ones
    choice = input("Do you want to:\n1. Provide real file IDs now\n2. Exit and update the script manually\nChoice (1/2): ").strip()
    
    if choice == "1":
        print("\nPlease provide the actual SharePoint file IDs:")
        
        # Get FDE.PDF file ID
        fde_id = input("Enter the SharePoint file ID for FDE.PDF: ").strip()
        if fde_id:
            files_to_fix[0]["file_id"] = fde_id
        
        # Get 28052025_INGRESO file ID  
        ingreso_id = input("Enter the SharePoint file ID for 28052025_INGRESO_2038965.pdf: ").strip()
        if ingreso_id:
            files_to_fix[1]["file_id"] = ingreso_id
        
        # Update the files
        success_count = 0
        for file_info in files_to_fix:
            if file_info["file_id"] and not file_info["file_id"].endswith("_ID"):
                if update_file_status(file_info["file_id"], file_info["status"], file_info["description"]):
                    success_count += 1
            else:
                print(f"⚠️  Skipping {file_info['description']} - no valid file ID provided")
        
        print(f"\n📊 Results: {success_count}/{len([f for f in files_to_fix if f['file_id'] and not f['file_id'].endswith('_ID')])} files updated successfully")
        
    else:
        print("\n📝 To use this script:")
        print("1. Edit this file (scripts/fix_ocr_status.py)")
        print("2. Replace 'FDE_PDF_ID' and '28052025_INGRESO_ID' with actual SharePoint file IDs")
        print("3. Run the script again")
        print("\nTo find the file IDs:")
        print("- Open browser dev tools (F12)")
        print("- Go to Network tab")
        print("- Navigate to the SharePoint file table")
        print("- Look for API calls to /api/sharepoint/files or similar")
        print("- Find the 'id' field for each file in the response")

if __name__ == "__main__":
    main()