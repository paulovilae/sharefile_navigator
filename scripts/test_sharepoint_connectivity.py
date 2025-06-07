#!/usr/bin/env python3
"""
Script to test SharePoint connectivity and diagnose network issues.
This script performs various tests to identify the cause of SharePoint connection issues.
"""

import os
import sys
import socket
import requests
import time
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

def test_dns_resolution():
    """Test DNS resolution for Microsoft authentication servers."""
    logger.info("🔍 Testing DNS resolution...")
    
    domains_to_test = [
        "login.microsoftonline.com",
        "graph.microsoft.com",
        "www.google.com",  # Control test
        "8.8.8.8"          # Google DNS
    ]
    
    results = {}
    for domain in domains_to_test:
        try:
            start_time = time.time()
            ip_address = socket.gethostbyname(domain)
            resolution_time = time.time() - start_time
            results[domain] = {
                "success": True,
                "ip_address": ip_address,
                "time": f"{resolution_time:.3f}s"
            }
            logger.info(f"✅ {domain} resolves to {ip_address} ({resolution_time:.3f}s)")
        except socket.gaierror as e:
            results[domain] = {
                "success": False,
                "error": str(e)
            }
            logger.error(f"❌ Failed to resolve {domain}: {e}")
    
    return results

def test_network_connectivity():
    """Test network connectivity to Microsoft services."""
    logger.info("🔍 Testing network connectivity...")
    
    urls_to_test = [
        "https://login.microsoftonline.com",
        "https://graph.microsoft.com",
        "https://www.google.com"  # Control test
    ]
    
    results = {}
    for url in urls_to_test:
        try:
            start_time = time.time()
            response = requests.get(url, timeout=10)
            request_time = time.time() - start_time
            results[url] = {
                "success": response.status_code < 400,
                "status_code": response.status_code,
                "time": f"{request_time:.3f}s"
            }
            logger.info(f"✅ {url} returned status {response.status_code} ({request_time:.3f}s)")
        except requests.exceptions.RequestException as e:
            results[url] = {
                "success": False,
                "error": str(e)
            }
            logger.error(f"❌ Failed to connect to {url}: {e}")
    
    return results

def test_sharepoint_credentials():
    """Test SharePoint credentials and token acquisition."""
    logger.info("🔍 Testing SharePoint credentials...")
    
    # Load environment variables
    load_dotenv()
    
    # Check for required environment variables
    required_vars = ["CLIENT_ID", "CLIENT_SECRET", "TENANT_ID", "SHAREPOINT_SITE", "SHAREPOINT_SITE_NAME"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        return {
            "success": False,
            "missing_vars": missing_vars
        }
    
    # Log the values (masked for security)
    for var in required_vars:
        value = os.getenv(var)
        masked_value = value[:4] + "..." + value[-4:] if value and len(value) > 8 else "[empty]"
        logger.info(f"📋 {var}: {masked_value}")
    
    # Try to get a token
    try:
        from msal import ConfidentialClientApplication
        
        client_id = os.getenv("CLIENT_ID")
        client_secret = os.getenv("CLIENT_SECRET")
        tenant_id = os.getenv("TENANT_ID")
        
        authority = f"https://login.microsoftonline.com/{tenant_id}"
        scope = ["https://graph.microsoft.com/.default"]
        
        app = ConfidentialClientApplication(client_id, authority=authority, client_credential=client_secret)
        result = app.acquire_token_for_client(scopes=scope)
        
        if "access_token" in result:
            token = result["access_token"]
            masked_token = token[:10] + "..." + token[-10:] if token else "[empty]"
            logger.info(f"✅ Successfully acquired token: {masked_token}")
            return {
                "success": True,
                "token_acquired": True
            }
        else:
            error = result.get("error_description", "Unknown error")
            logger.error(f"❌ Failed to get token: {error}")
            return {
                "success": False,
                "error": error
            }
    except Exception as e:
        logger.error(f"❌ Exception during token acquisition: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def test_proxy_settings():
    """Check for proxy settings that might affect connectivity."""
    logger.info("🔍 Checking proxy settings...")
    
    proxy_vars = ["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY"]
    proxy_settings = {}
    
    for var in proxy_vars:
        value = os.getenv(var) or os.getenv(var.lower())
        if value:
            proxy_settings[var] = value
            logger.info(f"📋 {var}: {value}")
    
    if not proxy_settings:
        logger.info("ℹ️ No proxy environment variables detected")
    
    return proxy_settings

def run_all_tests():
    """Run all connectivity tests and return results."""
    logger.info("🚀 Starting SharePoint connectivity tests...")
    
    results = {
        "dns_resolution": test_dns_resolution(),
        "network_connectivity": test_network_connectivity(),
        "proxy_settings": test_proxy_settings(),
        "sharepoint_credentials": test_sharepoint_credentials()
    }
    
    # Analyze results
    dns_success = any(domain["success"] for domain in results["dns_resolution"].values())
    network_success = any(url["success"] for url in results["network_connectivity"].values())
    credentials_success = results["sharepoint_credentials"].get("success", False)
    
    # Print summary
    logger.info("\n" + "=" * 50)
    logger.info("📊 TEST RESULTS SUMMARY")
    logger.info("=" * 50)
    
    logger.info(f"DNS Resolution: {'✅ PASS' if dns_success else '❌ FAIL'}")
    logger.info(f"Network Connectivity: {'✅ PASS' if network_success else '❌ FAIL'}")
    logger.info(f"SharePoint Credentials: {'✅ PASS' if credentials_success else '❌ FAIL'}")
    
    # Provide recommendations
    logger.info("\n" + "=" * 50)
    logger.info("🔧 RECOMMENDATIONS")
    logger.info("=" * 50)
    
    if not dns_success:
        logger.info("❌ DNS resolution is failing. Try the following:")
        logger.info("  1. Check your internet connection")
        logger.info("  2. Verify DNS server settings")
        logger.info("  3. Try using a different DNS server (e.g., 8.8.8.8)")
        logger.info("  4. Check if a VPN is required for your network")
    
    if not network_success and dns_success:
        logger.info("❌ Network connectivity is failing despite DNS working. Try the following:")
        logger.info("  1. Check if a firewall is blocking outbound connections")
        logger.info("  2. Verify proxy settings if your network uses a proxy")
        logger.info("  3. Test if other websites are accessible")
    
    if not credentials_success and network_success:
        logger.info("❌ SharePoint credentials are invalid or missing. Try the following:")
        logger.info("  1. Verify all required environment variables are set")
        logger.info("  2. Check if the credentials have expired or been revoked")
        logger.info("  3. Confirm the tenant ID is correct")
    
    if dns_success and network_success and credentials_success:
        logger.info("✅ All tests passed! If you're still experiencing issues:")
        logger.info("  1. Check for specific SharePoint site permissions")
        logger.info("  2. Verify the SHAREPOINT_SITE and SHAREPOINT_SITE_NAME values")
        logger.info("  3. Look for any rate limiting or throttling by Microsoft")
    
    return results

if __name__ == "__main__":
    run_all_tests()