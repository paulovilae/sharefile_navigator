#!/usr/bin/env python3
"""
Test script for the image search functionality.
Tests both backend API and database performance.
"""

import sys
import os
import time
import json
import requests
import sqlite3
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database import get_db_connection

def test_database_connection():
    """Test database connectivity and basic queries."""
    print("🔍 Testing database connection...")
    
    try:
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM ocr_results")
            total_records = cursor.fetchone()[0]
            print(f"✅ Database connected. Total OCR records: {total_records}")
            
            # Test records with images
            cursor = conn.execute("""
                SELECT COUNT(*) FROM ocr_results 
                WHERE (pdf_image_path IS NOT NULL OR ocr_image_path IS NOT NULL)
                AND status IN ('completed', 'ocr_processed', 'text_extracted', 'OCR Done')
            """)
            image_records = cursor.fetchone()[0]
            print(f"✅ Records with images: {image_records}")
            
            # Test text content availability
            cursor = conn.execute("""
                SELECT COUNT(*) FROM ocr_results 
                WHERE (pdf_text IS NOT NULL AND pdf_text != '') 
                OR (ocr_text IS NOT NULL AND ocr_text != '')
            """)
            text_records = cursor.fetchone()[0]
            print(f"✅ Records with text content: {text_records}")
            
            return True
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_search_performance():
    """Test search query performance."""
    print("\n🚀 Testing search performance...")
    
    try:
        with get_db_connection() as conn:
            # Test simple search
            start_time = time.time()
            cursor = conn.execute("""
                SELECT file_id, pdf_text, ocr_text, pdf_image_path, ocr_image_path
                FROM ocr_results 
                WHERE (pdf_text LIKE '%PACIENTE%' COLLATE NOCASE 
                       OR ocr_text LIKE '%PACIENTE%' COLLATE NOCASE)
                AND status IN ('completed', 'ocr_processed', 'text_extracted', 'OCR Done')
                LIMIT 10
            """)
            results = cursor.fetchall()
            search_time = (time.time() - start_time) * 1000
            
            print(f"✅ Simple search completed in {search_time:.2f}ms")
            print(f"✅ Found {len(results)} results")
            
            # Test complex search with multiple terms
            start_time = time.time()
            cursor = conn.execute("""
                SELECT file_id, 
                       CASE 
                           WHEN pdf_text IS NOT NULL AND pdf_text != '' THEN pdf_text
                           WHEN ocr_text IS NOT NULL AND ocr_text != '' THEN ocr_text
                           ELSE ''
                       END as text_content,
                       pdf_image_path, ocr_image_path
                FROM ocr_results 
                WHERE ((pdf_text LIKE '%HISTORIA%' COLLATE NOCASE AND pdf_text LIKE '%CLINICA%' COLLATE NOCASE)
                       OR (ocr_text LIKE '%HISTORIA%' COLLATE NOCASE AND ocr_text LIKE '%CLINICA%' COLLATE NOCASE))
                AND status IN ('completed', 'ocr_processed', 'text_extracted', 'OCR Done')
                AND (pdf_image_path IS NOT NULL OR ocr_image_path IS NOT NULL)
                ORDER BY created_at DESC
                LIMIT 5
            """)
            complex_results = cursor.fetchall()
            complex_search_time = (time.time() - start_time) * 1000
            
            print(f"✅ Complex search completed in {complex_search_time:.2f}ms")
            print(f"✅ Found {len(complex_results)} results")
            
            return True
            
    except Exception as e:
        print(f"❌ Search performance test failed: {e}")
        return False

def test_api_endpoints():
    """Test the search API endpoints."""
    print("\n🌐 Testing API endpoints...")
    
    base_url = "http://localhost:8000"
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running")
        else:
            print(f"❌ Backend server health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to backend server: {e}")
        print("💡 Make sure the backend server is running on port 8000")
        return False
    
    # Test image search endpoint
    try:
        search_data = {
            "query": "PACIENTE",
            "limit": 5,
            "offset": 0,
            "text_type": "all",
            "include_images": True,
            "include_snippets": True
        }
        
        start_time = time.time()
        response = requests.post(
            f"{base_url}/api/search/images",
            json=search_data,
            timeout=10
        )
        api_time = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Image search API working - {api_time:.2f}ms")
            print(f"✅ Found {data.get('total', 0)} total results")
            print(f"✅ Returned {len(data.get('results', []))} results")
            
            # Test a result with image
            results = data.get('results', [])
            if results:
                first_result = results[0]
                if first_result.get('pdf_image_path') or first_result.get('ocr_image_path'):
                    print("✅ Results include image paths")
                else:
                    print("⚠️  No image paths in results")
        else:
            print(f"❌ Image search API failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Image search API test failed: {e}")
        return False
    
    # Test suggestions endpoint
    try:
        response = requests.get(
            f"{base_url}/api/search/suggestions?q=PAC",
            timeout=5
        )
        
        if response.status_code == 200:
            suggestions = response.json().get('suggestions', [])
            print(f"✅ Suggestions API working - {len(suggestions)} suggestions")
        else:
            print(f"⚠️  Suggestions API returned: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Suggestions API test failed: {e}")
    
    return True

def test_image_serving():
    """Test image serving endpoints."""
    print("\n🖼️  Testing image serving...")
    
    base_url = "http://localhost:8000"
    
    # Get a sample image path from database
    try:
        with get_db_connection() as conn:
            cursor = conn.execute("""
                SELECT pdf_image_path, ocr_image_path 
                FROM ocr_results 
                WHERE (pdf_image_path IS NOT NULL OR ocr_image_path IS NOT NULL)
                LIMIT 1
            """)
            result = cursor.fetchone()
            
            if not result:
                print("⚠️  No image paths found in database")
                return True
            
            image_path = result[0] or result[1]
            if not image_path:
                print("⚠️  No valid image path found")
                return True
            
            # Parse JSON array if needed
            if image_path.startswith('['):
                try:
                    paths = json.loads(image_path)
                    if isinstance(paths, list) and len(paths) > 0:
                        image_path = paths[0]
                except json.JSONDecodeError:
                    pass
            
            print(f"Testing with image path: {image_path[:50]}...")
            
            # Test image serving
            try:
                response = requests.get(
                    f"{base_url}/api/images/serve",
                    params={"path": image_path},
                    timeout=10
                )
                
                if response.status_code == 200:
                    print("✅ Image serving API working")
                    print(f"✅ Content type: {response.headers.get('content-type')}")
                    print(f"✅ Content length: {len(response.content)} bytes")
                elif response.status_code == 404:
                    print("⚠️  Image file not found (expected if files were moved)")
                elif response.status_code == 403:
                    print("⚠️  Image access denied (security check)")
                else:
                    print(f"❌ Image serving failed: {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                print(f"❌ Image serving test failed: {e}")
                return False
                
    except Exception as e:
        print(f"❌ Image serving test setup failed: {e}")
        return False
    
    return True

def run_comprehensive_test():
    """Run all tests and provide a summary."""
    print("🧪 Starting comprehensive image search test...\n")
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Search Performance", test_search_performance),
        ("API Endpoints", test_api_endpoints),
        ("Image Serving", test_image_serving),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Running: {test_name}")
        print('='*50)
        
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results[test_name] = False
    
    # Summary
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print('='*50)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Image search system is ready.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please check the issues above.")
    
    return passed == total

if __name__ == "__main__":
    success = run_comprehensive_test()
    sys.exit(0 if success else 1)