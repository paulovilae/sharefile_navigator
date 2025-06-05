from fastapi import APIRouter, HTTPException, Response
from pathlib import Path
import json
import logging
from datetime import datetime
import fitz # PyMuPDF for PDF handling

# Import helper functions and db connection
from . import thumbnail_utils
from .db_utils import get_db_connection # Use local db_utils
from improved_thumbnail_system import ThumbnailManager # Fixed import path

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/thumbnail/{file_id}")
async def get_thumbnail_v2(file_id: str):
    """
    Get thumbnail for a specific file ID from the new thumbnails table.
    Supports both document thumbnails and page-specific thumbnails.
    """
    try:
        # Check if this is a page-specific request (format: file_id_page_N)
        if "_page_" in file_id:
            # Extract the original file ID and page number from the page ID
            parts = file_id.split("_page_")
            if len(parts) == 2:
                try:
                    page_num = int(parts[1])  # Keep 1-based for page display
                    base_file_id = parts[0]
                    # First, try to find a page-specific thumbnail
                    with get_db_connection() as conn:
                        cursor = conn.execute("""
                            SELECT thumbnail_data, thumbnail_format, source_type
                            FROM thumbnails
                            WHERE file_id = ?
                        """, (file_id,))
                        
                        result = cursor.fetchone()
                        
                        if result:
                            thumbnail_data, thumbnail_format, source_type = result
                            media_type = f"image/{thumbnail_format.lower()}"
                            
                            return Response(
                                content=thumbnail_data,
                                media_type=media_type,
                                headers={
                                    'Cache-Control': 'public, max-age=86400',
                                    'Content-Disposition': f'inline; filename="thumbnail_{file_id}.{thumbnail_format.lower()}"',
                                    'X-Thumbnail-Source': f'{source_type}-page-{page_num}'
                                }
                            )
                        
                        # If no page-specific thumbnail found, try to generate one on-the-fly
                        thumbnail_data = None
                        source_type = 'page-placeholder'
                        
                        try:
                            logger.info(f"Attempting to download PDF from SharePoint for {base_file_id}")
                            pdf_content = thumbnail_utils.download_pdf_content_from_sharepoint(base_file_id)
                            logger.info(f"download_pdf_content_from_sharepoint returned: {pdf_content is not None}")

                            if pdf_content and len(pdf_content) > 0:
                                thumbnail_data = thumbnail_utils.create_page_specific_thumbnail_from_pdf_content(pdf_content, page_num)
                                if thumbnail_data:
                                    source_type = f'pdf-page-{page_num}'
                                    logger.info(f"Generated real page thumbnail from SharePoint PDF for {base_file_id} page {page_num}")
                                    
                                    # Store the generated thumbnail in the database
                                    try:
                                        file_size = len(thumbnail_data)
                                        conn.execute("""
                                            INSERT OR REPLACE INTO thumbnails
                                            (file_id, thumbnail_data, thumbnail_format, width, height, file_size, source_type, updated_at)
                                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                        """, (file_id, thumbnail_data, 'JPEG', 150, 200, file_size, source_type, datetime.now()))
                                        conn.commit()
                                        logger.info(f"Stored real page thumbnail for {file_id}")
                                    except Exception as e:
                                        logger.error(f"Error storing real page thumbnail: {e}")
                                        
                                    return Response(
                                        content=thumbnail_data, media_type="image/jpeg",
                                        headers={
                                            'Cache-Control': 'public, max-age=86400',
                                            'Content-Disposition': f'inline; filename="thumbnail_{file_id}.jpg"',
                                            'X-Thumbnail-Source': source_type
                                        }
                                    )
                                else:
                                    logger.warning(f"Failed to generate thumbnail from PDF content for {base_file_id} page {page_num}")
                            else:
                                logger.warning(f"No PDF content available from SharePoint for {base_file_id}")
                                
                        except Exception as e:
                            logger.error(f"Error downloading PDF from SharePoint for {base_file_id}: {e}")
                        
                        if not thumbnail_data:
                            logger.info(f"Trying to create thumbnail from existing page image for {base_file_id} page {page_num}")
                            thumbnail_data = thumbnail_utils.create_thumbnail_from_existing_page_image(base_file_id, page_num)
                            if thumbnail_data:
                                source_type = f'existing-page-{page_num}'
                                logger.info(f"Generated thumbnail from existing page image for {base_file_id} page {page_num}")
                                
                                # Store the generated thumbnail in the database
                                try:
                                    file_size = len(thumbnail_data)
                                    conn.execute("""
                                        INSERT OR REPLACE INTO thumbnails
                                        (file_id, thumbnail_data, thumbnail_format, width, height, file_size, source_type, updated_at)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                    """, (file_id, thumbnail_data, 'JPEG', 150, 200, file_size, source_type, datetime.now()))
                                    conn.commit()
                                    logger.info(f"Stored existing page thumbnail for {file_id}")
                                except Exception as e:
                                    logger.error(f"Error storing existing page thumbnail: {e}")
                                    
                                return Response(
                                    content=thumbnail_data, media_type="image/jpeg",
                                    headers={
                                        'Cache-Control': 'public, max-age=86400',
                                        'Content-Disposition': f'inline; filename="thumbnail_{file_id}.jpg"',
                                        'X-Thumbnail-Source': source_type
                                    }
                                )
                            else:
                                logger.info(f"No existing page image found for {base_file_id} page {page_num}")
                        
                        if not thumbnail_data:
                            cursor = conn.execute("""
                                SELECT pdf_image_path, ocr_image_path
                                FROM ocr_results
                                WHERE file_id = ?
                            """, (base_file_id,))
                            doc_result = cursor.fetchone()
                            if doc_result:
                                pdf_image_path, ocr_image_path = doc_result
                                for path_field in [pdf_image_path, ocr_image_path]:
                                    if not path_field:
                                        continue
                                    try:
                                        paths = json.loads(path_field) if path_field.startswith('[') else [path_field]
                                        if not isinstance(paths, list): paths = [paths]
                                        for path_str in paths:
                                            if Path(path_str).exists() and path_str.lower().endswith('.pdf'):
                                                thumbnail_data = thumbnail_utils.create_page_specific_thumbnail_from_pdf(path_str, page_num)
                                                source_type = f'pdf-page-{page_num}'
                                                break
                                        if thumbnail_data: break
                                    except Exception as e:
                                        logger.error(f"Error processing path {path_field}: {e}")
                        
                        if not thumbnail_data:
                            thumbnail_data = thumbnail_utils.create_page_specific_placeholder_thumbnail(base_file_id, page_num)
                            source_type = f'page-placeholder-{page_num}'
                            if thumbnail_data:
                                try:
                                    file_size = len(thumbnail_data)
                                    conn.execute("""
                                        INSERT OR REPLACE INTO thumbnails
                                        (file_id, thumbnail_data, thumbnail_format, width, height, file_size, source_type, updated_at)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                    """, (file_id, thumbnail_data, 'JPEG', 150, 200, file_size, source_type, datetime.now()))
                                    conn.commit()
                                except Exception as e:
                                    logger.error(f"Error storing page thumbnail: {e}")
                                
                                return Response(
                                    content=thumbnail_data, media_type="image/jpeg",
                                    headers={
                                        'Cache-Control': 'public, max-age=86400',
                                        'Content-Disposition': f'inline; filename="thumbnail_{file_id}.jpg"',
                                        'X-Thumbnail-Source': source_type
                                    }
                                )
                        
                        raise HTTPException(status_code=404, detail=f"Could not generate thumbnail for page {page_num} of file {base_file_id}")
                        
                except ValueError: # If page_num is not an int
                    pass
        
        # Standard file ID lookup
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT thumbnail_data, thumbnail_format, source_type FROM thumbnails WHERE file_id = ?", (file_id,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Thumbnail not found")
            thumbnail_data, thumbnail_format, source_type = result
            media_type = f"image/{thumbnail_format.lower()}"
            return Response(
                content=thumbnail_data, media_type=media_type,
                headers={
                    'Cache-Control': 'public, max-age=86400',
                    'Content-Disposition': f'inline; filename="thumbnail_{file_id}.{thumbnail_format.lower()}"',
                    'X-Thumbnail-Source': source_type
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"EXCEPTION DEBUG: Error serving thumbnail for {file_id}: {e}")
        logger.error(f"Error serving thumbnail for {file_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error serving thumbnail")

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify the router is working."""
    print("TEST ENDPOINT CALLED!")
    return {"message": "Test endpoint working", "timestamp": datetime.now().isoformat()}

@router.post("/generate-thumbnails")
async def generate_thumbnails_v2_route(): 
    """Generate thumbnails using the improved thumbnail system."""
    try:
        manager = ThumbnailManager()
        updated_count = manager.generate_thumbnails_for_existing_records()
        return {"message": f"Generated thumbnails for {updated_count} records", "updated_count": updated_count}
    except Exception as e:
        logger.error(f"Error generating thumbnails: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating thumbnails: {str(e)}")

@router.get("/stats")
async def get_thumbnail_stats():
    """Get thumbnail statistics."""
    try:
        manager = ThumbnailManager()
        stats = manager.get_thumbnail_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting thumbnail stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting thumbnail stats: {str(e)}")

@router.delete("/cleanup")
async def cleanup_thumbnails():
    """Clean up orphaned thumbnails."""
    try:
        manager = ThumbnailManager()
        deleted_count = manager.cleanup_orphaned_thumbnails()
        return {"message": f"Deleted {deleted_count} orphaned thumbnails", "deleted_count": deleted_count}
    except Exception as e:
        logger.error(f"Error cleaning up thumbnails: {e}")
        raise HTTPException(status_code=500, detail=f"Error cleaning up thumbnails: {str(e)}")

@router.get("/pdf/{file_id}")
async def get_original_pdf(file_id: str):
    """Serve the original PDF file for a specific file ID."""
    try:
        logger.info(f"DEBUG: PDF endpoint called with file_id: {file_id}")
        
        # Extract base file ID if this is a page-specific request
        base_file_id = file_id
        if "_page_" in file_id:
            base_file_id = file_id.split("_page_")[0]
            logger.info(f"DEBUG: Extracted base_file_id: {base_file_id} from page-specific file_id: {file_id}")
        
        # Check if this file_id exists in the database
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM ocr_results WHERE file_id = ?", (base_file_id,))
            count = cursor.fetchone()[0]
            logger.info(f"DEBUG: Found {count} records in ocr_results for base_file_id: {base_file_id}")
            
            if count == 0:
                logger.error(f"DEBUG: No records found for file_id: {base_file_id}. Available file_ids:")
                cursor = conn.execute("SELECT file_id FROM ocr_results LIMIT 10")
                available_ids = [row[0] for row in cursor.fetchall()]
                logger.error(f"DEBUG: Available file_ids: {available_ids}")
        
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT pdf_image_path, ocr_image_path FROM ocr_results WHERE file_id = ?", (base_file_id,))
            result = cursor.fetchone()
            if not result:
                logger.error(f"DEBUG: No record found in ocr_results for file_id: {base_file_id}")
                raise HTTPException(status_code=404, detail="File not found")
            pdf_image_path, ocr_image_path = result
            
            # First, try to find a local PDF file (legacy support)
            pdf_path_str = None
            if pdf_image_path:
                try:
                    paths = json.loads(pdf_image_path)
                    if isinstance(paths, list):
                        for p_str in paths:
                            if p_str.lower().endswith('.pdf') and Path(p_str).exists():
                                pdf_path_str = p_str
                                break
                    elif pdf_image_path.lower().endswith('.pdf') and Path(pdf_image_path).exists():
                        pdf_path_str = pdf_image_path
                except:
                    if pdf_image_path.lower().endswith('.pdf') and Path(pdf_image_path).exists():
                        pdf_path_str = pdf_image_path
            
            if not pdf_path_str and ocr_image_path:
                try:
                    paths = json.loads(ocr_image_path)
                    if isinstance(paths, list):
                        for p_str in paths:
                            if p_str.lower().endswith('.pdf') and Path(p_str).exists():
                                pdf_path_str = p_str
                                break
                    elif ocr_image_path.lower().endswith('.pdf') and Path(ocr_image_path).exists():
                        pdf_path_str = ocr_image_path
                except:
                    if ocr_image_path.lower().endswith('.pdf') and Path(ocr_image_path).exists():
                        pdf_path_str = ocr_image_path

            # If local PDF found, serve it
            if pdf_path_str:
                logger.info(f"Found local PDF file at: {pdf_path_str}")
                try:
                    with open(pdf_path_str, 'rb') as pdf_file:
                        pdf_content = pdf_file.read()
                    logger.info(f"Successfully read local PDF file, size: {len(pdf_content)}")
                    return Response(
                        content=pdf_content,
                        media_type="application/pdf",
                        headers={
                            'Content-Disposition': f'inline; filename="{Path(pdf_path_str).name}"',
                            'Cache-Control': 'public, max-age=3600'
                        }
                    )
                except Exception as e:
                    logger.error(f"Error reading local PDF file: {e}")
                    # Continue to try SharePoint download
            
            # If no local PDF found, try to download from SharePoint
            logger.info(f"No local PDF found, attempting to download from SharePoint for file_id: {base_file_id}")
            try:
                pdf_content = thumbnail_utils.download_pdf_content_from_sharepoint(base_file_id)
                if pdf_content and len(pdf_content) > 0:
                    logger.info(f"Successfully downloaded PDF from SharePoint, size: {len(pdf_content)}")
                    return Response(
                        content=pdf_content,
                        media_type="application/pdf",
                        headers={
                            'Content-Disposition': f'inline; filename="document_{base_file_id}.pdf"',
                            'Cache-Control': 'public, max-age=3600'
                        }
                    )
                else:
                    logger.error(f"Failed to download PDF from SharePoint for file_id: {base_file_id}")
                    raise HTTPException(status_code=404, detail="PDF file not available from SharePoint")
            except Exception as e:
                logger.error(f"Error downloading PDF from SharePoint for file_id {base_file_id}: {e}")
                raise HTTPException(status_code=404, detail="PDF file not found or no longer available")
    except HTTPException: raise
    except Exception as e:
        logger.error(f"Error serving PDF for {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Error serving PDF file")

@router.get("/pdf-info/{file_id}")
async def get_pdf_info_endpoint(file_id: str):
    """Get PDF information for a specific file ID."""
    try:
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT pdf_image_path, ocr_image_path FROM ocr_results WHERE file_id = ?", (file_id,))
            result = cursor.fetchone()
            if not result: raise HTTPException(status_code=404, detail="File not found")
            pdf_image_path, ocr_image_path = result

            pdf_path_str = None
            if pdf_image_path:
                try:
                    paths = json.loads(pdf_image_path)
                    if isinstance(paths, list):
                        for p_str in paths: 
                            if p_str.lower().endswith('.pdf') and Path(p_str).exists(): pdf_path_str = p_str; break
                    elif pdf_image_path.lower().endswith('.pdf') and Path(pdf_image_path).exists(): pdf_path_str = pdf_image_path
                except:
                    if pdf_image_path.lower().endswith('.pdf') and Path(pdf_image_path).exists(): pdf_path_str = pdf_image_path

            if not pdf_path_str and ocr_image_path:
                try:
                    paths = json.loads(ocr_image_path)
                    if isinstance(paths, list):
                        for p_str in paths:
                            if p_str.lower().endswith('.pdf') and Path(p_str).exists(): pdf_path_str = p_str; break
                    elif ocr_image_path.lower().endswith('.pdf') and Path(ocr_image_path).exists(): pdf_path_str = ocr_image_path
                except:
                    if ocr_image_path.lower().endswith('.pdf') and Path(ocr_image_path).exists(): pdf_path_str = ocr_image_path
            
            if not pdf_path_str: return {"available": False, "message": "PDF file not found or no longer available"}
            
            try:
                pdf_document = fitz.open(pdf_path_str)
                pdf_info_data = {
                    "page_count": len(pdf_document), "title": pdf_document.metadata.get("title", ""),
                    "author": pdf_document.metadata.get("author", ""), "subject": pdf_document.metadata.get("subject", ""),
                    "creator": pdf_document.metadata.get("creator", ""), "available": True,
                    "filename": Path(pdf_path_str).name, "file_size": Path(pdf_path_str).stat().st_size
                }
                pdf_document.close()
                return pdf_info_data
            except Exception as e:
                logger.error(f"Error reading PDF info: {e}")
                return {"available": False, "message": "Error reading PDF file"}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"Error getting PDF info for {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Error getting PDF information")