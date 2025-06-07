from fastapi import APIRouter, HTTPException, Response, File, UploadFile
from pathlib import Path
import json
import logging
from datetime import datetime
import fitz # PyMuPDF for PDF handling

# Import helper functions and db connection
from . import thumbnail_utils
from . import processed_image_utils
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

@router.get("/processed-image/{file_id}")
async def get_processed_image(file_id: str):
    """
    Get a processed image for a specific file ID.
    This endpoint returns the full-resolution processed image, not the thumbnail.
    """
    try:
        logger.info(f"Processed image requested for file_id: {file_id}")
        
        # First try to get the image from the database
        result = processed_image_utils.get_processed_image(file_id)
        
        if result:
            logger.info(f"Found processed image in database for {file_id}")
            image_data, image_format = result
            media_type = f"image/{image_format.lower()}"
            
            return Response(
                content=image_data,
                media_type=media_type,
                headers={
                    'Cache-Control': 'public, max-age=86400',
                    'Content-Disposition': f'inline; filename="image_{file_id}.{image_format.lower()}"',
                    'X-Image-Source': 'database'
                }
            )
        
        logger.info(f"No processed image found in database for {file_id}, attempting to generate")
        
        # If the image doesn't exist in the database, try to generate it on-the-fly
        if "_page_" in file_id:
            # Extract the original file ID and page number from the page ID
            parts = file_id.split("_page_")
            if len(parts) == 2:
                try:
                    page_num = int(parts[1])
                    base_file_id = parts[0]
                    
                    logger.info(f"Generating processed image for {base_file_id} page {page_num}")
                    
                    # Try to generate and store the processed image
                    success = processed_image_utils.store_processed_image_from_pdf(base_file_id, page_num)
                    
                    if success:
                        logger.info(f"Successfully generated processed image for {file_id}")
                        # Try to get the processed image again
                        result = processed_image_utils.get_processed_image(file_id)
                        
                        if result:
                            image_data, image_format = result
                            media_type = f"image/{image_format.lower()}"
                            
                            return Response(
                                content=image_data,
                                media_type=media_type,
                                headers={
                                    'Cache-Control': 'public, max-age=86400',
                                    'Content-Disposition': f'inline; filename="image_{file_id}.{image_format.lower()}"',
                                    'X-Image-Source': 'generated'
                                }
                            )
                    else:
                        logger.error(f"Failed to generate processed image for {file_id}")
                        
                    # If we still don't have an image, try to get the PDF directly
                    logger.info(f"Attempting to get PDF for {base_file_id} to generate image on-the-fly")
                    try:
                        pdf_content = thumbnail_utils.download_pdf_content_from_sharepoint(base_file_id)
                        if pdf_content and len(pdf_content) > 0:
                            logger.info(f"Got PDF content for {base_file_id}, generating image for page {page_num}")
                            
                            # Create a high-resolution image from the PDF page
                            import fitz  # PyMuPDF
                            import io
                            
                            pdf_stream = io.BytesIO(pdf_content)
                            pdf_document = fitz.open(stream=pdf_stream, filetype="pdf")
                            
                            # Check if page number is valid (convert to 0-based)
                            page_index = page_num - 1
                            if page_index < 0 or page_index >= len(pdf_document):
                                pdf_document.close()
                                logger.warning(f"Invalid page number {page_num} for PDF with {len(pdf_document)} pages")
                                raise HTTPException(status_code=404, detail=f"Page {page_num} not found in document")
                                
                            page = pdf_document[page_index]
                            
                            # Render page to high-resolution image (300 DPI)
                            zoom_factor = 300 / 72  # 300 DPI / 72 (default PDF DPI)
                            mat = fitz.Matrix(zoom_factor, zoom_factor)
                            pix = page.get_pixmap(matrix=mat)
                            
                            # Convert to PIL Image
                            img_data = pix.tobytes("ppm")
                            img = Image.open(io.BytesIO(img_data))
                            
                            # Convert to RGB if necessary
                            if img.mode in ('RGBA', 'LA', 'P'):
                                img = img.convert('RGB')
                            
                            # Save to bytes with high quality
                            output = io.BytesIO()
                            img.save(output, format='JPEG', quality=90, optimize=True)
                            image_data = output.getvalue()
                            
                            pdf_document.close()
                            
                            logger.info(f"Successfully generated image on-the-fly for {file_id}")
                            
                            # Store the image for future use
                            processed_image_utils.store_processed_image(
                                file_id,
                                image_data,
                                'JPEG'
                            )
                            
                            return Response(
                                content=image_data,
                                media_type="image/jpeg",
                                headers={
                                    'Cache-Control': 'public, max-age=86400',
                                    'Content-Disposition': f'inline; filename="image_{file_id}.jpeg"',
                                    'X-Image-Source': 'on-the-fly'
                                }
                            )
                    except Exception as pdf_error:
                        logger.error(f"Error generating image from PDF: {pdf_error}")
                        
                except ValueError:
                    logger.error(f"Invalid page number format in {file_id}")
                    raise HTTPException(status_code=400, detail="Invalid page number")
        else:
            # For non-page specific requests
            logger.warning(f"No page information in {file_id}, cannot generate image")
            
        # If we get here, we couldn't find or generate the image
        logger.error(f"Processed image not found and could not be generated for {file_id}")
        raise HTTPException(status_code=404, detail="Processed image not found and could not be generated")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving processed image for {file_id}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error serving processed image: {str(e)}")

@router.post("/store-processed-image/{file_id}")
async def store_processed_image_endpoint(file_id: str, file: UploadFile = File(...)):
    """
    Store a processed image for a specific file ID.
    """
    try:
        image_data = await file.read()
        image_format = file.filename.split('.')[-1].upper()
        
        success = processed_image_utils.store_processed_image(
            file_id,
            image_data,
            image_format
        )
        
        if success:
            return {"message": f"Processed image stored successfully for {file_id}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to store processed image")
    except Exception as e:
        logger.error(f"Error storing processed image for {file_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error storing processed image: {str(e)}")

@router.post("/generate-processed-image/{file_id}")
async def generate_processed_image_endpoint(file_id: str, page_num: int = 1):
    """
    Generate and store a processed image from a PDF for a specific file ID and page.
    """
    try:
        success = processed_image_utils.store_processed_image_from_pdf(file_id, page_num)
        
        if success:
            return {"message": f"Processed image generated and stored successfully for {file_id} page {page_num}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate and store processed image")
    except Exception as e:
        logger.error(f"Error generating processed image for {file_id} page {page_num}: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating processed image: {str(e)}")

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