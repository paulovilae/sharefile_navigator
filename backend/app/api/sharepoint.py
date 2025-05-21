import os
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, StreamingResponse
from msal import ConfidentialClientApplication
import requests
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

def get_graph_token():
    client_id = os.getenv("CLIENT_ID")
    client_secret = os.getenv("CLIENT_SECRET")
    tenant_id = os.getenv("TENANT_ID")
    authority = f"https://login.microsoftonline.com/{tenant_id}"
    scope = ["https://graph.microsoft.com/.default"]
    app = ConfidentialClientApplication(client_id, authority=authority, client_credential=client_secret)
    result = app.acquire_token_for_client(scopes=scope)
    if "access_token" in result:
        return result["access_token"]
    else:
        raise Exception("Failed to get token: " + str(result.get("error_description")))

def graph_get(url, token):
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json()

@router.get("/libraries")
def list_libraries():
    token = get_graph_token()
    site_domain = os.getenv("SHAREPOINT_SITE")
    site_name = os.getenv("SHAREPOINT_SITE_NAME")
    # Get site ID
    site_url = f"https://graph.microsoft.com/v1.0/sites/{site_domain}:/sites/{site_name}"
    site = graph_get(site_url, token)
    site_id = site["id"]
    # Get drives (document libraries)
    drives_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives"
    drives = graph_get(drives_url, token)
    return JSONResponse([{"id": d["id"], "name": d["name"]} for d in drives["value"]])

@router.get("/folders")
def list_folders(drive_id: str, parent_id: str = None):
    try:
        token = get_graph_token()
        if parent_id:
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{parent_id}/children"
        else:
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"
        items = graph_get(url, token)
        # Debug: print the raw response
        print("Graph API response:", items)
        folders = [
            {"id": i["id"], "name": i["name"]}
            for i in items.get("value", []) if "folder" in i
        ]
        return JSONResponse(folders)
    except Exception as e:
        print("Error in list_folders:", str(e))
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/files")
def list_files(drive_id: str, parent_id: str = None):
    token = get_graph_token()
    if parent_id:
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{parent_id}/children"
    else:
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"
    items = graph_get(url, token)
    files = [
        {"id": i["id"], "name": i["name"]}
        for i in items["value"] if "file" in i
    ]
    return JSONResponse(files)

@router.get("/file_content")
def get_file_content(drive_id: str, item_id: str):
    token = get_graph_token()
    url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/content"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, stream=True)
    resp.raise_for_status()
    content_type = resp.headers.get("Content-Type", "application/octet-stream")
    content_disposition = resp.headers.get("Content-Disposition", f'inline; filename="file"')
    return StreamingResponse(resp.raw, media_type=content_type, headers={"Content-Disposition": content_disposition}) 