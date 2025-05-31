import os
from fastapi import APIRouter, Query, Request, Response, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from msal import ConfidentialClientApplication
import requests
from dotenv import load_dotenv
from io import BytesIO
from datetime import datetime, timezone, timedelta
import logging
from app.utils.cache_utils import cache_sharepoint_file, generate_cache_key

load_dotenv()

router = APIRouter()

logger = logging.getLogger(__name__)

def get_graph_token():
    client_id = os.getenv("CLIENT_ID")
    client_secret = os.getenv("CLIENT_SECRET")
    tenant_id = os.getenv("TENANT_ID")
    logger.info(f"SharePoint: CLIENT_ID={client_id}, TENANT_ID={tenant_id}, SHAREPOINT_SITE={os.getenv('SHAREPOINT_SITE')}, SHAREPOINT_SITE_NAME={os.getenv('SHAREPOINT_SITE_NAME')}")
    if not tenant_id:
        raise ValueError("TENANT_ID environment variable not set. Please configure your SharePoint tenant ID.")
    authority = f"https://login.microsoftonline.com/{tenant_id}"
    scope = ["https://graph.microsoft.com/.default"]
    try:
        app = ConfidentialClientApplication(client_id, authority=authority, client_credential=client_secret)
        result = app.acquire_token_for_client(scopes=scope)
        if "access_token" in result:
            return result["access_token"]
        else:
            raise Exception("Failed to get token: " + str(result.get("error_description")))
    except Exception as e:
        raise Exception(f"Failed to get SharePoint token. Check CLIENT_ID, CLIENT_SECRET, and TENANT_ID. Original error: {e}")

def graph_get(url, token):
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json()

def is_older_than_one_day(dt_str):
    if not dt_str:
        return False
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
    except Exception:
        return False
    return (datetime.now(timezone.utc) - dt) > timedelta(days=1)

@router.get("/libraries")
def list_libraries(response: Response):
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
    libraries = [{"id": d["id"], "name": d["name"]} for d in drives["value"]]
    total = len(libraries)
    response.headers["Content-Range"] = f"libraries 0-{max(total-1,0)}/{total}"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range"
    return libraries

@router.get("/folders")
@cache_sharepoint_file
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
                "name": i["name"],
                "modified": i.get("lastModifiedDateTime")
            }
            for i in items.get("value", []) if "folder" in i
        ]
        return JSONResponse(folders)
    except Exception as e:
        logger.error(f"Error in list_folders: {e}", exc_info=True)
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
@cache_sharepoint_file
def get_file_content(drive_id: str, item_id: str, parent_id: str = None, preview: bool = False, download: bool = False):
    try:
        token = get_graph_token()
        meta_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}"
        meta = graph_get(meta_url, token)
        filename = meta.get("name", "file")
        mime_type = meta.get("file", {}).get("mimeType", "application/octet-stream")
        
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/content"
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(url, headers=headers, stream=True, allow_redirects=True)
        resp.raise_for_status()
        content = resp.raw.read()
        
        if download:
            disposition = 'attachment'
        else:
            disposition = 'inline' if preview or mime_type.startswith('image/') or mime_type == 'application/pdf' or mime_type.startswith('text/') else 'attachment'
        
        return StreamingResponse(
            BytesIO(content),
            media_type=mime_type,
            headers={
                "Content-Disposition": f'{disposition}; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.error(f"Error in get_file_content: {e}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

# Content/files endpoints (stubs)
content_router = APIRouter()

@content_router.get('/documents')
def list_documents():
    return []

@content_router.get('/media')
def list_media():
    return []

@content_router.get('/categories')
def list_categories():
    return []

@content_router.get('/tags')
def list_tags():
    return []

@content_router.get('/customfields')
def list_customfields():
    return []