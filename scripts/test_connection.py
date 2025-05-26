import os
from dotenv import load_dotenv
import requests
from msal import ConfidentialClientApplication

load_dotenv()

client_id = os.getenv("CLIENT_ID")
client_secret = os.getenv("CLIENT_SECRET")
tenant_id = os.getenv("TENANT_ID")

authority = f"https://login.microsoftonline.com/{tenant_id}"
scope = ["https://graph.microsoft.com/.default"]

app = ConfidentialClientApplication(client_id, authority=authority, client_credential=client_secret)
result = app.acquire_token_for_client(scopes=scope)

if "access_token" in result:
    headers = {
        "Authorization": f"Bearer {result['access_token']}",
        "Accept": "application/json"
    }
    # List all available SharePoint sites
    sites_url = "https://graph.microsoft.com/v1.0/sites?search="
    response = requests.get(sites_url, headers=headers)
    if response.status_code == 200:
        sites = response.json().get("value", [])
        print(f"Found {len(sites)} sites:")
        for site in sites:
            print(f"Name: {site.get('name')}")
            print(f"Web URL: {site.get('webUrl')}")
            print(f"ID: {site.get('id')}")
            print("---")
    else:
        print("Failed to list sites:", response.status_code, response.text)
else:
    print("Failed to get token:", result.get("error_description"))
