#!/usr/bin/env python3
import requests
import json
import sys

def check_server_status():
    """Check the status of the backend server and any running tasks"""
    base_url = "http://localhost:8000"
    
    try:
        # Check if server is responding
        print("Checking server health...")
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✓ Server is responding")
        else:
            print(f"⚠ Server responded with status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"✗ Server is not responding: {e}")
        return
    
    try:
        # Check batch processing jobs
        print("\nChecking batch processing jobs...")
        response = requests.get(f"{base_url}/api/ocr/batch/list", timeout=5)
        if response.status_code == 200:
            jobs = response.json()
            if jobs.get('jobs'):
                print(f"Found {len(jobs['jobs'])} active batch jobs:")
                for batch_id, job_info in jobs['jobs'].items():
                    print(f"  - {batch_id}: {job_info['status']} ({job_info['processed_count']}/{job_info['total_files']} files)")
            else:
                print("✓ No active batch processing jobs")
        else:
            print(f"⚠ Could not check batch jobs: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"✗ Error checking batch jobs: {e}")
    
    try:
        # Check preload status
        print("\nChecking preload system...")
        response = requests.get(f"{base_url}/api/preload/status", timeout=5)
        if response.status_code == 200:
            status = response.json()
            print(f"Preload status: {json.dumps(status, indent=2)}")
        else:
            print(f"⚠ Could not check preload status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"✗ Error checking preload status: {e}")

if __name__ == "__main__":
    check_server_status()