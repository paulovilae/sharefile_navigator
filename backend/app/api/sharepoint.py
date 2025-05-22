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
        folders = [
            {
                "id": i["id"],
                "name": i["name"]
            }
            for i in items.get("value", []) if "folder" in i
        ]
        return JSONResponse(folders)
    except Exception as e:
        print("Error in list_folders:", str(e))
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/files")
def list_files(
    drive_id: str,
    parent_id: str = None,
    filter_name: str = "",
    filter_created_by: str = "",
    filter_modified_by: str = "",
    sort_field: str = "",
    sort_order: str = "asc"
):
    token = get_graph_token()
    if parent_id:
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{parent_id}/children"
    else:
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"
    items = graph_get(url, token)
    files = [
        {
            "id": i["id"],
            "name": i["name"],
            "size": i.get("size"),
            "created": i.get("createdDateTime"),
            "modified": i.get("lastModifiedDateTime"),
            "mimeType": i.get("file", {}).get("mimeType"),
            "createdBy": i.get("createdBy", {}).get("user"),
            "lastModifiedBy": i.get("lastModifiedBy", {}).get("user")
        }
        for i in items["value"] if "file" in i
    ]
    # Filtering
    if filter_name:
        files = [f for f in files if filter_name.lower() in f["name"].lower()]
    if filter_created_by:
        files = [f for f in files if f["createdBy"] and filter_created_by.lower() in (f["createdBy"].get("displayName", "").lower())]
    if filter_modified_by:
        files = [f for f in files if f["lastModifiedBy"] and filter_modified_by.lower() in (f["lastModifiedBy"].get("displayName", "").lower())]
    # Sorting
    if sort_field:
        reverse = sort_order == "desc"
        files.sort(key=lambda f: (f.get(sort_field) or "").lower() if isinstance(f.get(sort_field), str) else f.get(sort_field), reverse=reverse)
    return JSONResponse(files)

@router.get("/file_content")
def get_file_content(drive_id: str, item_id: str):
    token = get_graph_token()
    # 1. Get file metadata for filename and mime type
    meta_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}"
    meta = graph_get(meta_url, token)
    filename = meta.get("name", "file")
    mime_type = meta.get("file", {}).get("mimeType", "application/octet-stream")
    # 2. Get file content
    url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/content"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, stream=True)
    resp.raise_for_status()
    # 3. Force Content-Disposition to attachment with correct filename
    return StreamingResponse(
        resp.raw,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    ) 