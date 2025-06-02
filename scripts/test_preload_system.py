#!/usr/bin/env python3
"""
Test script for the OCR preloading system.

This script tests the preloading functionality by:
1. Checking what files are available for preloading
2. Testing preload operations
3. Verifying cached data retrieval
4. Testing the preload API endpoints
"""

import os
import sys
import requests
import json
import time
from typing import Dict, List

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.utils.preload_utils import preload_manager, get_cached_text, get_cached_image_paths, is_data_preloaded
from app.utils.cache_utils import get_cache_stats, clear_cache
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ocr.db')
API_BASE_URL = "http://localhost:8000"

def test_database_connection():
    """Test database connection and get basic stats."""
    print("🔍 Testing database connection...")
    try:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        db = SessionLocal()
        from app.models import OcrResult
        
        total_files = db.query(OcrResult).count()
        processed_files = db.query(OcrResult).filter(
            OcrResult.status.in_(['completed', 'ocr_processed', 'text_extracted', 'OCR Done'])
        ).count()
        
        db.close()
        
        print(f"✅ Database connected successfully")
        print(f"   Total files: {total_files}")
        print(f"   Processed files: {processed_files}")
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_preload_manager():
    """Test the preload manager functionality."""
    print("\n🔧 Testing preload manager...")
    
    try:
        # Get processed files
        processed_files = preload_manager.get_processed_files()
        print(f"✅ Found {len(processed_files)} processed files")
        
        if processed_files:
            # Test preloading the first file
            test_file = processed_files[0]
            file_id = test_file['file_id']
            print(f"   Testing with file: {file_id}")
            
            # Check availability
            availability = preload_manager.check_preload_availability(file_id)
            print(f"   Availability: {availability}")
            
            # Test preloading
            result = preload_manager.preload_file_complete(file_id)
            print(f"   Preload result: {result.get('success', False)}")
            
            # Check if data is now cached
            preload_status = is_data_preloaded(file_id)
            print(f"   Preload status: {preload_status}")
            
            # Try to get cached data
            cached_text = get_cached_text(file_id, 'auto')
            if cached_text:
                print(f"   Cached text length: {len(cached_text)} characters")
            
            cached_images = get_cached_image_paths(file_id, 'auto')
            if cached_images:
                print(f"   Cached images: {len(cached_images)} paths")
        
        return True
        
    except Exception as e:
        print(f"❌ Preload manager test failed: {e}")
        return False

def test_cache_stats():
    """Test cache statistics."""
    print("\n📊 Testing cache statistics...")
    
    try:
        stats = get_cache_stats()
        print(f"✅ Cache stats retrieved:")
        for cache_name, cache_stats in stats.items():
            print(f"   {cache_name}: {cache_stats}")
        
        preload_stats = preload_manager.get_preload_stats()
        print(f"✅ Preload stats: {preload_stats}")
        
        return True
        
    except Exception as e:
        print(f"❌ Cache stats test failed: {e}")
        return False

def test_api_endpoints():
    """Test the preload API endpoints."""
    print("\n🌐 Testing API endpoints...")
    
    try:
        # Test status endpoint
        response = requests.get(f"{API_BASE_URL}/api/preload/status")
        if response.status_code == 200:
            print("✅ Status endpoint working")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Status endpoint failed: {response.status_code}")
            return False
        
        # Test processed files endpoint
        response = requests.get(f"{API_BASE_URL}/api/preload/processed")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Processed files endpoint working: {data['total_files']} files")
        else:
            print(f"❌ Processed files endpoint failed: {response.status_code}")
            return False
        
        # If we have files, test file-specific endpoints
        if data['total_files'] > 0:
            test_file_id = data['files'][0]['file_id']
            
            # Test check endpoint
            response = requests.get(f"{API_BASE_URL}/api/preload/check/{test_file_id}")
            if response.status_code == 200:
                print(f"✅ Check endpoint working for file {test_file_id}")
                check_data = response.json()
                print(f"   Availability: {check_data['availability']}")
            else:
                print(f"❌ Check endpoint failed: {response.status_code}")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ API server not running. Start the server with: uvicorn app.main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

def test_batch_preload():
    """Test batch preloading functionality."""
    print("\n📦 Testing batch preload...")
    
    try:
        # Get a few files for testing
        processed_files = preload_manager.get_processed_files()
        if len(processed_files) == 0:
            print("⚠️  No processed files available for batch testing")
            return True
        
        # Test with first 3 files or all if less than 3
        test_files = processed_files[:min(3, len(processed_files))]
        file_ids = [f['file_id'] for f in test_files]
        
        print(f"   Testing batch preload with {len(file_ids)} files")
        
        # Clear cache first to test fresh preload
        clear_cache('all')
        
        # Run batch preload
        result = preload_manager.preload_batch(file_ids=file_ids)
        print(f"✅ Batch preload completed:")
        print(f"   Successful: {result.get('successful', 0)}")
        print(f"   Failed: {result.get('failed', 0)}")
        
        # Verify some files are now cached
        cached_count = 0
        for file_id in file_ids:
            if any(is_data_preloaded(file_id).values()):
                cached_count += 1
        
        print(f"   Files now cached: {cached_count}/{len(file_ids)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Batch preload test failed: {e}")
        return False

def test_performance():
    """Test performance improvements from preloading."""
    print("\n⚡ Testing performance improvements...")
    
    try:
        processed_files = preload_manager.get_processed_files()
        if len(processed_files) == 0:
            print("⚠️  No processed files available for performance testing")
            return True
        
        test_file = processed_files[0]
        file_id = test_file['file_id']
        
        # Clear cache first
        clear_cache('all')
        
        # Time cold access (no cache)
        start_time = time.time()
        result1 = preload_manager.preload_file_complete(file_id)
        cold_time = time.time() - start_time
        
        # Time warm access (with cache)
        start_time = time.time()
        cached_text = get_cached_text(file_id, 'auto')
        cached_images = get_cached_image_paths(file_id, 'auto')
        warm_time = time.time() - start_time
        
        print(f"✅ Performance test completed:")
        print(f"   Cold access (first load): {cold_time:.3f}s")
        print(f"   Warm access (cached): {warm_time:.3f}s")
        if cold_time > 0:
            speedup = cold_time / warm_time if warm_time > 0 else float('inf')
            print(f"   Speedup: {speedup:.1f}x faster")
        
        return True
        
    except Exception as e:
        print(f"❌ Performance test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Starting OCR Preload System Tests")
    print("=" * 50)
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Preload Manager", test_preload_manager),
        ("Cache Statistics", test_cache_stats),
        ("API Endpoints", test_api_endpoints),
        ("Batch Preload", test_batch_preload),
        ("Performance", test_performance),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results[test_name] = False
    
    print("\n" + "=" * 50)
    print("📋 Test Results Summary:")
    
    passed = 0
    total = len(tests)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The preload system is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)