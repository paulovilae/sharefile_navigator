#!/usr/bin/env python3
"""
Debug script to investigate duplicate PDF buttons and thumbnail issues
"""

import requests
import sqlite3
import json
from pathlib import Path

def check_database_duplicates():
    """Check for duplicate records in the database"""
    print("🔍 Checking for duplicate records in database...")
    
    try:
        conn = sqlite3.connect('ocr.db')
        cursor = conn.cursor()
        
        # Check for duplicate filenames in ocr_results
        cursor.execute("""
            SELECT filename, COUNT(*) as count, GROUP_CONCAT(id) as ids
            FROM ocr_results 
            WHERE filename LIKE '%.pdf'
            GROUP BY filename 
            HAVING COUNT(*) > 1
        """)
        
        duplicates = cursor.fetchall()
        if duplicates:
            print("❌ Found duplicate PDF records:")
            for filename, count, ids in duplicates:
                print(f"   📄 {filename}: {count} records (IDs: {ids})")
        else:
            print("✅ No duplicate PDF records found")
        
        # Check total PDF records
        cursor.execute("SELECT COUNT(*) FROM ocr_results WHERE filename LIKE '%.pdf'")
        total_pdfs = cursor.fetchone()[0]
        print(f"📊 Total PDF records: {total_pdfs}")
        
        # Check recent PDF records
        cursor.execute("""
            SELECT id, filename, status, created_at 
            FROM ocr_results 
            WHERE filename LIKE '%.pdf' 
            ORDER BY created_at DESC 
            LIMIT 5
        """)
        
        recent = cursor.fetchall()
        print("\n📋 Recent PDF records:")
        for record in recent:
            print(f"   ID: {record[0]}, File: {record[1]}, Status: {record[2]}, Created: {record[3]}")
        
        conn.close()
        return duplicates
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return []

def check_thumbnail_api():
    """Check thumbnail API responses"""
    print("\n🔍 Checking thumbnail API...")
    
    # Get a sample file ID from the database
    try:
        conn = sqlite3.connect('ocr.db')
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM ocr_results WHERE filename LIKE '%.pdf' LIMIT 1")
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            print("❌ No PDF records found in database")
            return
            
        file_id = result[0]
        print(f"🧪 Testing with file ID: {file_id}")
        
        # Test thumbnail endpoint
        thumbnail_url = f'http://localhost:8000/api/thumbnails/thumbnail/{file_id}'
        try:
            response = requests.get(thumbnail_url, timeout=5)
            print(f"📸 Thumbnail API ({thumbnail_url}):")
            print(f"   Status: {response.status_code}")
            print(f"   Content-Type: {response.headers.get('content-type', 'unknown')}")
            print(f"   Content-Length: {len(response.content)} bytes")
            print(f"   Thumbnail-Source: {response.headers.get('X-Thumbnail-Source', 'unknown')}")
        except Exception as e:
            print(f"❌ Thumbnail API error: {e}")
        
        # Test PDF endpoint
        pdf_url = f'http://localhost:8000/api/thumbnails/pdf/{file_id}'
        try:
            response = requests.head(pdf_url, timeout=5)  # Use HEAD to avoid downloading
            print(f"📄 PDF API ({pdf_url}):")
            print(f"   Status: {response.status_code}")
            print(f"   Content-Type: {response.headers.get('content-type', 'unknown')}")
            print(f"   Content-Length: {response.headers.get('content-length', 'unknown')}")
        except Exception as e:
            print(f"❌ PDF API error: {e}")
            
    except Exception as e:
        print(f"❌ Error getting file ID: {e}")

def check_thumbnails_table():
    """Check the thumbnails table"""
    print("\n🔍 Checking thumbnails table...")
    
    try:
        conn = sqlite3.connect('ocr.db')
        cursor = conn.cursor()
        
        # Check if thumbnails table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='thumbnails'")
        if not cursor.fetchone():
            print("❌ Thumbnails table does not exist")
            conn.close()
            return
        
        # Check thumbnail records
        cursor.execute("SELECT COUNT(*) FROM thumbnails")
        total_thumbnails = cursor.fetchone()[0]
        print(f"📊 Total thumbnail records: {total_thumbnails}")
        
        # Check for duplicates in thumbnails table
        cursor.execute("""
            SELECT file_id, COUNT(*) as count
            FROM thumbnails 
            GROUP BY file_id 
            HAVING COUNT(*) > 1
        """)
        
        thumb_duplicates = cursor.fetchall()
        if thumb_duplicates:
            print("❌ Found duplicate thumbnail records:")
            for file_id, count in thumb_duplicates:
                print(f"   📄 File ID {file_id}: {count} thumbnail records")
        else:
            print("✅ No duplicate thumbnail records found")
        
        # Show recent thumbnails
        cursor.execute("""
            SELECT file_id, source_type, file_size, created_at 
            FROM thumbnails 
            ORDER BY created_at DESC 
            LIMIT 5
        """)
        
        recent_thumbs = cursor.fetchall()
        print("\n📋 Recent thumbnail records:")
        for record in recent_thumbs:
            print(f"   File ID: {record[0]}, Type: {record[1]}, Size: {record[2]} bytes, Created: {record[3]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Thumbnails table error: {e}")

def main():
    print("🐛 DEBUG: Duplicate PDF Buttons & Thumbnail Issues")
    print("=" * 60)
    
    # Check for database duplicates
    duplicates = check_database_duplicates()
    
    # Check thumbnails table
    check_thumbnails_table()
    
    # Check API endpoints
    check_thumbnail_api()
    
    print("\n" + "=" * 60)
    print("🎯 DIAGNOSIS:")
    
    if duplicates:
        print("❌ ISSUE FOUND: Duplicate PDF records in database")
        print("   This could cause multiple ThumbnailViewer components to render")
        print("   for the same PDF, creating duplicate buttons.")
    else:
        print("✅ No duplicate PDF records found")
    
    print("\n💡 NEXT STEPS:")
    print("1. Check if the same PDF appears multiple times in the UI")
    print("2. Verify that each ThumbnailViewer has a unique key prop")
    print("3. Check if PDF pages are being treated as separate files")
    print("4. Examine the component rendering logic in PdfResultsDisplay")

if __name__ == "__main__":
    main()