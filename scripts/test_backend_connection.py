#!/usr/bin/env python3
"""
Test script to verify backend server is running and accessible.
"""

import requests
import time

def test_backend_connection():
    """Test if the backend server is running"""
    backend_url = "http://localhost:8000"
    
    print("🔍 Testing backend server connection...")
    print(f"Backend URL: {backend_url}")
    
    try:
        # Test basic connection
        response = requests.get(f"{backend_url}/api/ocr/test", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running and accessible")
            return True
        else:
            print(f"⚠️  Backend server responded with status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend server is not running or not accessible")
        print("   Please start it with: cd backend && uvicorn app.main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"❌ Error connecting to backend: {str(e)}")
        return False

def test_ocr_status_endpoint():
    """Test the OCR status endpoint with our known file IDs"""
    backend_url = "http://localhost:8000"
    
    print("\n🧪 Testing OCR status endpoint...")
    
    # Test with the file IDs we created in the database
    test_file_ids = [
        "01YZ3KRSG3AI3YMNEGFJH3JMGAOMAU6CNU",  # Should return ocr_processed
        "01YZ3KRSF7KLMNBBPHGRBJ4IDUK5H2KYBS",  # Should return text_extracted
        "01YZ3KRSFQKHPW4RFWRNA3BAVIXKBLLIT2"   # Should return text_extracted
    ]
    
    for file_id in test_file_ids:
        try:
            url = f"{backend_url}/api/ocr/status/{file_id}"
            print(f"📡 Testing: {url}")
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {file_id}: {data.get('status', 'unknown')}")
            elif response.status_code == 404:
                print(f"❌ {file_id}: Not found (404)")
            else:
                print(f"⚠️  {file_id}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"❌ {file_id}: Error - {str(e)}")

def test_frontend_proxy():
    """Test if the frontend proxy is working"""
    frontend_url = "http://localhost:5173"
    
    print("\n🌐 Testing frontend proxy...")
    
    try:
        # Test if frontend is running
        response = requests.get(frontend_url, timeout=5)
        if response.status_code == 200:
            print("✅ Frontend server is running")
            
            # Test proxy to backend
            proxy_url = f"{frontend_url}/api/ocr/test"
            print(f"📡 Testing proxy: {proxy_url}")
            proxy_response = requests.get(proxy_url, timeout=5)
            
            if proxy_response.status_code == 200:
                print("✅ Frontend proxy to backend is working")
                return True
            else:
                print(f"❌ Frontend proxy failed: HTTP {proxy_response.status_code}")
                return False
        else:
            print(f"⚠️  Frontend server responded with status: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Frontend server is not running")
        print("   Please start it with: cd frontend && npm run dev")
        return False
    except Exception as e:
        print(f"❌ Error testing frontend: {str(e)}")
        return False

def main():
    print("🔧 Backend Connection Test")
    print("=" * 50)
    
    # Test backend directly
    backend_ok = test_backend_connection()
    
    if backend_ok:
        # Test OCR endpoints
        test_ocr_status_endpoint()
        
        # Test frontend proxy
        frontend_ok = test_frontend_proxy()
        
        if frontend_ok:
            print("\n🎉 All tests passed!")
            print("\n📝 Next steps:")
            print("1. Refresh your browser page (Ctrl+F5)")
            print("2. Check the browser console for status updates")
            print("3. The status should now show correctly")
        else:
            print("\n⚠️  Frontend proxy issue detected")
            print("   Try restarting the frontend server:")
            print("   cd frontend && npm run dev")
    else:
        print("\n❌ Backend server is not running")
        print("\n📝 To start the backend:")
        print("1. Open a new terminal")
        print("2. cd backend")
        print("3. uvicorn app.main:app --reload --port 8000")
        print("4. Wait for 'Application startup complete'")
        print("5. Run this test script again")

if __name__ == "__main__":
    main()