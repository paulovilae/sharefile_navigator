from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse, StreamingResponse
import os
import json
import logging
from pathlib import Path
from typing import Optional
import mimetypes
import aiofiles
from PIL import Image
import io

logger = logging.getLogger(__name__)

router = APIRouter()

# Allowed image extensions for security
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'}

def is_safe_path(path: str) -> bool:
    """
    Check if the path is safe to serve (no directory traversal attacks).
    """
    try:
        # Log the path for debugging
        logger.info(f"Checking path safety for: {path}")
        
        # Special case for SharePoint paths
        if path.startswith('root/') or 'sharepoint' in path.lower():
            logger.info(f"SharePoint path detected, allowing: {path}")
            return True
            
        # Resolve the path and check if it's within allowed directories
        resolved_path = Path(path).resolve()
        
        # Check if it has an allowed extension
        if resolved_path.suffix.lower() not in ALLOWED_EXTENSIONS:
            logger.warning(f"File extension not allowed: {resolved_path.suffix}")
            # Special case: allow PDF files for document preview
            if resolved_path.suffix.lower() == '.pdf':
                logger.info(f"PDF file detected, allowing: {path}")
                return True
            return False
            
        # Additional security: ensure it's in a temp directory or known safe location
        path_str = str(resolved_path).lower()
        safe_patterns = [
            'temp',
            'ocr_images',
            'processed',
            'cache',
            'appdata\\local\\temp',  # Windows temp directory
            'users\\paulo\\appdata\\local\\temp',  # Specific user temp
            'root',  # SharePoint root directory
            'sharepoint',  # SharePoint paths
            'thumbnails'  # Thumbnail directory
        ]
        
        # Check if path contains any safe patterns
        is_safe = any(pattern in path_str for pattern in safe_patterns)
        
        # Log for debugging
        if not is_safe:
            logger.warning(f"Path not in safe patterns: {path_str}")
        else:
            logger.info(f"Path is safe: {path_str}")
        
        return is_safe
        
    except Exception as e:
        logger.error(f"Error checking path safety: {e}")
        return False

def get_image_mime_type(file_path: str) -> str:
    """
    Get the MIME type for an image file.
    """
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type and mime_type.startswith('image/'):
        return mime_type
    
    # Default to PNG if we can't determine
    return 'image/png'

async def optimize_image(image_path: str, max_width: int = 1200, quality: int = 85) -> bytes:
    """
    Optimize image for web delivery by resizing and compressing.
    """
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Calculate new dimensions while maintaining aspect ratio
            width, height = img.size
            if width > max_width:
                ratio = max_width / width
                new_height = int(height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
            # Save to bytes
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=quality, optimize=True)
            return output.getvalue()
            
    except Exception as e:
        logger.error(f"Error optimizing image {image_path}: {e}")
        # Return original file if optimization fails
        async with aiofiles.open(image_path, 'rb') as f:
            return await f.read()

@router.get("/serve")
async def serve_image(
    path: str = Query(..., description="Path to the image file"),
    optimize: bool = Query(default=True, description="Whether to optimize the image"),
    max_width: int = Query(default=1200, ge=100, le=2000, description="Maximum width for optimization"),
    quality: int = Query(default=85, ge=10, le=100, description="JPEG quality for optimization")
):
    """
    Serve an image file with optional optimization.
    Includes security checks to prevent directory traversal attacks.
    """
    try:
        # Parse path if it's a JSON array (from database)
        actual_path = path
        if path.startswith('[') and path.endswith(']'):
            try:
                path_list = json.loads(path)
                if isinstance(path_list, list) and len(path_list) > 0:
                    # Try to find an image file in the list
                    for p in path_list:
                        if any(p.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
                            actual_path = p
                            logger.info(f"Found image in JSON array: {actual_path}")
                            break
                    else:
                        # If no image found, use the first item
                        actual_path = path_list[0]
                        logger.info(f"Using first item from JSON array: {actual_path}")
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse JSON path: {path}")
                pass
        
        logger.info(f"Serving image from path: {actual_path}")
        
        # Security check
        if not is_safe_path(actual_path):
            logger.warning(f"Unsafe path requested: {actual_path}")
            raise HTTPException(status_code=403, detail="Access denied: unsafe path")
        
        # Check if file exists
        if not os.path.exists(actual_path):
            logger.warning(f"File not found: {actual_path}")
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Get MIME type
        mime_type = get_image_mime_type(actual_path)
        
        # Serve optimized image if requested
        if optimize and mime_type.startswith('image/'):
            try:
                optimized_data = await optimize_image(actual_path, max_width, quality)
                return Response(
                    content=optimized_data,
                    media_type='image/jpeg',
                    headers={
                        'Cache-Control': 'public, max-age=3600',
                        'Content-Disposition': f'inline; filename="{Path(actual_path).name}"'
                    }
                )
            except Exception as e:
                logger.error(f"Error optimizing image, serving original: {e}")
                # Fall back to serving original file
        
        # Serve original file
        return FileResponse(
            path=actual_path,
            media_type=mime_type,
            headers={
                'Cache-Control': 'public, max-age=3600',
                'Content-Disposition': f'inline; filename="{Path(actual_path).name}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving image {path}: {e}")
        raise HTTPException(status_code=500, detail="Error serving image")

@router.get("/thumbnail")
async def serve_thumbnail(
    path: str = Query(..., description="Path to the image file"),
    size: int = Query(default=200, ge=50, le=500, description="Thumbnail size (square)")
):
    """
    Serve a thumbnail version of an image.
    """
    try:
        # Parse path if it's a JSON array
        actual_path = path
        if path.startswith('[') and path.endswith(']'):
            try:
                path_list = json.loads(path)
                if isinstance(path_list, list) and len(path_list) > 0:
                    actual_path = path_list[0]
            except json.JSONDecodeError:
                pass
        
        # Security check
        if not is_safe_path(actual_path):
            raise HTTPException(status_code=403, detail="Access denied: unsafe path")
        
        # Check if file exists
        if not os.path.exists(actual_path):
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Generate thumbnail
        try:
            with Image.open(actual_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Create square thumbnail
                img.thumbnail((size, size), Image.Resampling.LANCZOS)
                
                # Save to bytes
                output = io.BytesIO()
                img.save(output, format='JPEG', quality=80, optimize=True)
                thumbnail_data = output.getvalue()
                
                return Response(
                    content=thumbnail_data,
                    media_type='image/jpeg',
                    headers={
                        'Cache-Control': 'public, max-age=7200',
                        'Content-Disposition': f'inline; filename="thumb_{Path(actual_path).name}"'
                    }
                )
                
        except Exception as e:
            logger.error(f"Error creating thumbnail for {actual_path}: {e}")
            raise HTTPException(status_code=500, detail="Error creating thumbnail")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving thumbnail {path}: {e}")
        raise HTTPException(status_code=500, detail="Error serving thumbnail")

@router.get("/info")
async def get_image_info(path: str = Query(..., description="Path to the image file")):
    """
    Get information about an image file.
    """
    try:
        # Parse path if it's a JSON array
        actual_path = path
        if path.startswith('[') and path.endswith(']'):
            try:
                path_list = json.loads(path)
                if isinstance(path_list, list) and len(path_list) > 0:
                    actual_path = path_list[0]
            except json.JSONDecodeError:
                pass
        
        # Security check
        if not is_safe_path(actual_path):
            raise HTTPException(status_code=403, detail="Access denied: unsafe path")
        
        # Check if file exists
        if not os.path.exists(actual_path):
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Get file info
        file_stat = os.stat(actual_path)
        
        # Get image dimensions
        try:
            with Image.open(actual_path) as img:
                width, height = img.size
                format_name = img.format
                mode = img.mode
        except Exception as e:
            logger.error(f"Error reading image info: {e}")
            width = height = None
            format_name = mode = None
        
        return {
            "path": actual_path,
            "filename": Path(actual_path).name,
            "size_bytes": file_stat.st_size,
            "size_mb": round(file_stat.st_size / (1024 * 1024), 2),
            "width": width,
            "height": height,
            "format": format_name,
            "mode": mode,
            "mime_type": get_image_mime_type(actual_path),
            "created_at": file_stat.st_ctime,
            "modified_at": file_stat.st_mtime
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting image info {path}: {e}")
        raise HTTPException(status_code=500, detail="Error getting image information")

@router.get("/batch")
async def serve_image_batch(
    paths: str = Query(..., description="Comma-separated list of image paths"),
    format: str = Query(default="json", description="Response format: json or zip")
):
    """
    Serve multiple images in a batch.
    Returns metadata for JSON format or a ZIP file for zip format.
    """
    try:
        path_list = [p.strip() for p in paths.split(',') if p.strip()]
        
        if not path_list:
            raise HTTPException(status_code=400, detail="No paths provided")
        
        if len(path_list) > 50:  # Limit batch size
            raise HTTPException(status_code=400, detail="Too many paths (max 50)")
        
        results = []
        
        for path in path_list:
            try:
                # Parse path if it's a JSON array
                actual_path = path
                if path.startswith('[') and path.endswith(']'):
                    try:
                        path_list_parsed = json.loads(path)
                        if isinstance(path_list_parsed, list) and len(path_list_parsed) > 0:
                            actual_path = path_list_parsed[0]
                    except json.JSONDecodeError:
                        pass
                
                # Security check
                if not is_safe_path(actual_path):
                    results.append({
                        "path": path,
                        "error": "Access denied: unsafe path",
                        "success": False
                    })
                    continue
                
                # Check if file exists
                if not os.path.exists(actual_path):
                    results.append({
                        "path": path,
                        "error": "File not found",
                        "success": False
                    })
                    continue
                
                # Get basic info
                file_stat = os.stat(actual_path)
                
                results.append({
                    "path": path,
                    "actual_path": actual_path,
                    "filename": Path(actual_path).name,
                    "size_bytes": file_stat.st_size,
                    "mime_type": get_image_mime_type(actual_path),
                    "url": f"/api/images/serve?path={path}",
                    "thumbnail_url": f"/api/images/thumbnail?path={path}",
                    "success": True
                })
                
            except Exception as e:
                results.append({
                    "path": path,
                    "error": str(e),
                    "success": False
                })
        
        return {
            "total_requested": len(path_list),
            "successful": len([r for r in results if r.get("success")]),
            "failed": len([r for r in results if not r.get("success")]),
            "results": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch image serving: {e}")
        raise HTTPException(status_code=500, detail="Error processing batch request")

@router.get("/pdf/{file_id}")
async def serve_pdf(file_id: str):
    """
    Serve the original PDF file for a given file_id.
    This assumes PDFs are stored in a predictable location.
    """
    try:
        # Try common PDF storage locations
        possible_paths = [
            f"C:/Users/paulo/AppData/Local/Temp/ocr_images/root/{file_id}/{file_id}.pdf",
            f"C:/Users/paulo/AppData/Local/Temp/ocr_images/root/{file_id}.pdf",
            f"./uploads/{file_id}.pdf",
            f"./pdfs/{file_id}.pdf"
        ]
        
        pdf_path = None
        for path in possible_paths:
            if os.path.exists(path):
                pdf_path = path
                break
        
        if not pdf_path:
            raise HTTPException(status_code=404, detail="PDF file not found")
        
        # Security check
        if not is_safe_path(pdf_path):
            raise HTTPException(status_code=403, detail="Access denied: unsafe path")
        
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'inline; filename="{file_id}.pdf"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving PDF {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Error serving PDF")