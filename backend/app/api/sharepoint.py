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

@router.get("/list_files_recursive")
def list_files_recursive(
    libraryId: str = Query(..., description="SharePoint library/drive ID"),
    folderId: str = Query(..., description="Folder ID to search recursively"),
    fileType: str = Query(default="", description="File type filter (e.g., 'pdf')"),
    limit: int = Query(default=0, description="Maximum number of files to return (0 = no limit)"),
    offset: int = Query(default=0, description="Number of files to skip for pagination")
):
    """
    Recursively list all files in a folder and its subfolders.
    Optionally filter by file type and supports pagination.
    """
    try:
        token = get_graph_token()
        
        def get_files_recursively(current_folder_id):
            files = []
            
            # Get items in current folder
            url = f"https://graph.microsoft.com/v1.0/drives/{libraryId}/items/{current_folder_id}/children"
            
            try:
                items = graph_get(url, token)
                
                for item in items.get("value", []):
                    if "file" in item:
                        # It's a file
                        file_info = {
                            "id": item["id"],
                            "name": item["name"],
                            "size": item.get("size"),
                            "created": item.get("createdDateTime"),
                            "modified": item.get("lastModifiedDateTime"),
                            "mimeType": item.get("file", {}).get("mimeType"),
                            "createdBy": item.get("createdBy", {}).get("user"),
                            "lastModifiedBy": item.get("lastModifiedBy", {}).get("user"),
                            "drive_id": libraryId,
                            "driveId": libraryId
                        }
                        
                        # Apply file type filter if specified
                        if fileType:
                            filename = item["name"].lower()
                            if filename.endswith(f'.{fileType.lower()}'):
                                files.append(file_info)
                        else:
                            files.append(file_info)
                            
                    elif "folder" in item:
                        # It's a folder - recurse into it
                        subfolder_files = get_files_recursively(item["id"])
                        files.extend(subfolder_files)
                        
            except Exception as e:
                logger.warning(f"Error processing folder {current_folder_id}: {e}")
                
            return files
        
        # Get all files recursively starting from the specified folder
        all_files = get_files_recursively(folderId)
        
        # Apply pagination if requested
        total_count = len(all_files)
        if limit > 0:
            paginated_files = all_files[offset:offset + limit]
        else:
            paginated_files = all_files[offset:] if offset > 0 else all_files
        
        return JSONResponse({
            "files": paginated_files,
            "total_count": total_count,
            "returned_count": len(paginated_files),
            "offset": offset,
            "limit": limit,
            "has_more": (offset + len(paginated_files)) < total_count,
            "folder_id": folderId,
            "library_id": libraryId,
            "file_type_filter": fileType
        })
        
    except Exception as e:
        logger.error(f"Error in list_files_recursive: {e}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/file_content")
def get_file_content(drive_id: str, item_id: str, parent_id: str = None, preview: bool = False, download: bool = False, _retry: str = None):
    try:
        # Smart caching: don't use cache if this is a retry attempt
        cache_key = None
        cached_result = None
        
        if not _retry:  # Only use cache for initial requests, not retries
            from app.utils.cache_utils import generate_cache_key, sharepoint_files_cache
            cache_key = generate_cache_key("get_file_content", drive_id, item_id, parent_id, preview, download)
            cached_result = sharepoint_files_cache.get(cache_key)
            
            if cached_result:
                logger.info(f"Cache hit for SharePoint file content: {cache_key[:16]}...")
                # Only return cached result if it's not empty
                if hasattr(cached_result, 'body_iterator') or (hasattr(cached_result, 'content') and len(cached_result.content) > 0):
                    return cached_result
                else:
                    # Remove empty cached result
                    logger.warning(f"Removing empty cached result for {cache_key[:16]}...")
                    del sharepoint_files_cache[cache_key]
        
        token = get_graph_token()
        meta_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}"
        meta = graph_get(meta_url, token)
        filename = meta.get("name", "file")
        mime_type = meta.get("file", {}).get("mimeType", "application/octet-stream")
        file_size = meta.get("size", 0)
        
        logger.info(f"File metadata - Name: {filename}, Size: {file_size}, MIME: {mime_type}, Retry: {_retry is not None}")
        
        # Try direct content endpoint first
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/content"
        headers = {"Authorization": f"Bearer {token}"}
        
        logger.info(f"Requesting file content from: {url}")
        resp = requests.get(url, headers=headers, allow_redirects=True)
        logger.info(f"Response status: {resp.status_code}, Content-Length header: {resp.headers.get('Content-Length')}")
        
        resp.raise_for_status()
        content = resp.content
        
        # Log content info for debugging
        logger.info(f"Downloaded file content: {len(content)} bytes for {filename} (expected: {file_size})")
        
        # If content is empty, try alternative download method
        if len(content) == 0:
            logger.warning(f"Empty content received, trying alternative download method for {filename}")
            
            # Try using the @microsoft.graph.downloadUrl property
            try:
                download_url = meta.get("@microsoft.graph.downloadUrl")
                if download_url:
                    logger.info(f"Trying download URL: {download_url}")
                    resp = requests.get(download_url, allow_redirects=True)
                    resp.raise_for_status()
                    content = resp.content
                    logger.info(f"Alternative download successful: {len(content)} bytes")
                else:
                    logger.error(f"No download URL available for {filename}")
            except Exception as alt_error:
                logger.error(f"Alternative download failed: {alt_error}")
        
        # Final check for empty content
        if len(content) == 0:
            logger.error(f"Empty content received for file {filename} (item_id: {item_id}) after all attempts")
            logger.error(f"Response headers: {dict(resp.headers)}")
            raise Exception(f"Empty content received for file {filename}")
        
        if file_size > 0 and len(content) != file_size:
            logger.warning(f"Content size mismatch for {filename}: got {len(content)}, expected {file_size}")
        
        if download:
            disposition = 'attachment'
        else:
            disposition = 'inline' if preview or mime_type.startswith('image/') or mime_type == 'application/pdf' or mime_type.startswith('text/') else 'attachment'
        
        result = StreamingResponse(
            BytesIO(content),
            media_type=mime_type,
            headers={
                "Content-Disposition": f'{disposition}; filename="{filename}"'
            }
        )
        
        # Only cache successful results (non-empty content) and only for initial requests
        if cache_key and not _retry and len(content) > 0:
            from app.utils.cache_utils import sharepoint_files_cache
            sharepoint_files_cache[cache_key] = result
            logger.info(f"Cached successful SharePoint file result: {cache_key[:16]}...")
        
        return result
        
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

@router.get("/folder_stats")
def get_folder_stats(drive_id: str, folder_id: str = None):
    """
    Recursively calculate statistics for a folder including:
    - Total number of files
    - Total number of folders
    - Total size in bytes
    - Number of PDF files
    """
    try:
        token = get_graph_token()
        
        def calculate_folder_stats(current_folder_id=None):
            stats = {
                "total_files": 0,
                "total_folders": 0,
                "total_size": 0,
                "pdf_files": 0,
                "other_files": 0
            }
            
            # Get items in current folder
            if current_folder_id:
                url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{current_folder_id}/children"
            else:
                url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"
            
            try:
                items = graph_get(url, token)
                
                for item in items.get("value", []):
                    if "folder" in item:
                        # It's a folder - recurse into it
                        stats["total_folders"] += 1
                        subfolder_stats = calculate_folder_stats(item["id"])
                        
                        # Add subfolder stats to current stats
                        stats["total_files"] += subfolder_stats["total_files"]
                        stats["total_folders"] += subfolder_stats["total_folders"]
                        stats["total_size"] += subfolder_stats["total_size"]
                        stats["pdf_files"] += subfolder_stats["pdf_files"]
                        stats["other_files"] += subfolder_stats["other_files"]
                        
                    elif "file" in item:
                        # It's a file
                        stats["total_files"] += 1
                        stats["total_size"] += item.get("size", 0)
                        
                        # Check if it's a PDF
                        filename = item.get("name", "").lower()
                        if filename.endswith('.pdf'):
                            stats["pdf_files"] += 1
                        else:
                            stats["other_files"] += 1
                            
            except Exception as e:
                logger.warning(f"Error processing folder {current_folder_id}: {e}")
                
            return stats
        
        # Calculate stats starting from the specified folder
        result = calculate_folder_stats(folder_id)
        
        # Add formatted size for display
        result["formatted_size"] = format_file_size(result["total_size"])
        
        return JSONResponse(result)
        
    except Exception as e:
        logger.error(f"Error in get_folder_stats: {e}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

def format_file_size(size_bytes):
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    import math
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_names[i]}"