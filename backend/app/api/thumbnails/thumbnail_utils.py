from PIL import Image, ImageDraw, ImageFont
import io
import logging
from pathlib import Path
import fitz  # PyMuPDF for PDF handling

logger = logging.getLogger(__name__)

def get_sharepoint_drive_id_for_directory(directory_name: str = "1-Ingreso Operativo") -> str:
    """Get the correct SharePoint drive ID for a given directory name."""
    try:
        import sys
        sys.path.append('.')
        from app.api.sharepoint import get_graph_token, graph_get
        import os
        
        # Get SharePoint site info
        token = get_graph_token()
        site_name = os.getenv("SHAREPOINT_SITE_NAME", "AuditoriadeSoportesHC")
        site_domain = os.getenv("SHAREPOINT_SITE", "christusco.sharepoint.com")
        
        # Get site ID
        site_url = f"https://graph.microsoft.com/v1.0/sites/{site_domain}:/sites/{site_name}"
        site = graph_get(site_url, token)
        site_id = site["id"]
        
        # Get drives (document libraries)
        drives_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives"
        drives = graph_get(drives_url, token)
        
        # Look for the drive that contains our directory
        for drive in drives["value"]:
            drive_id = drive["id"]
            drive_name = drive["name"]
            logger.info(f"DIAGNOSTIC: Checking drive: {drive_name} (ID: {drive_id})")
            
            # Check if this drive contains our target directory
            try:
                root_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"
                items = graph_get(root_url, token)
                
                for item in items.get("value", []):
                    if item.get("name") == directory_name and item.get("folder"):
                        logger.info(f"DIAGNOSTIC: Found directory '{directory_name}' in drive '{drive_name}' (ID: {drive_id})")
                        return drive_id
                        
            except Exception as e:
                logger.warning(f"DIAGNOSTIC: Error checking drive {drive_name}: {e}")
                continue
        
        # If not found, return the first available drive as fallback
        if drives["value"]:
            fallback_drive_id = drives["value"][0]["id"]
            logger.warning(f"DIAGNOSTIC: Directory '{directory_name}' not found, using fallback drive: {fallback_drive_id}")
            return fallback_drive_id
            
        logger.error(f"DIAGNOSTIC: No drives found in SharePoint site")
        return None
        
    except Exception as e:
        logger.error(f"DIAGNOSTIC: Error getting SharePoint drive ID: {e}")
        # Return the hardcoded fallback as last resort
        return "b!NfeqXvRLbkGshWqc_JkL-LRNb-4WdXlKoq1xxo4FOUUzLke2ilRwRp-7JWNvUdoq"

def download_pdf_content_from_sharepoint(file_id: str) -> bytes:
    """Download PDF content from SharePoint using the same method as OCR system."""
    try:
        logger.info(f"Starting PDF download for file_id: {file_id}")
        
        # First, get the file metadata from the database to find drive_id and item_id
        # Note: file_id in ocr_results is actually the SharePoint item_id
        # directory_id in ocr_results is actually the SharePoint drive_id
        from .db_utils import get_db_connection
        with get_db_connection() as conn:
            cursor = conn.execute("""
                SELECT directory_id, file_id, pdf_image_path, ocr_image_path
                FROM ocr_results
                WHERE file_id = ?
            """, (file_id,))
            
            result = cursor.fetchone()
            
            if not result:
                logger.error(f"DIAGNOSTIC: No SharePoint metadata found for file_id: {file_id}")
                return None
                
            drive_id, item_id, pdf_image_path, ocr_image_path = result
            logger.info(f"DIAGNOSTIC: Found record - drive_id: {drive_id}, item_id: {item_id}, pdf_image_path: {pdf_image_path is not None}, ocr_image_path: {ocr_image_path is not None}")
            
            if not item_id:
                logger.error(f"DIAGNOSTIC: Missing item_id for file_id: {file_id}")
                return None
                
            # If drive_id is null or "root", get the correct drive ID dynamically
            if not drive_id or drive_id == "root":
                logger.info(f"DIAGNOSTIC: Getting correct drive_id for file_id: {file_id}")
                drive_id = get_sharepoint_drive_id_for_directory("1-Ingreso Operativo")
                if not drive_id:
                    logger.error(f"DIAGNOSTIC: Could not determine correct drive_id for file_id: {file_id}")
                    return None
                logger.info(f"DIAGNOSTIC: Using dynamically determined drive_id: {drive_id} for file_id: {file_id}")
            else:
                logger.info(f"DIAGNOSTIC: Using existing drive_id: {drive_id} for file_id: {file_id}")
        
        # Use direct requests to SharePoint API instead of the FastAPI wrapper
        import sys
        sys.path.append('.')
        from app.api.sharepoint import get_graph_token
        import requests
        
        logger.info(f"DIAGNOSTIC: Downloading PDF content directly from SharePoint for file_id: {file_id} using drive_id: {drive_id}, item_id: {item_id}")
        
        try:
            # Get authentication token
            token = get_graph_token()
            
            # Direct API call to get file content
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/content"
            headers = {"Authorization": f"Bearer {token}"}
            
            logger.info(f"DIAGNOSTIC: Making direct request to: {url}")
            response = requests.get(url, headers=headers, allow_redirects=True)
            logger.info(f"DIAGNOSTIC: Response status: {response.status_code}")
            
            if response.status_code == 200:
                content = response.content
                logger.info(f"DIAGNOSTIC: Downloaded {len(content)} bytes directly from SharePoint for file_id: {file_id}")
                
                # Verify it's actually PDF content
                if content and len(content) > 0:
                    if content.startswith(b'%PDF'):
                        logger.info(f"DIAGNOSTIC: Successfully downloaded PDF content for {file_id}")
                        return content
                    else:
                        logger.warning(f"DIAGNOSTIC: Downloaded content for {file_id} doesn't appear to be a PDF (starts with: {content[:10]})")
                        return content  # Return anyway, might still be usable
                else:
                    logger.warning(f"DIAGNOSTIC: Empty content downloaded for {file_id}")
                    return None
            else:
                logger.error(f"DIAGNOSTIC: SharePoint API returned status {response.status_code} for file_id: {file_id}")
                logger.error(f"DIAGNOSTIC: Response text: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"DIAGNOSTIC: Exception in direct SharePoint download for {file_id}: {e}")
            import traceback
            logger.error(f"DIAGNOSTIC: Traceback: {traceback.format_exc()}")
            return None
            
    except Exception as e:
        logger.error(f"Error downloading PDF content from SharePoint for {file_id}: {e}")
        return None

def create_page_specific_thumbnail_from_pdf(pdf_path: str, page_num: int, size: tuple = (150, 200)) -> bytes:
    """Create thumbnail from a specific page of a PDF file."""
    try:
        if not Path(pdf_path).exists():
            return None
            
        pdf_document = fitz.open(pdf_path)
        
        # Check if page number is valid (convert to 0-based)
        page_index = page_num - 1
        if page_index < 0 or page_index >= len(pdf_document):
            pdf_document.close()
            return None
            
        page = pdf_document[page_index]
        
        # Render page to image
        mat = fitz.Matrix(1.0, 1.0)
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PIL Image
        img_data = pix.tobytes("ppm")
        img = Image.open(io.BytesIO(img_data))
        
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')
        
        # Create thumbnail maintaining aspect ratio
        img.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Save to bytes
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=80, optimize=True)
        
        pdf_document.close()
        return output.getvalue()
        
    except Exception as e:
        logger.error(f"Error creating page-specific PDF thumbnail: {e}")
        return None

def create_page_specific_thumbnail_from_pdf_content(pdf_content: bytes, page_num: int, size: tuple = (150, 200)) -> bytes:
    """Create thumbnail from a specific page of PDF content in memory."""
    try:
        if not pdf_content or len(pdf_content) == 0:
            return None
            
        # Create a temporary file-like object from the PDF content
        import io
        pdf_stream = io.BytesIO(pdf_content)
        pdf_document = fitz.open(stream=pdf_stream, filetype="pdf")
        
        # Check if page number is valid (convert to 0-based)
        page_index = page_num - 1
        if page_index < 0 or page_index >= len(pdf_document):
            pdf_document.close()
            return None
            
        page = pdf_document[page_index]
        
        # Render page to image
        mat = fitz.Matrix(1.0, 1.0)
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PIL Image
        img_data = pix.tobytes("ppm")
        img = Image.open(io.BytesIO(img_data))
        
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')
        
        # Create thumbnail maintaining aspect ratio
        img.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Save to bytes
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=80, optimize=True)
        
        pdf_document.close()
        return output.getvalue()
        
    except Exception as e:
        logger.error(f"Error creating page-specific PDF thumbnail from content: {e}")
        return None

def create_thumbnail_from_existing_page_image(file_id: str, page_num: int, size: tuple = (150, 200)) -> bytes:
    """Create thumbnail from existing page image files stored locally."""
    try:
        from .db_utils import get_db_connection
        with get_db_connection() as conn:
            cursor = conn.execute("""
                SELECT pdf_image_path, ocr_image_path
                FROM ocr_results
                WHERE file_id = ?
            """, (file_id,))
            
            result = cursor.fetchone()
            
            if not result:
                logger.warning(f"No image paths found for file_id: {file_id}")
                return None
                
            pdf_image_path, ocr_image_path = result
            
            # Try to find the specific page image
            for path_field in [pdf_image_path, ocr_image_path]:
                if not path_field:
                    continue
                    
                try:
                    import json
                    paths = json.loads(path_field) if path_field.startswith('[') else [path_field]
                    if not isinstance(paths, list):
                        paths = [paths]
                        
                    # Look for the specific page image
                    target_page_file = None
                    for path in paths:
                        if f"_page{page_num}.png" in path and Path(path).exists():
                            target_page_file = path
                            break
                    
                    if target_page_file:
                        logger.info(f"Found existing page image: {target_page_file}")
                        
                        # Load and resize the existing PNG image
                        img = Image.open(target_page_file)
                        
                        # Convert to RGB if necessary
                        if img.mode in ('RGBA', 'LA', 'P'):
                            img = img.convert('RGB')
                        
                        # Create thumbnail maintaining aspect ratio
                        img.thumbnail(size, Image.Resampling.LANCZOS)
                        
                        # Save to bytes
                        output = io.BytesIO()
                        img.save(output, format='JPEG', quality=80, optimize=True)
                        
                        return output.getvalue()
                        
                except Exception as e:
                    logger.error(f"Error processing path {path_field}: {e}")
                    continue
        
        return None
        
    except Exception as e:
        logger.error(f"Error creating thumbnail from existing page image for {file_id} page {page_num}: {e}")
        return None

def create_page_specific_placeholder_thumbnail(file_id: str, page_num: int, size: tuple = (150, 200)) -> bytes:
    """Create a page-specific placeholder thumbnail with visual differences per page."""
    img = Image.new('RGB', size, color='#f8f9fa')
    draw = ImageDraw.Draw(img)
    
    # Try to use a default font
    try:
        font = ImageFont.truetype("arial.ttf", 10)
        title_font = ImageFont.truetype("arial.ttf", 14)
        page_font = ImageFont.truetype("arial.ttf", 12)
    except:
        font = ImageFont.load_default()
        title_font = ImageFont.load_default()
        page_font = ImageFont.load_default()
    
    # Page-specific colors
    page_colors = {
        1: {'header': '#e3f2fd', 'border': '#1976d2', 'accent': '#2196f3'},
        2: {'header': '#f3e5f5', 'border': '#7b1fa2', 'accent': '#9c27b0'},
        3: {'header': '#e8f5e8', 'border': '#388e3c', 'accent': '#4caf50'},
        4: {'header': '#fff3e0', 'border': '#f57c00', 'accent': '#ff9800'},
        5: {'header': '#fce4ec', 'border': '#c2185b', 'accent': '#e91e63'},
    }
    
    # Get colors for this page (cycle through if page > 5)
    color_key = ((page_num - 1) % 5) + 1
    colors = page_colors[color_key]
    
    # Draw border
    draw.rectangle([2, 2, size[0]-2, size[1]-2], outline=colors['border'], width=1)
    
    # Draw header area
    header_height = 40
    draw.rectangle([8, 8, size[0]-8, header_height], fill=colors['header'], outline=colors['border'], width=1)
    
    # Draw PDF icon and text
    draw.text((size[0]//2, 25), "PDF", fill=colors['border'], font=title_font, anchor="mm")
    
    # Draw page number prominently
    draw.text((size[0]//2, 55), f"Page {page_num}", fill=colors['accent'], font=page_font, anchor="mm")
    
    # Draw file ID (truncated)
    file_text = file_id[:15] + "..." if len(file_id) > 15 else file_id
    draw.text((size[0]//2, 75), file_text, fill='#495057', font=font, anchor="mm")
    
    # Draw content lines with page-specific pattern
    y_start = 90
    line_spacing = 12
    for i in range(6):
        # Create different patterns for different pages
        if page_num % 2 == 1:  # Odd pages - left-aligned lines
            width = size[0] - 30 - (i % 3) * 15
            x_start = 15
        else:  # Even pages - right-aligned lines
            width = size[0] - 30 - ((5-i) % 3) * 15
            x_start = size[0] - width - 15
        
        draw.rectangle([x_start, y_start + i * line_spacing, x_start + width - 15, y_start + i * line_spacing + 2],
                      fill=colors['accent'] if i % 2 == 0 else '#e9ecef')
    
    # Draw footer text
    draw.text((size[0]//2, size[1] - 20), f"Page {page_num} preview", fill='#6c757d', font=font, anchor="mm")
    
    # Save to bytes
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=85, optimize=True)
    return output.getvalue()