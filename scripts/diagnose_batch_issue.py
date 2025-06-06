#!/usr/bin/env python3
"""
Diagnostic script to check the current batch processing status and identify issues.
"""

import sys
import os
import requests
import json
import time
import sqlite3

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

def check_backend_status():
    """Check if the backend is running"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
            return True
        else:
            print(f"❌ Backend returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend is not accessible: {e}")
        return False

def check_batch_status():
    """Check the current batch processing status"""
    try:
        # Get list of all batches
        response = requests.get("http://localhost:8000/api/ocr/batch/list", timeout=10)
        if response.status_code == 200:
            batches = response.json()
            print(f"📊 Found {len(batches)} active batches:")
            
            for batch in batches:
                batch_id = batch.get('batch_id', 'Unknown')
                status = batch.get('status', 'Unknown')
                processed = batch.get('processed_count', 0)
                total = batch.get('total_files', 0)
                current_file = batch.get('current_file', {})
                
                print(f"\n🔍 Batch: {batch_id}")
                print(f"   Status: {status}")
                print(f"   Progress: {processed}/{total}")
                print(f"   Current file: {current_file.get('name', 'None') if current_file else 'None'}")
                
                # Get detailed status for this batch
                try:
                    detail_response = requests.get(f"http://localhost:8000/api/ocr/batch/status/{batch_id}", timeout=10)
                    if detail_response.status_code == 200:
                        detail = detail_response.json()
                        print(f"   Failed count: {detail.get('failed_count', 0)}")
                        print(f"   Logs count: {len(detail.get('logs', []))}")
                        
                        # Show recent logs
                        logs = detail.get('logs', [])
                        if logs:
                            print("   Recent logs:")
                            for log in logs[-3:]:  # Show last 3 logs
                                print(f"     - {log.get('message', 'No message')}")
                    else:
                        print(f"   ❌ Could not get detailed status: {detail_response.status_code}")
                except Exception as e:
                    print(f"   ❌ Error getting detailed status: {e}")
            
            return batches
        else:
            print(f"❌ Could not get batch list: {response.status_code}")
            return []
    except requests.exceptions.RequestException as e:
        print(f"❌ Error checking batch status: {e}")
        return []

def check_database_status():
    """Check the database for any relevant information"""
    try:
        db_path = os.path.join(os.path.dirname(__file__), '..', 'ocr.db')
        if not os.path.exists(db_path):
            print("❌ Database file not found")
            return
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check recent OCR results
        cursor.execute("""
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                   SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                   MAX(created_at) as latest
            FROM ocr_results 
            WHERE created_at > datetime('now', '-1 hour')
        """)
        
        result = cursor.fetchone()
        if result:
            total, completed, failed, latest = result
            print(f"\n📊 Database status (last hour):")
            print(f"   Total OCR results: {total}")
            print(f"   Completed: {completed}")
            print(f"   Failed: {failed}")
            print(f"   Latest: {latest}")
        
        # Check batch processing jobs
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='batch_processing_jobs'")
        if cursor.fetchone():
            cursor.execute("""
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                       MAX(created_at) as latest
                FROM batch_processing_jobs 
                WHERE created_at > datetime('now', '-1 hour')
            """)
            
            result = cursor.fetchone()
            if result:
                total, processing, completed, latest = result
                print(f"\n📊 Batch jobs (last hour):")
                print(f"   Total: {total}")
                print(f"   Processing: {processing}")
                print(f"   Completed: {completed}")
                print(f"   Latest: {latest}")
        
        conn.close()
        print("✅ Database check completed")
        
    except Exception as e:
        print(f"❌ Database check failed: {e}")

def check_system_resources():
    """Check system resources that might affect processing"""
    try:
        import psutil
        
        # Memory usage
        memory = psutil.virtual_memory()
        print(f"\n💾 System Resources:")
        print(f"   Memory: {memory.percent}% used ({memory.used // (1024**3):.1f}GB / {memory.total // (1024**3):.1f}GB)")
        
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        print(f"   CPU: {cpu_percent}%")
        
        # Disk usage
        disk = psutil.disk_usage('.')
        print(f"   Disk: {disk.percent}% used ({disk.used // (1024**3):.1f}GB / {disk.total // (1024**3):.1f}GB)")
        
    except ImportError:
        print("⚠️  psutil not available, skipping system resource check")
    except Exception as e:
        print(f"❌ System resource check failed: {e}")

def main():
    print("🔍 Diagnosing Batch Processing Issue")
    print("=" * 50)
    
    # Check backend status
    if not check_backend_status():
        print("\n❌ Backend is not running. Please start the backend first.")
        return
    
    # Check batch status
    print("\n" + "=" * 50)
    batches = check_batch_status()
    
    # Check database
    print("\n" + "=" * 50)
    check_database_status()
    
    # Check system resources
    print("\n" + "=" * 50)
    check_system_resources()
    
    # Recommendations
    print("\n" + "=" * 50)
    print("🔧 Recommendations:")
    
    if not batches:
        print("   - No active batches found. The batch may have crashed or been cleared.")
        print("   - Try restarting the batch processing.")
    else:
        for batch in batches:
            if batch.get('status') == 'processing' and batch.get('processed_count', 0) == 0:
                print(f"   - Batch {batch.get('batch_id', 'Unknown')} is stuck at the beginning.")
                print("   - This suggests an issue with file download or initial processing.")
                print("   - Check SharePoint connectivity and file permissions.")
            elif batch.get('status') == 'processing':
                print(f"   - Batch {batch.get('batch_id', 'Unknown')} is processing but may be slow.")
                print("   - Monitor for a few more minutes to see if it progresses.")
    
    print("   - Check backend logs for more detailed error information.")
    print("   - Consider restarting the backend if the issue persists.")

if __name__ == "__main__":
    main()