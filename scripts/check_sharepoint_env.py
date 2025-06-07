#!/usr/bin/env python3
"""
Script to check if SharePoint environment variables are properly set.
This script helps diagnose missing or incorrect SharePoint configuration.
"""

import os
import sys
from dotenv import load_dotenv
import colorama
from colorama import Fore, Style

# Initialize colorama for colored terminal output
colorama.init()

def print_header(text):
    """Print a formatted header."""
    print(f"\n{Fore.CYAN}{Style.BRIGHT}" + "=" * 60)
    print(f" {text}")
    print("=" * 60 + f"{Style.RESET_ALL}")

def print_success(text):
    """Print a success message."""
    print(f"{Fore.GREEN}✅ {text}{Style.RESET_ALL}")

def print_error(text):
    """Print an error message."""
    print(f"{Fore.RED}❌ {text}{Style.RESET_ALL}")

def print_warning(text):
    """Print a warning message."""
    print(f"{Fore.YELLOW}⚠️ {text}{Style.RESET_ALL}")

def print_info(text):
    """Print an info message."""
    print(f"{Fore.BLUE}ℹ️ {text}{Style.RESET_ALL}")

def check_env_file():
    """Check if .env file exists in the backend directory."""
    backend_dir = os.path.join(os.path.dirname(__file__), '..', 'backend')
    env_path = os.path.join(backend_dir, '.env')
    template_path = os.path.join(backend_dir, '.env.template')
    
    if os.path.exists(env_path):
        print_success(f".env file found at {env_path}")
        return True
    else:
        print_error(f".env file not found at {env_path}")
        
        if os.path.exists(template_path):
            print_info(f".env.template file found. You can copy it to create your .env file:")
            print(f"\n    {Fore.WHITE}cp {template_path} {env_path}{Style.RESET_ALL}\n")
        else:
            print_info("You need to create a .env file with the required SharePoint configuration.")
        
        return False

def check_env_variables():
    """Check if required environment variables are set."""
    # Load environment variables
    load_dotenv()
    
    required_vars = {
        "CLIENT_ID": "The Azure AD application (client) ID",
        "CLIENT_SECRET": "The Azure AD application client secret",
        "TENANT_ID": "Your Microsoft 365 tenant ID",
        "SHAREPOINT_SITE": "Your SharePoint site domain (e.g., contoso.sharepoint.com)",
        "SHAREPOINT_SITE_NAME": "Your SharePoint site name"
    }
    
    optional_vars = {
        "HTTP_PROXY": "HTTP proxy server (if required)",
        "HTTPS_PROXY": "HTTPS proxy server (if required)",
        "NO_PROXY": "Hosts to exclude from proxy"
    }
    
    missing_required = []
    empty_required = []
    set_required = []
    set_optional = []
    
    # Check required variables
    for var, description in required_vars.items():
        value = os.getenv(var)
        if value is None:
            missing_required.append((var, description))
        elif value.strip() == "":
            empty_required.append((var, description))
        else:
            # Mask the value for security
            masked_value = value[:4] + "..." + value[-4:] if len(value) > 8 else "[too short to mask]"
            set_required.append((var, masked_value, description))
    
    # Check optional variables
    for var, description in optional_vars.items():
        value = os.getenv(var)
        if value is not None and value.strip() != "":
            set_optional.append((var, value, description))
    
    # Print results
    print_header("REQUIRED ENVIRONMENT VARIABLES")
    
    if set_required:
        for var, value, description in set_required:
            print_success(f"{var}: {value} - {description}")
    
    if empty_required:
        for var, description in empty_required:
            print_warning(f"{var} is set but empty - {description}")
    
    if missing_required:
        for var, description in missing_required:
            print_error(f"{var} is not set - {description}")
    
    if set_optional:
        print_header("OPTIONAL ENVIRONMENT VARIABLES")
        for var, value, description in set_optional:
            print_info(f"{var}: {value} - {description}")
    
    return len(missing_required) == 0 and len(empty_required) == 0

def provide_setup_instructions():
    """Provide instructions for setting up SharePoint environment variables."""
    print_header("SETUP INSTRUCTIONS")
    
    print(f"{Fore.WHITE}To set up SharePoint integration, follow these steps:{Style.RESET_ALL}")
    print(f"\n1. {Fore.YELLOW}Create an Azure AD application:{Style.RESET_ALL}")
    print("   - Go to Azure Portal (https://portal.azure.com)")
    print("   - Navigate to Azure Active Directory > App registrations")
    print("   - Click 'New registration'")
    print("   - Name your application and click 'Register'")
    print("   - Copy the 'Application (client) ID' - this is your CLIENT_ID")
    print("   - Copy the 'Directory (tenant) ID' - this is your TENANT_ID")
    
    print(f"\n2. {Fore.YELLOW}Create a client secret:{Style.RESET_ALL}")
    print("   - In your app registration, go to 'Certificates & secrets'")
    print("   - Click 'New client secret'")
    print("   - Add a description and select expiration")
    print("   - Copy the secret value - this is your CLIENT_SECRET")
    
    print(f"\n3. {Fore.YELLOW}Configure API permissions:{Style.RESET_ALL}")
    print("   - In your app registration, go to 'API permissions'")
    print("   - Click 'Add a permission'")
    print("   - Select 'Microsoft Graph' > 'Application permissions'")
    print("   - Add the following permissions:")
    print("     * Sites.Read.All")
    print("     * Files.Read.All")
    print("   - Click 'Grant admin consent'")
    
    print(f"\n4. {Fore.YELLOW}Get your SharePoint site information:{Style.RESET_ALL}")
    print("   - SHAREPOINT_SITE is your SharePoint domain (e.g., contoso.sharepoint.com)")
    print("   - SHAREPOINT_SITE_NAME is the name of your site (e.g., 'sites/YourSiteName')")
    
    print(f"\n5. {Fore.YELLOW}Create or update your .env file:{Style.RESET_ALL}")
    print("   - Copy the .env.template to .env in the backend directory")
    print("   - Fill in the values for all required variables")
    
    print(f"\n6. {Fore.YELLOW}Test your configuration:{Style.RESET_ALL}")
    print("   - Run the SharePoint connectivity test script:")
    print(f"     {Fore.WHITE}python scripts/test_sharepoint_connectivity.py{Style.RESET_ALL}")

def main():
    """Main function to check SharePoint environment configuration."""
    print_header("SHAREPOINT ENVIRONMENT CHECKER")
    
    env_file_exists = check_env_file()
    env_vars_set = check_env_variables()
    
    print_header("SUMMARY")
    
    if env_file_exists and env_vars_set:
        print_success("All required SharePoint environment variables are properly configured.")
        print_info("If you're still experiencing connection issues, run the connectivity test:")
        print(f"\n    {Fore.WHITE}python scripts/test_sharepoint_connectivity.py{Style.RESET_ALL}\n")
    else:
        print_error("SharePoint environment is not properly configured.")
        provide_setup_instructions()

if __name__ == "__main__":
    main()