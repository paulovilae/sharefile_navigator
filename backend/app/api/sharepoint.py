import os
from fastapi import APIRouter, Query, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from msal import ConfidentialClientApplication
import requests
from dotenv import load_dotenv
from cachetools import LRUCache
import threading
from io import BytesIO
from datetime import datetime, timezone, timedelta

load_dotenv()

router = APIRouter()

file_cache = LRUCache(maxsize=4096)
file_cache_lock = threading.Lock()

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
def list_folders(drive_id: str, parent_id: str = None):
    cache_key = (drive_id, parent_id or 'root', 'folders')
    # Try to use cache only if all folders are older than 1 day
    with file_cache_lock:
        cached_result = file_cache.get(cache_key)
    if cached_result:
        # Check if all folders are still older than 1 day
        if all(is_older_than_one_day(f.get('modified')) for f in cached_result):
            return JSONResponse(cached_result)
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
        # Only cache if all folders are older than 1 day
        if folders and all(is_older_than_one_day(f.get('modified')) for f in folders):
            with file_cache_lock:
                file_cache[cache_key] = folders
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
def get_file_content(drive_id: str, item_id: str, parent_id: str = None, preview: bool = False, download: bool = False):
    # Always fetch metadata to check modified date
    try:
        token = get_graph_token()
        meta_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}"
        meta = graph_get(meta_url, token)
        filename = meta.get("name", "file")
        mime_type = meta.get("file", {}).get("mimeType", "application/octet-stream")
        modified = meta.get("lastModifiedDateTime")
    except Exception as e:
        return JSONResponse({"error": f"Failed to fetch metadata: {str(e)}"}, status_code=500)
    cache_key = (drive_id, parent_id or 'root', item_id)
    should_cache = is_older_than_one_day(modified)
    content = None
    # Only use cache if file is older than 1 day
    if should_cache:
        with file_cache_lock:
            cached_result = file_cache.get(cache_key)
        if cached_result:
            content, mime_type, filename = cached_result
    if content is None:
        try:
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/content"
            headers = {"Authorization": f"Bearer {token}"}
            resp = requests.get(url, headers=headers, stream=True, allow_redirects=True)
            resp.raise_for_status()
            content = resp.raw.read()
            if should_cache:
                with file_cache_lock:
                    file_cache[cache_key] = (content, mime_type, filename)
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)
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